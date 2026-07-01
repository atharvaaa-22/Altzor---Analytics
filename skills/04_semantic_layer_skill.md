# Skill File 04 — Semantic Layer Management

## Overview
Implement the admin-defined semantic layer that maps business metrics and dimensions onto database schemas. Metrics are versioned and immutable, providing a consistent vocabulary for the AI to translate natural language into accurate SQL. The semantic layer is injected into every LLM prompt.

**BRD References:** REQ-CQI-006, AI-NLP-004, AI-LEARN-004, Section 3.10 (Semantic Layer)

---

## 1. Semantic Service — `apps/api/src/services/semantic/semantic.service.ts`

```typescript
/**
 * semantic.service.ts — Semantic layer CRUD and prompt formatting.
 *
 * Admin-defined metrics and dimensions provide business context to the LLM.
 * Versioned & immutable: updates create new versions, old versions archived.
 *
 * AI-NLP-004: Semantic metrics/dimensions included in every prompt.
 * AI-LEARN-004: Dynamic adaptation via admin updates.
 */

import { prisma } from '../../config/db.js';
import { redis } from '../../config/redis.js';

const SEMANTIC_CACHE_PREFIX = 'semantic:';
const SEMANTIC_CACHE_TTL = 300; // 5 minutes

// ─── Types ─────────────────────────────────────────────────────────
export interface MetricInput {
  name: string;
  description?: string;
  formula: string;       // SQL expression, e.g. "SUM(order_total)"
  dataType: string;      // number, currency, percentage
  formatPattern?: string; // e.g. "$#,##0.00"
}

export interface DimensionInput {
  name: string;
  description?: string;
  sourceTable: string;
  sourceColumn: string;
  dataType: string;
  synonyms?: string[];   // Alternative names for NLP matching
}

// ─── Metrics CRUD ──────────────────────────────────────────────────
export async function createMetric(
  orgId: string,
  input: MetricInput,
): Promise<{ id: string; version: number }> {
  const metric = await prisma.semanticMetric.create({
    data: {
      name: input.name,
      description: input.description,
      formula: input.formula,
      dataType: input.dataType,
      formatPattern: input.formatPattern,
      version: 1,
      organizationId: orgId,
    },
  });

  await invalidateSemanticCache(orgId);
  return { id: metric.id, version: metric.version };
}

/**
 * Update a metric — creates a new version (immutable pattern).
 * Old version is deactivated.
 */
export async function updateMetric(
  metricId: string,
  orgId: string,
  input: MetricInput,
): Promise<{ id: string; version: number }> {
  const existing = await prisma.semanticMetric.findUniqueOrThrow({
    where: { id: metricId },
  });

  // Deactivate old version
  await prisma.semanticMetric.update({
    where: { id: metricId },
    data: { isActive: false },
  });

  // Create new version
  const newMetric = await prisma.semanticMetric.create({
    data: {
      name: input.name,
      description: input.description,
      formula: input.formula,
      dataType: input.dataType,
      formatPattern: input.formatPattern,
      version: existing.version + 1,
      organizationId: orgId,
    },
  });

  await invalidateSemanticCache(orgId);
  return { id: newMetric.id, version: newMetric.version };
}

export async function deleteMetric(metricId: string, orgId: string): Promise<void> {
  await prisma.semanticMetric.update({
    where: { id: metricId },
    data: { isActive: false },
  });
  await invalidateSemanticCache(orgId);
}

// ─── Dimensions CRUD ───────────────────────────────────────────────
export async function createDimension(
  orgId: string,
  input: DimensionInput,
): Promise<{ id: string; version: number }> {
  const dimension = await prisma.semanticDimension.create({
    data: {
      name: input.name,
      description: input.description,
      sourceTable: input.sourceTable,
      sourceColumn: input.sourceColumn,
      dataType: input.dataType,
      synonyms: input.synonyms ?? [],
      version: 1,
      organizationId: orgId,
    },
  });

  await invalidateSemanticCache(orgId);
  return { id: dimension.id, version: dimension.version };
}

export async function updateDimension(
  dimensionId: string,
  orgId: string,
  input: DimensionInput,
): Promise<{ id: string; version: number }> {
  const existing = await prisma.semanticDimension.findUniqueOrThrow({
    where: { id: dimensionId },
  });

  await prisma.semanticDimension.update({
    where: { id: dimensionId },
    data: { isActive: false },
  });

  const newDim = await prisma.semanticDimension.create({
    data: {
      name: input.name,
      description: input.description,
      sourceTable: input.sourceTable,
      sourceColumn: input.sourceColumn,
      dataType: input.dataType,
      synonyms: input.synonyms ?? [],
      version: existing.version + 1,
      organizationId: orgId,
    },
  });

  await invalidateSemanticCache(orgId);
  return { id: newDim.id, version: newDim.version };
}

// ─── Get Active Semantic Layer ─────────────────────────────────────
export interface SemanticLayer {
  metrics: Array<{
    id: string;
    name: string;
    description: string | null;
    formula: string;
    dataType: string;
    formatPattern: string | null;
    version: number;
  }>;
  dimensions: Array<{
    id: string;
    name: string;
    description: string | null;
    sourceTable: string;
    sourceColumn: string;
    dataType: string;
    synonyms: string[];
    version: number;
  }>;
}

export async function getSemanticLayer(orgId: string): Promise<SemanticLayer> {
  const cacheKey = `${SEMANTIC_CACHE_PREFIX}${orgId}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached) as SemanticLayer;

  const [metrics, dimensions] = await Promise.all([
    prisma.semanticMetric.findMany({
      where: { organizationId: orgId, isActive: true },
      orderBy: { name: 'asc' },
    }),
    prisma.semanticDimension.findMany({
      where: { organizationId: orgId, isActive: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  const layer: SemanticLayer = {
    metrics: metrics.map((m) => ({
      id: m.id,
      name: m.name,
      description: m.description,
      formula: m.formula,
      dataType: m.dataType,
      formatPattern: m.formatPattern,
      version: m.version,
    })),
    dimensions: dimensions.map((d) => ({
      id: d.id,
      name: d.name,
      description: d.description,
      sourceTable: d.sourceTable,
      sourceColumn: d.sourceColumn,
      dataType: d.dataType,
      synonyms: (d.synonyms as string[]) ?? [],
      version: d.version,
    })),
  };

  await redis.setex(cacheKey, SEMANTIC_CACHE_TTL, JSON.stringify(layer));
  return layer;
}

// ─── Format for LLM Prompt ─────────────────────────────────────────
/**
 * Format the semantic layer for inclusion in LLM prompts.
 * AI-NLP-004: Metrics and dimensions injected into every prompt.
 */
export function formatSemanticForPrompt(layer: SemanticLayer): string {
  if (layer.metrics.length === 0 && layer.dimensions.length === 0) {
    return '';
  }

  let prompt = '## Business Semantic Layer\n\n';

  if (layer.metrics.length > 0) {
    prompt += '### Business Metrics\n';
    prompt += 'Use these predefined metrics when the user references these concepts:\n\n';
    for (const m of layer.metrics) {
      prompt += `- **${m.name}**: ${m.description ?? 'No description'}\n`;
      prompt += `  SQL Formula: \`${m.formula}\`\n`;
      prompt += `  Data Type: ${m.dataType}${m.formatPattern ? ` (format: ${m.formatPattern})` : ''}\n\n`;
    }
  }

  if (layer.dimensions.length > 0) {
    prompt += '### Business Dimensions\n';
    prompt += 'Map these business terms to their actual table/column references:\n\n';
    for (const d of layer.dimensions) {
      const synonymStr = d.synonyms.length > 0
        ? ` (also known as: ${d.synonyms.join(', ')})`
        : '';
      prompt += `- **${d.name}**${synonymStr}: ${d.sourceTable}.${d.sourceColumn} (${d.dataType})\n`;
      if (d.description) prompt += `  ${d.description}\n`;
    }
  }

  return prompt;
}

// ─── Cache Invalidation ────────────────────────────────────────────
async function invalidateSemanticCache(orgId: string): Promise<void> {
  await redis.del(`${SEMANTIC_CACHE_PREFIX}${orgId}`);
}
```

---

## 2. Semantic Routes — `apps/api/src/routes/semantic.routes.ts`

```typescript
/**
 * semantic.routes.ts — Semantic layer management API.
 *
 * Only Org Admins can create/update/delete metrics and dimensions.
 * All users can read the semantic layer for their org.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { rbac } from '../middleware/rbac.js';
import {
  createMetric, updateMetric, deleteMetric,
  createDimension, updateDimension,
  getSemanticLayer,
} from '../services/semantic/semantic.service.js';

const router = Router();
router.use(authMiddleware);

// ─── GET /api/semantic — Get semantic layer for org ────────────────
router.get('/', async (req: Request, res: Response) => {
  const layer = await getSemanticLayer(req.user!.organizationId);
  res.json(layer);
});

// ─── Metric Schemas ────────────────────────────────────────────────
const metricSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  formula: z.string().min(1),
  dataType: z.enum(['number', 'currency', 'percentage', 'integer']),
  formatPattern: z.string().optional(),
});

// ─── POST /api/semantic/metrics ────────────────────────────────────
router.post('/metrics', rbac('ORG_ADMIN'), async (req: Request, res: Response) => {
  try {
    const input = metricSchema.parse(req.body);
    const result = await createMetric(req.user!.organizationId, input);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// ─── PUT /api/semantic/metrics/:id ─────────────────────────────────
router.put('/metrics/:id', rbac('ORG_ADMIN'), async (req: Request, res: Response) => {
  try {
    const input = metricSchema.parse(req.body);
    const result = await updateMetric(req.params.id, req.user!.organizationId, input);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// ─── DELETE /api/semantic/metrics/:id ──────────────────────────────
router.delete('/metrics/:id', rbac('ORG_ADMIN'), async (req: Request, res: Response) => {
  await deleteMetric(req.params.id, req.user!.organizationId);
  res.json({ message: 'Metric deactivated' });
});

// ─── Dimension Schemas ─────────────────────────────────────────────
const dimensionSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  sourceTable: z.string().min(1),
  sourceColumn: z.string().min(1),
  dataType: z.string().min(1),
  synonyms: z.array(z.string()).optional(),
});

// ─── POST /api/semantic/dimensions ─────────────────────────────────
router.post('/dimensions', rbac('ORG_ADMIN'), async (req: Request, res: Response) => {
  try {
    const input = dimensionSchema.parse(req.body);
    const result = await createDimension(req.user!.organizationId, input);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// ─── PUT /api/semantic/dimensions/:id ──────────────────────────────
router.put('/dimensions/:id', rbac('ORG_ADMIN'), async (req: Request, res: Response) => {
  try {
    const input = dimensionSchema.parse(req.body);
    const result = await updateDimension(req.params.id, req.user!.organizationId, input);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

export { router as semanticRoutes };
```

---

## 3. Verification Checklist

| Step | Action | Expected |
|------|--------|----------|
| Create metric | `POST /api/semantic/metrics` | 201 + `{ id, version: 1 }` |
| Update metric | `PUT /api/semantic/metrics/:id` | New version created, old deactivated |
| Create dimension | `POST /api/semantic/dimensions` | 201 with synonyms stored |
| Get semantic layer | `GET /api/semantic` | Both active metrics and dimensions |
| Cache works | Call GET twice, check Redis | 2nd call from cache |
| Viewer blocked | Viewer tries POST | 403 Forbidden |
| Prompt format | Call `formatSemanticForPrompt()` | Markdown with metrics + dimensions |

---

## Next Skill → `05_ai_nl2sql_engine_skill.md`
