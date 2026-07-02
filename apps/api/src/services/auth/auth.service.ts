import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../../config/db.js';
import { env } from '../../config/env.js';

export type UserRole = 'SUPER_ADMIN' | 'ORG_ADMIN' | 'ANALYST' | 'VIEWER';

export interface AccessTokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  organizationId: string;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    organizationId: string;
  };
}

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

export function validatePasswordComplexity(password: string): boolean {
  return PASSWORD_REGEX.test(password);
}

export function generateAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRY as import('jsonwebtoken').SignOptions['expiresIn'],
    algorithm: 'HS256',
  });
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString('hex');
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;
}

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export async function login(email: string, password: string): Promise<AuthResult> {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.isActive) {
    throw new AuthError('Invalid credentials', 401);
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const remainingMs = user.lockedUntil.getTime() - Date.now();
    const remainingMin = Math.ceil(remainingMs / 60000);
    throw new AuthError(
      `Account locked. Try again in ${remainingMin} minute(s).`,
      423,
    );
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);

  if (!isValid) {
    const newAttempts = user.failedAttempts + 1;
    const updateData: Record<string, unknown> = { failedAttempts: newAttempts };

    if (newAttempts >= MAX_FAILED_ATTEMPTS) {
      updateData['lockedUntil'] = new Date(Date.now() + LOCKOUT_DURATION_MS);
      updateData['failedAttempts'] = 0;
    }

    await prisma.user.update({ where: { id: user.id }, data: updateData });
    throw new AuthError('Invalid credentials', 401);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedAttempts: 0, lockedUntil: null, lastActiveAt: new Date() },
  });

  const accessPayload: AccessTokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role as UserRole,
    organizationId: user.organizationId,
  };

  const accessToken = generateAccessToken(accessPayload);
  const refreshTokenValue = generateRefreshToken();

  await prisma.refreshToken.create({
    data: {
      token: refreshTokenValue,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return {
    accessToken,
    refreshToken: refreshTokenValue,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role as UserRole,
      organizationId: user.organizationId,
    },
  };
}

export async function refreshAccessToken(oldRefreshToken: string): Promise<AuthResult> {
  const stored = await prisma.refreshToken.findUnique({
    where: { token: oldRefreshToken },
    include: { user: true },
  });

  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw new AuthError('Invalid or expired refresh token', 401);
  }

  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  const user = stored.user;
  const accessPayload: AccessTokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role as UserRole,
    organizationId: user.organizationId,
  };

  const accessToken = generateAccessToken(accessPayload);
  const newRefreshToken = generateRefreshToken();

  await prisma.refreshToken.create({
    data: {
      token: newRefreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return {
    accessToken,
    refreshToken: newRefreshToken,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role as UserRole,
      organizationId: user.organizationId,
    },
  };
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  if (!validatePasswordComplexity(newPassword)) {
    throw new AuthError(
      'Password must be 8+ chars with uppercase, lowercase, number, and special character.',
      400,
    );
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AuthError('User not found', 404);

  const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValid) throw new AuthError('Current password is incorrect', 401);

  const newHash = await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS);

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash: newHash } }),
    prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
}

export async function logout(refreshToken: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { token: refreshToken, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}
