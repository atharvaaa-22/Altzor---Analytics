# Skill File 10 — Saved Queries & Templates

## Overview
Implement the saved queries system with custom titles, descriptions, tags, search/filter/sort, parameterizable templates, sharing, and execution history tracking.

**BRD References:** REQ-SQT-001–005

---

## 1. Saved Queries Service — `apps/api/src/services/query/savedQueries.service.ts`

```typescript
/**
 * savedQueries.service.ts — Save, tag, template, and share queries.
 *
 * REQ-SQT-001: Save with title, description, tags.
 * REQ-SQT-002: Library with search, filter, sort.
 * REQ-SQT-003: Parameterizable templates (e.g. {{start_date}}).
 * REQ-SQT-004: Share with specific members or broadcast org-wide.
 * REQ-SQT-005: Execution history (last run, row count, duration, cost).
 */

import { prisma } from '../../config/db.js';
import { ChartType } from '@prisma/client';

// ─── Types ─────────────────────────────────────────────────────────
export interface SaveQueryInput {
  title: string;
  description?: string;
  naturalQuery: string;
  generatedSql: string;
  tags?: string[];
  isTemplate?: boolean;
  templateParams?: Record<string, { type: string; label: string; default?: string }>;
  chartType?: ChartType;
  chartConfig?: Record<string, unknown>;
  connectionId?: string;
}

export interface QueryListFilters {
  search?: string;
  tags?: string[];
  creatorId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  isTemplate?: boolean;
  sortBy?: 'title' | 'createdAt' | 'lastRunAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// ─── Save Query (REQ-SQT-001) ──────────────────────────────────────
export async function saveQuery(
  userId: string,
  orgId: string,
  input: SaveQueryInput,
) {
  return prisma.savedQuery.create({
    data: {
      title: input.title,
      description: input.description,
      naturalQuery: input.naturalQuery,
      generatedSql: input.generatedSql,
      tags: input.tags ?? [],
      isTemplate: input.isTemplate ?? false,
      templateParams: input.templateParams,
      chartType: input.chartType,
      chartConfig: input.chartConfig,
      connectionId: input.connectionId,
      userId,
      organizationId: orgId,
    },
  });
}

// ─── Query Library (REQ-SQT-002) ───────────────────────────────────
export async function listSavedQueries(
  orgId: string,
  userId: string,
  filters: QueryListFilters,
) {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;

  const where: Record<string, unknown> = {
    organizationId: orgId,
    OR: [
      { userId },                                    // Own queries
      { isBroadcast: true },                         // Org-wide broadcasts
      { shares: { some: { userId } } },              // Shared with user
    ],
  };

  // Search in title, description, natural query
  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search } },
      { description: { contains: filters.search } },
      { naturalQuery: { contains: filters.search } },
    ];
  }

  // Filter by tags (JSON array contains)
  if (filters.tags && filters.tags.length > 0) {
    // Prisma doesn't support JSON array containment directly for MySQL;
    // filter in application layer after fetch or use raw query
  }

  if (filters.creatorId) {
    where.userId = filters.creatorId;
  }

  if (filters.isTemplate !== undefined) {
    where.isTemplate = filters.isTemplate;
  }

  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {};
    if (filters.dateFrom) (where.createdAt as Record<string, Date>).gte = filters.dateFrom;
    if (filters.dateTo) (where.createdAt as Record<string, Date>).lte = filters.dateTo;
  }

  const orderBy: Record<string, string> = {};
  orderBy[filters.sortBy ?? 'updatedAt'] = filters.sortOrder ?? 'desc';

  const [queries, total] = await Promise.all([
    prisma.savedQuery.findMany({
      where,
      orderBy,
      take: limit,
      skip: (page - 1) * limit,
      include: {
        user: { select: { firstName: true, lastName: true } },
        connection: { select: { name: true, type: true } },
        _count: { select: { shares: true } },
      },
    }),
    prisma.savedQuery.count({ where }),
  ]);

  return { queries, total, page, limit };
}

// ─── Template Execution (REQ-SQT-003) ──────────────────────────────
/**
 * Resolve template parameters in SQL.
 * e.g. "SELECT * FROM orders WHERE date >= '{{start_date}}'"
 *   → "SELECT * FROM orders WHERE date >= '2024-01-01'"
 */
export function resolveTemplateParams(
  sql: string,
  params: Record<string, string>,
): string {
  let resolved = sql;
  for (const [key, value] of Object.entries(params)) {
    // Sanitize to prevent SQL injection via template params
    const sanitizedValue = value.replace(/['";\\]/g, '');
    resolved = resolved.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), sanitizedValue);
  }
  return resolved;
}

// ─── Share Query (REQ-SQT-004) ─────────────────────────────────────
export async function shareQuery(
  queryId: string,
  targetUserId: string,
) {
  return prisma.queryShare.upsert({
    where: {
      savedQueryId_userId: { savedQueryId: queryId, userId: targetUserId },
    },
    update: {},
    create: { savedQueryId: queryId, userId: targetUserId },
  });
}

export async function broadcastQuery(queryId: string) {
  return prisma.savedQuery.update({
    where: { id: queryId },
    data: { isBroadcast: true },
  });
}

// ─── Update Execution History (REQ-SQT-005) ────────────────────────
export async function recordExecution(
  queryId: string,
  rowCount: number,
  durationMs: number,
  cost: number,
) {
  return prisma.savedQuery.update({
    where: { id: queryId },
    data: {
      lastRunAt: new Date(),
      lastRunRowCount: rowCount,
      lastRunDurationMs: durationMs,
      lastRunCost: cost,
    },
  });
}
```

