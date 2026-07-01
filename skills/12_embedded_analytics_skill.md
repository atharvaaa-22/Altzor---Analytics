# Skill File 12 — Embedded Analytics

## Overview
Implement embedded analytics capabilities: embeddable chat interfaces and dashboards via iFrame, a React SDK for host applications, a GraphQL API for programmatic access, and white-labeling support with custom branding inheritance.

**BRD References:** REQ-EMB-001–004, NFR-BRAND-001–003

---

## 1. Embed Token Service — `apps/api/src/services/embed/embed.service.ts`

```typescript
/**
 * embed.service.ts — Embedded analytics token generation and validation.
 *
 * REQ-EMB-002: Secure authentication for embedded contexts (signed URLs, tokens).
 * REQ-EMB-001: Embed chat + dashboards via iFrame, React SDK, GraphQL.
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../../config/db.js';
import { env } from '../../config/env.js';

// ─── Types ─────────────────────────────────────────────────────────
export interface EmbedTokenPayload {
  type: 'dashboard' | 'chat';
  resourceId: string;
  organizationId: string;
  permissions: string[];     // 'view', 'filter', 'export'
  expiresIn?: string;        // e.g. '24h'
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

// ─── Generate Embed Token ──────────────────────────────────────────
export function generateEmbedToken(payload: EmbedTokenPayload): string {
  return jwt.sign(
    {
      type: payload.type,
      resourceId: payload.resourceId,
      organizationId: payload.organizationId,
      permissions: payload.permissions,
      embed: true, // Flag to identify embedded context
    },
    env.JWT_SECRET,
    { expiresIn: payload.expiresIn ?? '24h' },
  );
}

// ─── Validate Embed Token ──────────────────────────────────────────
export function validateEmbedToken(token: string): EmbedTokenPayload & { embed: boolean } {
  const decoded = jwt.verify(token, env.JWT_SECRET) as EmbedTokenPayload & { embed: boolean };
  if (!decoded.embed) {
    throw new Error('Invalid embed token');
  }
  return decoded;
}

// ─── Generate Signed URL ───────────────────────────────────────────
export function generateSignedUrl(
  resourceType: 'dashboard' | 'chat',
  resourceId: string,
  orgId: string,
  ttlSeconds: number = 86400,
): string {
  const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${resourceType}:${resourceId}:${orgId}:${expires}`;
  const signature = crypto
    .createHmac('sha256', env.JWT_SECRET)
    .update(payload)
    .digest('hex');

  return `/embed/${resourceType}/${resourceId}?expires=${expires}&sig=${signature}`;
}

