# Skill File 02 — Authentication & Authorization

## Overview
Implement JWT-based authentication with refresh token rotation, bcrypt password hashing, RBAC middleware, rate-limited login, session auto-logout, and account lockout. This skill secures every API endpoint in the platform.

**BRD References:** REQ-AUTH-001–008, NFR-SEC-001–007

---

## 1. Environment Config Loader — `apps/api/src/config/env.ts`

```typescript
/**
 * env.ts — Zod-validated environment variable loader.
 *
 * Every config value used across the app is validated at startup.
 * NFR-SEC-007: Secrets loaded from env; no hardcoded values.
 */

import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),

  // Database
  DATABASE_URL: z.string().url(),
  DATABASE_URL_READ: z.string().url().optional(),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  BCRYPT_ROUNDS: z.coerce.number().min(12).default(12),

  // AI (Gemini — primary LLM)
  GOOGLE_GENAI_API_KEY: z.string().min(1),
  GEMINI_MODEL: z.string().default('gemini-2.5-flash'),

  // AWS
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().default('us-east-1'),
  S3_BUCKET: z.string().default('ai-analytics-uploads'),

  // Limits
  MAX_FILE_SIZE_MB: z.coerce.number().default(500),
  MAX_ROW_COUNT: z.coerce.number().default(5_000_000),
  QUERY_TIMEOUT_DEFAULT_MS: z.coerce.number().default(30_000),
  QUERY_TIMEOUT_MAX_MS: z.coerce.number().default(300_000),
  RESULT_CACHE_TTL_SECONDS: z.coerce.number().default(3600),
  SCHEMA_CACHE_TTL_SECONDS: z.coerce.number().default(300),

  // Monitoring
  LOG_LEVEL: z.string().default('info'),
  SENTRY_DSN: z.string().optional(),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
```

---

## 2. Auth Service — `apps/api/src/services/auth/auth.service.ts`

```typescript
/**
 * auth.service.ts — Core authentication logic.
 *
 * REQ-AUTH-001: JWT with 15m access + 7d refresh rotation.
 * REQ-AUTH-003: bcrypt cost factor ≥12.
 * REQ-AUTH-004: Password complexity enforcement.
 * REQ-AUTH-007: Rate limiting + account lockout.
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../../config/db.js';
import { env } from '../../config/env.js';
import { UserRole } from '@prisma/client';

// ─── Types ─────────────────────────────────────────────────────────
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

// ─── Password Validation ───────────────────────────────────────────
// REQ-AUTH-004: min 8 chars, uppercase, lowercase, number, special char
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

export function validatePasswordComplexity(password: string): boolean {
  return PASSWORD_REGEX.test(password);
}

// ─── Token Generation ──────────────────────────────────────────────
export function generateAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRY,
    algorithm: 'HS256',
  });
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString('hex');
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;
}

// ─── Login ─────────────────────────────────────────────────────────
// REQ-AUTH-007: Lock after 5 failed attempts for 15 minutes.
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export async function login(email: string, password: string): Promise<AuthResult> {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.isActive) {
    throw new AuthError('Invalid credentials', 401);
  }

  // Check if account is locked
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const remainingMs = user.lockedUntil.getTime() - Date.now();
    const remainingMin = Math.ceil(remainingMs / 60000);
    throw new AuthError(
      `Account locked. Try again in ${remainingMin} minute(s).`,
      423,
    );
  }

  // Verify password
  const isValid = await bcrypt.compare(password, user.passwordHash);

  if (!isValid) {
    const newAttempts = user.failedAttempts + 1;
    const updateData: Record<string, unknown> = { failedAttempts: newAttempts };

    if (newAttempts >= MAX_FAILED_ATTEMPTS) {
      updateData.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
      updateData.failedAttempts = 0;
      // TODO: Trigger brute-force alert (REQ-AUTH-007)
    }

    await prisma.user.update({ where: { id: user.id }, data: updateData });
    throw new AuthError('Invalid credentials', 401);
  }

  // Reset failed attempts on success
  await prisma.user.update({
    where: { id: user.id },
    data: { failedAttempts: 0, lockedUntil: null, lastActiveAt: new Date() },
  });

  // Generate tokens
  const accessPayload: AccessTokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    organizationId: user.organizationId,
  };

  const accessToken = generateAccessToken(accessPayload);
  const refreshTokenValue = generateRefreshToken();

  // Store refresh token (REQ-AUTH-001: 7-day rotation)
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
      role: user.role,
      organizationId: user.organizationId,
    },
  };
}

// ─── Refresh Token Rotation ────────────────────────────────────────
export async function refreshAccessToken(oldRefreshToken: string): Promise<AuthResult> {
  const stored = await prisma.refreshToken.findUnique({
    where: { token: oldRefreshToken },
    include: { user: true },
  });

  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw new AuthError('Invalid or expired refresh token', 401);
  }

  // Revoke old token (rotation)
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  // Issue new pair
  const user = stored.user;
  const accessPayload: AccessTokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
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
      role: user.role,
      organizationId: user.organizationId,
    },
  };
}

// ─── Password Change ───────────────────────────────────────────────
// REQ-AUTH-006: Invalidate sessions on password change.
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
    // Revoke ALL refresh tokens (REQ-AUTH-006)
    prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
}

// ─── Logout ────────────────────────────────────────────────────────
export async function logout(refreshToken: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { token: refreshToken, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

// ─── Auth Error Class ──────────────────────────────────────────────
export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}
```

