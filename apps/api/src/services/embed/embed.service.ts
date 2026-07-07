import jwt, { type SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../../config/db.js';
import { env } from '../../config/env.js';

export interface EmbedTokenPayload {
  type: 'dashboard' | 'chat';
  resourceId: string;
  organizationId: string;
  permissions: string[];
  expiresIn?: SignOptions['expiresIn'];
}

export interface EmbedConfig {
  token: string;
  embedUrl: string;
  branding: {
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    fontFamily?: string;
  };
}

export function generateEmbedToken(payload: EmbedTokenPayload): string {
  return jwt.sign(
    {
      type: payload.type,
      resourceId: payload.resourceId,
      organizationId: payload.organizationId,
      permissions: payload.permissions,
      embed: true,
    },
    env.JWT_SECRET,
    { expiresIn: payload.expiresIn ?? '24h' },
  );
}

export function validateEmbedToken(token: string): EmbedTokenPayload & { embed: boolean } {
  const decoded = jwt.verify(token, env.JWT_SECRET) as EmbedTokenPayload & { embed: boolean };
  if (!decoded.embed) {
    throw new Error('Invalid embed token');
  }
  return decoded;
}

export function generateSignedUrl(
  resourceType: 'dashboard' | 'chat',
  resourceId: string,
  orgId: string,
  ttlSeconds: number = 86400,
): string {
  const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${resourceType}:${resourceId}:${orgId}:${expires}`;
  const signature = crypto.createHmac('sha256', env.JWT_SECRET).update(payload).digest('hex');

  return `/embed/${resourceType}/${resourceId}?expires=${expires}&sig=${signature}`;
}

export async function getEmbedConfig(
  resourceType: 'dashboard' | 'chat',
  resourceId: string,
  orgId: string,
  permissions: string[] = ['view'],
): Promise<EmbedConfig> {
  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: orgId },
    select: {
      logoLight: true,
      logoDark: true,
      primaryColor: true,
      secondaryColor: true,
      fontFamily: true,
    },
  });

  const token = generateEmbedToken({
    type: resourceType,
    resourceId,
    organizationId: orgId,
    permissions,
  });

  return {
    token,
    embedUrl: `/embed/${resourceType}/${resourceId}`,
    branding: {
      logoUrl: org.logoLight ?? undefined,
      primaryColor: org.primaryColor ?? '#6366F1',
      secondaryColor: org.secondaryColor ?? '#8B5CF6',
      fontFamily: org.fontFamily ?? 'Inter, sans-serif',
    },
  };
}