// ─── Get Embed Config ──────────────────────────────────────────────
// REQ-EMB-003: Inherit organization's custom branding.
// NFR-BRAND-003: Embedded components inherit branding.
export async function getEmbedConfig(
  resourceType: 'dashboard' | 'chat',
  resourceId: string,
  orgId: string,
  permissions: string[] = ['view'],
): Promise<EmbedConfig> {
  // Get org branding
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
```

---

## 2. Embed Routes — `apps/api/src/routes/embed.routes.ts`

```typescript
/**
 * embed.routes.ts — Embedded analytics API.
 *
 * REQ-EMB-001: Embed chat interfaces and dashboards.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { rbac } from '../middleware/rbac.js';
import {
  getEmbedConfig, generateSignedUrl, validateEmbedToken,
} from '../services/embed/embed.service.js';
import { prisma } from '../config/db.js';

const router = Router();

// ─── POST /api/embed/generate — Generate embed config (Admin only) ─
router.post(
  '/generate',
  authMiddleware,
  rbac('ORG_ADMIN'),
  async (req: Request, res: Response) => {
    const input = z.object({
      type: z.enum(['dashboard', 'chat']),
      resourceId: z.string(),
      permissions: z.array(z.enum(['view', 'filter', 'export'])).default(['view']),
      expiresIn: z.string().default('24h'),
    }).parse(req.body);

    const config = await getEmbedConfig(
      input.type,
      input.resourceId,
      req.user!.organizationId,
      input.permissions,
    );

    res.json(config);
  },
);

// ─── POST /api/embed/signed-url — Generate signed URL ──────────────
router.post(
  '/signed-url',
  authMiddleware,
  rbac('ORG_ADMIN'),
  async (req: Request, res: Response) => {
    const input = z.object({
      type: z.enum(['dashboard', 'chat']),
      resourceId: z.string(),
      ttlSeconds: z.number().default(86400),
    }).parse(req.body);

    const url = generateSignedUrl(
      input.type,
      input.resourceId,
      req.user!.organizationId,
      input.ttlSeconds,
    );

    res.json({ signedUrl: url });
  },
);

// ─── GET /embed/dashboard/:id — Serve embedded dashboard ───────────
// Public endpoint — validated via embed token
router.get('/dashboard/:id', async (req: Request, res: Response) => {
  const token = req.query.token as string;
  if (!token) {
    res.status(401).json({ error: 'Embed token required' });
    return;
  }

  try {
    const payload = validateEmbedToken(token);

    if (payload.type !== 'dashboard' || payload.resourceId !== req.params.id) {
      res.status(403).json({ error: 'Token does not match resource' });
      return;
    }

    const dashboard = await prisma.dashboard.findUniqueOrThrow({
      where: { id: req.params.id },
      include: {
        widgets: true,
        organization: {
          select: {
            logoLight: true,
            primaryColor: true,
            secondaryColor: true,
            fontFamily: true,
          },
        },
      },
    });

    res.json({
      dashboard,
      permissions: payload.permissions,
      branding: dashboard.organization,
    });
  } catch {
    res.status(401).json({ error: 'Invalid or expired embed token' });
  }
});

// ─── GET /embed/chat/:connectionId — Serve embedded chat ───────────
router.get('/chat/:connectionId', async (req: Request, res: Response) => {
  const token = req.query.token as string;
  if (!token) {
    res.status(401).json({ error: 'Embed token required' });
    return;
  }

  try {
    const payload = validateEmbedToken(token);

    if (payload.type !== 'chat') {
      res.status(403).json({ error: 'Token type mismatch' });
      return;
    }

    const org = await prisma.organization.findUniqueOrThrow({
      where: { id: payload.organizationId },
      select: {
        logoLight: true,
        primaryColor: true,
        secondaryColor: true,
        fontFamily: true,
      },
    });

    res.json({
      connectionId: req.params.connectionId,
      permissions: payload.permissions,
      branding: org,
    });
  } catch {
    res.status(401).json({ error: 'Invalid or expired embed token' });
  }
});

export { router as embedRoutes };
```

---

## 3. React SDK Snippet — `packages/embed-sdk/src/index.ts` (Reference)

```typescript
/**
 * Embed SDK — Drop-in React component for host applications.
 *
 * REQ-EMB-001: React SDK for embedding.
 * REQ-EMB-003: White-labeling (logo, colors, fonts).
 *
 * Usage in host app:
 *   import { AnalyticsDashboard, AnalyticsChat } from '@platform/embed-sdk';
 *
 *   <AnalyticsDashboard
 *     embedToken="eyJ..."
 *     baseUrl="https://analytics.example.com"
 *     theme={{ primaryColor: '#FF5733' }}
 *   />
 */

// ─── Types ─────────────────────────────────────────────────────────
export interface EmbedTheme {
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  logoUrl?: string;
  darkMode?: boolean;
}

export interface EmbedProps {
  embedToken: string;
  baseUrl: string;
  theme?: EmbedTheme;
  width?: string | number;
  height?: string | number;
  onReady?: () => void;
  onError?: (error: Error) => void;
}

// ─── iFrame-based Embed ────────────────────────────────────────────
export function createEmbedIframe(
  containerId: string,
  props: EmbedProps & { type: 'dashboard' | 'chat'; resourceId: string },
): void {
  const container = document.getElementById(containerId);
  if (!container) throw new Error(`Container #${containerId} not found`);

  const params = new URLSearchParams({
    token: props.embedToken,
    ...(props.theme ? { theme: JSON.stringify(props.theme) } : {}),
  });

  const iframe = document.createElement('iframe');
  iframe.src = `${props.baseUrl}/embed/${props.type}/${props.resourceId}?${params}`;
  iframe.style.width = typeof props.width === 'number' ? `${props.width}px` : (props.width ?? '100%');
  iframe.style.height = typeof props.height === 'number' ? `${props.height}px` : (props.height ?? '600px');
  iframe.style.border = 'none';
  iframe.style.borderRadius = '8px';
  iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups');

  iframe.onload = () => props.onReady?.();
  iframe.onerror = () => props.onError?.(new Error('Failed to load embed'));

  container.innerHTML = '';
  container.appendChild(iframe);
}
```

---

## 4. GraphQL API (Schema Reference)

```graphql
# REQ-EMB-004: GraphQL API for programmatic access.

type Query {
  # Query data
  executeQuery(input: QueryInput!): QueryResult!
  
  # Retrieve insights
  getConversation(id: ID!): Conversation!
  getConversations(limit: Int, offset: Int): ConversationList!
  
  # Dashboard data
  getDashboard(id: ID!): Dashboard!
  getDashboardWidget(id: ID!): WidgetData!
  
  # Schema
  getSchemaMetadata(connectionId: ID!): SchemaMetadata!
  
  # Semantic
  getSemanticLayer: SemanticLayer!
}

type Mutation {
  # Manage embedded content
  createConversation(connectionId: ID): Conversation!
  sendMessage(conversationId: ID!, question: String!, connectionId: ID!): Message!
  
  # Dashboard
  createDashboard(input: CreateDashboardInput!): Dashboard!
  addWidget(dashboardId: ID!, input: WidgetInput!): Widget!
}

input QueryInput {
  question: String!
  connectionId: ID!
  conversationId: ID
}

type QueryResult {
  sql: String!
  rows: [JSON!]!
  columns: [ColumnInfo!]!
  rowCount: Int!
  executionTimeMs: Int!
  narrative: NarrativeSummary
  chartType: String
  confidence: Float
}
```

> **Note:** Full GraphQL implementation requires `@apollo/server` or `graphql-yoga` in `apps/api`. Add as a separate route mounted at `/api/graphql`.

---

## 5. White-Labeling Configuration — `apps/api/src/routes/admin.routes.ts` (Excerpt)

```typescript
// ─── PUT /api/admin/branding — Update org branding ─────────────────
// NFR-BRAND-001: Logo, colors, fonts.
// NFR-BRAND-002: Custom domain.
router.put('/branding', rbac('ORG_ADMIN'), async (req: Request, res: Response) => {
  const input = z.object({
    logoLight: z.string().url().optional(),
    logoDark: z.string().url().optional(),
    primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    fontFamily: z.string().max(100).optional(),
    customDomain: z.string().optional(),
  }).parse(req.body);

  const org = await prisma.organization.update({
    where: { id: req.user!.organizationId },
    data: input,
  });

  res.json({ message: 'Branding updated', branding: org });
});
```

---

## 6. Verification Checklist

| Step | Action | Expected |
|------|--------|----------|
| Generate embed token | `POST /api/embed/generate` | Token + embed URL + branding |
| Generate signed URL | `POST /api/embed/signed-url` | Signed URL with expiry |
| Load embedded dashboard | `GET /embed/dashboard/:id?token=...` | Dashboard data with branding |
| Load embedded chat | `GET /embed/chat/:id?token=...` | Chat config with branding |
| Invalid token | Use expired/wrong token | 401 Unauthorized |
| Wrong resource | Token for dash A, access dash B | 403 Forbidden |
| iFrame SDK | `createEmbedIframe()` in host app | Sandboxed iframe renders |
| Branding inherited | Embedded component | Uses org's colors/logo/font |
| Custom domain | Set custom domain | Org accessible at custom domain |
| GraphQL query | `POST /api/graphql` | Query data returned |

---

## Next Skill → `13_express_bootstrap_skill.md`