---

## 3. JWT Auth Middleware — `apps/api/src/middleware/auth.ts`

```typescript
/**
 * auth.ts — JWT verification middleware.
 *
 * REQ-AUTH-001: Validate access tokens on every protected route.
 * REQ-AUTH-005: 30-minute inactivity auto-logout.
 */

import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, type AccessTokenPayload } from '../services/auth/auth.service.js';
import { prisma } from '../config/db.js';

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // REQ-AUTH-005: 30 minutes

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid authorization header' });
      return;
    }

    const token = authHeader.slice(7);
    const payload = verifyAccessToken(token);

    // Check inactivity timeout (REQ-AUTH-005)
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { lastActiveAt: true, isActive: true },
    });

    if (!user || !user.isActive) {
      res.status(401).json({ error: 'Account is deactivated' });
      return;
    }

    if (user.lastActiveAt) {
      const elapsed = Date.now() - user.lastActiveAt.getTime();
      if (elapsed > INACTIVITY_TIMEOUT_MS) {
        res.status(401).json({ error: 'Session expired due to inactivity' });
        return;
      }
    }

    // Update last active timestamp (fire-and-forget)
    void prisma.user.update({
      where: { id: payload.userId },
      data: { lastActiveAt: new Date() },
    });

    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
```

---

## 4. RBAC Middleware — `apps/api/src/middleware/rbac.ts`

```typescript
/**
 * rbac.ts — Role-Based Access Control guard.
 *
 * REQ-AUTH-002: RBAC at API middleware level.
 * REQ-AUTH-008: Super Admin, Org Admin, Analyst, Viewer permissions.
 */

import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';

// ─── Permission Matrix ─────────────────────────────────────────────
const ROLE_HIERARCHY: Record<UserRole, number> = {
  SUPER_ADMIN: 4,
  ORG_ADMIN: 3,
  ANALYST: 2,
  VIEWER: 1,
};

/**
 * Require minimum role level.
 * Usage: router.post('/connections', rbac('ORG_ADMIN'), handler)
 */
export function rbac(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const userRole = req.user.role as UserRole;

    if (!allowedRoles.includes(userRole) && userRole !== 'SUPER_ADMIN') {
      res.status(403).json({
        error: 'Insufficient permissions',
        required: allowedRoles,
        current: userRole,
      });
      return;
    }

    next();
  };
}

/**
 * Require minimum role level (hierarchy-based).
 * Usage: router.get('/admin', requireMinRole('ORG_ADMIN'), handler)
 */
export function requireMinRole(minRole: UserRole) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const userLevel = ROLE_HIERARCHY[req.user.role as UserRole] ?? 0;
    const requiredLevel = ROLE_HIERARCHY[minRole];

    if (userLevel < requiredLevel) {
      res.status(403).json({
        error: 'Insufficient permissions',
        requiredMinRole: minRole,
        currentRole: req.user.role,
      });
      return;
    }

    next();
  };
}
```

