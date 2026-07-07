import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { ChartType } from '../services/ai/chartDetector.js';
import { authMiddleware } from '../middleware/auth.js';
import {
  saveQuery,
  listSavedQueries,
  shareQuery,
  broadcastQuery,
  resolveTemplateParams,
} from '../services/query/savedQueries.service.js';

const router = Router();
router.use(authMiddleware);

const saveSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  naturalQuery: z.string().min(1),
  generatedSql: z.string().min(1),
  tags: z.array(z.string()).optional(),
  isTemplate: z.boolean().optional(),
  templateParams: z
    .record(
      z.string(),
      z.object({
        type: z.string(),
        label: z.string(),
        default: z.string().optional(),
      }),
    )
    .optional(),
  chartType: z.nativeEnum(ChartType).optional(),
  chartConfig: z.record(z.string(), z.unknown()).optional(),
  connectionId: z.string().optional(),
});

router.post('/', async (req: Request, res: Response) => {
  const input = saveSchema.parse(req.body);
  const query = await saveQuery(req.user!.userId, req.user!.organizationId, input);
  res.status(201).json({
    ...query,
    tags: query.tags ? (JSON.parse(query.tags) as string[]) : [],
    templateParams: query.templateParams
      ? (JSON.parse(query.templateParams) as Record<string, unknown>)
      : null,
    chartConfig: query.chartConfig
      ? (JSON.parse(query.chartConfig) as Record<string, unknown>)
      : null,
  });
});

router.get('/', async (req: Request, res: Response) => {
  const filters = {
    search: req.query['search'] as string | undefined,
    tags: req.query['tags'] ? (req.query['tags'] as string).split(',') : undefined,
    creatorId: req.query['creatorId'] as string | undefined,
    isTemplate:
      req.query['isTemplate'] === 'true'
        ? true
        : req.query['isTemplate'] === 'false'
          ? false
          : undefined,
    sortBy: (req.query['sortBy'] as 'title' | 'createdAt' | 'lastRunAt') ?? 'updatedAt',
    sortOrder: (req.query['sortOrder'] as 'asc' | 'desc') ?? 'desc',
    page: req.query['page'] ? parseInt(req.query['page'] as string) : 1,
    limit: req.query['limit'] ? parseInt(req.query['limit'] as string) : 20,
  };

  const result = await listSavedQueries(req.user!.organizationId, req.user!.userId, filters);
  res.json(result);
});

router.post('/:id/share', async (req: Request<{ id: string }>, res: Response) => {
  const { userId } = z.object({ userId: z.string() }).parse(req.body);
  await shareQuery(req.params.id, userId);
  res.json({ message: 'Query shared' });
});

router.post('/:id/broadcast', async (req: Request<{ id: string }>, res: Response) => {
  await broadcastQuery(req.params.id);
  res.json({ message: 'Query broadcast to organization' });
});

router.post('/:id/execute', async (req: Request<{ id: string }>, res: Response) => {
  const { params } = z
    .object({
      params: z.record(z.string(), z.string()).optional(),
    })
    .parse(req.body);

  const query = await import('../config/db.js').then((m) =>
    m.prisma.savedQuery.findUniqueOrThrow({ where: { id: req.params.id } }),
  );

  let sql = query.generatedSql;
  if (query.isTemplate && params) {
    sql = resolveTemplateParams(sql, params);
  }

  const { executeQuery } = await import('../services/query/queryExecutor.js');
  const result = await executeQuery(sql, query.connectionId!, req.user!.organizationId);

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