---

## 2. Saved Queries Routes — `apps/api/src/routes/queries.routes.ts`

```typescript
/**
 * queries.routes.ts — Saved queries and templates API.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { ChartType } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.js';
import {
  saveQuery, listSavedQueries, shareQuery,
  broadcastQuery, resolveTemplateParams,
} from '../services/query/savedQueries.service.js';

const router = Router();
router.use(authMiddleware);

// ─── POST /api/queries — Save a query ──────────────────────────────
const saveSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  naturalQuery: z.string().min(1),
  generatedSql: z.string().min(1),
  tags: z.array(z.string()).optional(),
  isTemplate: z.boolean().optional(),
  templateParams: z.record(z.object({
    type: z.string(),
    label: z.string(),
    default: z.string().optional(),
  })).optional(),
  chartType: z.nativeEnum(ChartType).optional(),
  chartConfig: z.record(z.unknown()).optional(),
  connectionId: z.string().optional(),
});

router.post('/', async (req: Request, res: Response) => {
  const input = saveSchema.parse(req.body);
  const query = await saveQuery(req.user!.userId, req.user!.organizationId, input);
  res.status(201).json(query);
});

// ─── GET /api/queries — List with search/filter/sort ───────────────
router.get('/', async (req: Request, res: Response) => {
  const filters = {
    search: req.query.search as string | undefined,
    tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
    creatorId: req.query.creatorId as string | undefined,
    isTemplate: req.query.isTemplate === 'true' ? true : req.query.isTemplate === 'false' ? false : undefined,
    sortBy: (req.query.sortBy as 'title' | 'createdAt' | 'lastRunAt') ?? 'updatedAt',
    sortOrder: (req.query.sortOrder as 'asc' | 'desc') ?? 'desc',
    page: req.query.page ? parseInt(req.query.page as string) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
  };

  const result = await listSavedQueries(
    req.user!.organizationId,
    req.user!.userId,
    filters,
  );
  res.json(result);
});

// ─── POST /api/queries/:id/share ───────────────────────────────────
router.post('/:id/share', async (req: Request, res: Response) => {
  const { userId } = z.object({ userId: z.string() }).parse(req.body);
  await shareQuery(req.params.id, userId);
  res.json({ message: 'Query shared' });
});

// ─── POST /api/queries/:id/broadcast ───────────────────────────────
router.post('/:id/broadcast', async (req: Request, res: Response) => {
  await broadcastQuery(req.params.id);
  res.json({ message: 'Query broadcast to organization' });
});

// ─── POST /api/queries/:id/execute — Execute (with template params)
router.post('/:id/execute', async (req: Request, res: Response) => {
  const { params } = z.object({
    params: z.record(z.string()).optional(),
  }).parse(req.body);

  const query = await import('../../config/db.js').then(m =>
    m.prisma.savedQuery.findUniqueOrThrow({ where: { id: req.params.id } }),
  );

  let sql = query.generatedSql;
  if (query.isTemplate && params) {
    sql = resolveTemplateParams(sql, params);
  }

  // Execute via the query executor
  const { executeQuery } = await import('../services/query/queryExecutor.js');
  const result = await executeQuery(
    sql,
    query.connectionId!,
    req.user!.organizationId,
  );

  // Record execution history (REQ-SQT-005)
  const { recordExecution } = await import('../services/query/savedQueries.service.js');
  await recordExecution(
    req.params.id,
    result.rowCount,
    result.executionTimeMs,
    result.costEstimate,
  );

  res.json({
    results: result.rows,
    columns: result.columns,
    rowCount: result.rowCount,
    executionTimeMs: result.executionTimeMs,
    cached: result.cached,
  });
});

export { router as queryRoutes };
```

---

## 3. Verification Checklist

| Step | Action | Expected |
|------|--------|----------|
| Save query | `POST /api/queries` with tags | 201 + saved with tags |
| List queries | `GET /api/queries?search=revenue` | Filtered results |
| Filter by tag | `GET /api/queries?tags=finance` | Only matching queries |
| Sort by date | `GET /api/queries?sortBy=createdAt&sortOrder=desc` | Latest first |
| Create template | Save with `isTemplate: true` + `{{start_date}}` | Template stored |
| Execute template | `POST /api/queries/:id/execute` with params | Params resolved in SQL |
| Share with user | `POST /api/queries/:id/share` | User can see query |
| Broadcast | `POST /api/queries/:id/broadcast` | Visible to entire org |
| Execution history | Run query multiple times | `lastRunAt`, `lastRunRowCount` updated |

---

## Next Skill → `11_collaboration_skill.md`