---

## 5. Rate Limiter Middleware — `apps/api/src/middleware/rateLimiter.ts`

```typescript
/**
 * rateLimiter.ts — Rate limiting for login and API endpoints.
 *
 * REQ-AUTH-007: Rate limiting on login attempts.
 * ARC-API-002: API Gateway rate limiting.
 */

import rateLimit from 'express-rate-limit';

// Login: 10 attempts per 15 minutes per IP
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip ?? 'unknown',
});

// General API: 200 requests per minute per user
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  message: { error: 'Rate limit exceeded. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.userId ?? req.ip ?? 'unknown',
});

// Query execution: 30 per minute per user
export const queryLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Query rate limit exceeded. Please wait.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.userId ?? req.ip ?? 'unknown',
});
```

---

## 6. Auth Routes — `apps/api/src/routes/auth.routes.ts`

```typescript
/**
 * auth.routes.ts — Authentication API endpoints.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { login, refreshAccessToken, logout, changePassword } from '../services/auth/auth.service.js';
import { authMiddleware } from '../middleware/auth.js';
import { loginLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// ─── POST /api/auth/login ──────────────────────────────────────────
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/login', loginLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const result = await login(email, password);

    // Set refresh token in httpOnly cookie (REQ-AUTH-001)
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/api/auth',
    });

    res.json({
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode ?? 500;
    res.status(status).json({ error: (error as Error).message });
  }
});

// ─── POST /api/auth/refresh ────────────────────────────────────────
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const oldToken = req.cookies?.refreshToken;
    if (!oldToken) {
      res.status(401).json({ error: 'No refresh token provided' });
      return;
    }

    const result = await refreshAccessToken(oldToken);

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/auth',
    });

    res.json({
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (error) {
    res.status(401).json({ error: (error as Error).message });
  }
});

// ─── POST /api/auth/logout ─────────────────────────────────────────
router.post('/logout', async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken;
  if (token) {
    await logout(token);
  }
  res.clearCookie('refreshToken', { path: '/api/auth' });
  res.json({ message: 'Logged out successfully' });
});

// ─── POST /api/auth/change-password ────────────────────────────────
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

router.post('/change-password', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    await changePassword(req.user!.userId, currentPassword, newPassword);
    res.clearCookie('refreshToken', { path: '/api/auth' });
    res.json({ message: 'Password changed. Please login again.' });
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode ?? 500;
    res.status(status).json({ error: (error as Error).message });
  }
});

export { router as authRoutes };
```

---

## 7. Correlation ID Middleware — `apps/api/src/middleware/correlationId.ts`

```typescript
/**
 * correlationId.ts — Attach a unique correlation ID to every request.
 *
 * NFR-MAINT-006: Correlation IDs for distributed tracing.
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export function correlationIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const correlationId =
    (req.headers['x-correlation-id'] as string) ?? crypto.randomUUID();

  req.headers['x-correlation-id'] = correlationId;
  res.setHeader('X-Correlation-Id', correlationId);

  next();
}
```

---

## 8. Verification Checklist

| Step | Command / Action | Expected |
|------|------------------|----------|
| Login works | `POST /api/auth/login` with valid creds | 200 + accessToken + httpOnly cookie |
| Bad password rejects | Login with wrong password | 401 + failedAttempts incremented |
| Account locks | 5 failed attempts | 423 "Account locked" |
| Token refresh | `POST /api/auth/refresh` with cookie | New access + refresh tokens |
| Protected route | `GET /api/conversations` without token | 401 |
| RBAC blocks | Viewer hits admin-only route | 403 |
| Password change | `POST /api/auth/change-password` | 200 + all sessions invalidated |
| Inactivity timeout | Wait 30+ min, then call API | 401 "Session expired" |

---

## Next Skill → `03_database_connectivity_skill.md`
