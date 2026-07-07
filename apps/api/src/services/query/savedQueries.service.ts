import { prisma } from '../../config/db.js';
import type { SavedQuery, QueryShare } from '@prisma/client';

export interface SavedQueryWithRelations extends Omit<
  SavedQuery,
  'tags' | 'templateParams' | 'chartConfig'
> {
  tags: string[];
  templateParams: Record<string, unknown> | null;
  chartConfig: Record<string, unknown> | null;
  user: { firstName: string | null; lastName: string | null };
  connection: { name: string; type: string } | null;
  _count: { shares: number };
}

export interface ListSavedQueriesResult {
  queries: SavedQueryWithRelations[];
  total: number;
  page: number;
  limit: number;
}

export interface SaveQueryInput {
  title: string;
  description?: string;
  naturalQuery: string;
  generatedSql: string;
  tags?: string[];
  isTemplate?: boolean;
  templateParams?: Record<string, { type: string; label: string; default?: string }>;
  chartType?: string;
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

export async function saveQuery(
  userId: string,
  orgId: string,
  input: SaveQueryInput,
): Promise<SavedQuery> {
  return prisma.savedQuery.create({
    data: {
      title: input.title,
      description: input.description,
      naturalQuery: input.naturalQuery,
      generatedSql: input.generatedSql,
      tags: input.tags ? JSON.stringify(input.tags) : undefined,
      isTemplate: input.isTemplate ?? false,
      templateParams: input.templateParams ? JSON.stringify(input.templateParams) : undefined,
      chartType: input.chartType,
      chartConfig: input.chartConfig ? JSON.stringify(input.chartConfig) : undefined,
      connectionId: input.connectionId,
      userId,
      organizationId: orgId,
    },
  });
}

export async function listSavedQueries(
  orgId: string,
  userId: string,
  filters: QueryListFilters,
): Promise<ListSavedQueriesResult> {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;

  const where: Record<string, unknown> = {
    organizationId: orgId,
    OR: [{ userId }, { isBroadcast: true }, { shares: { some: { userId } } }],
  };

  if (filters.search) {
    where['AND'] = where['AND'] || [];
    (where['AND'] as Record<string, unknown>[]).push({
      OR: [
        { title: { contains: filters.search } },
        { description: { contains: filters.search } },
        { naturalQuery: { contains: filters.search } },
      ],
    });
  }

  if (filters.tags && filters.tags.length > 0) {
    const tagConditions = filters.tags.map((tag) => ({ tags: { contains: `"${tag}"` } }));
    where['AND'] = where['AND'] || [];
    (where['AND'] as Record<string, unknown>[]).push({ OR: tagConditions });
  }

  if (filters.creatorId) {
    where['userId'] = filters.creatorId;
  }

  if (filters.isTemplate !== undefined) {
    where['isTemplate'] = filters.isTemplate;
  }

  if (filters.dateFrom || filters.dateTo) {
    where['createdAt'] = {};
    if (filters.dateFrom) (where['createdAt'] as Record<string, Date>)['gte'] = filters.dateFrom;
    if (filters.dateTo) (where['createdAt'] as Record<string, Date>)['lte'] = filters.dateTo;
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

  const parsedQueries = queries.map((q) => ({
    ...q,
    tags: q.tags ? (JSON.parse(q.tags) as string[]) : [],
    templateParams: q.templateParams
      ? (JSON.parse(q.templateParams) as Record<string, unknown>)
      : null,
    chartConfig: q.chartConfig ? (JSON.parse(q.chartConfig) as Record<string, unknown>) : null,
  }));

  return { queries: parsedQueries, total, page, limit };
}

export function resolveTemplateParams(sql: string, params: Record<string, string>): string {
  let resolved = sql;
  for (const [key, value] of Object.entries(params)) {
    const sanitizedValue = value.replace(/['";\\]/g, '');
    resolved = resolved.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), sanitizedValue);
  }
  return resolved;
}

export async function shareQuery(queryId: string, targetUserId: string): Promise<QueryShare> {
  return prisma.queryShare.upsert({
    where: {
      savedQueryId_userId: { savedQueryId: queryId, userId: targetUserId },
    },
    update: {},
    create: { savedQueryId: queryId, userId: targetUserId },
  });
}

export async function broadcastQuery(queryId: string): Promise<SavedQuery> {
  return prisma.savedQuery.update({
    where: { id: queryId },
    data: { isBroadcast: true },
  });
}

export async function recordExecution(
  queryId: string,
  rowCount: number,
  durationMs: number,
  cost: number,
): Promise<SavedQuery> {
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
