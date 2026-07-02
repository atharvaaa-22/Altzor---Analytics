import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';
import { rbac } from '../middleware/rbac.js';
import { ChartType } from '../services/ai/chartDetector.js';
import {
  createDashboard, addWidget, updateLayout,
  duplicateDashboard, shareDashboard, generatePublicLink,
  archiveDashboard, deleteDashboard,
  updateDashboardFilters, refreshWidget,
  WidgetType
} from '../services/dashboard/dashboard.service.js';

const router = Router();
router.use(authMiddleware);

router.post('/', async (req: Request, res: Response) => {
  const input = z.object({
    title: z.string().min(1).max(255),
    description: z.string().optional(),
  }).parse(req.body);

  const dashboard = await createDashboard(
    req.user!.userId,
    req.user!.organizationId,
    input,
  );
  res.status(201).json(dashboard);
});

router.get('/', async (req: Request, res: Response) => {
  const dashboards = await prisma.dashboard.findMany({
    where: {
      organizationId: req.user!.organizationId,
      isArchived: false,
      OR: [
        { userId: req.user!.userId },
        { shares: { some: { userId: req.user!.userId } } },
      ],
    },
    orderBy: { updatedAt: 'desc' },
    include: {
      user: { select: { firstName: true, lastName: true } },
      _count: { select: { widgets: true } },
    },
  });
  res.json(dashboards);
});

router.get('/:id', async (req: Request<{ id: string }>, res: Response) => {
  const dashboard = await prisma.dashboard.findUniqueOrThrow({
    where: { id: req.params.id },
    include: {
      widgets: { orderBy: { createdAt: 'asc' } },
      user: { select: { firstName: true, lastName: true } },
    },
  });
  res.json(dashboard);
});

router.post('/:id/widgets', async (req: Request<{ id: string }>, res: Response) => {
  const input = z.object({
    type: z.nativeEnum(WidgetType),
    title: z.string().optional(),
    savedQueryId: z.string().optional(),
    naturalQuery: z.string().optional(),
    chartType: z.nativeEnum(ChartType).optional(),
    chartConfig: z.record(z.string(), z.unknown()).optional(),
    gridPosition: z.object({
      x: z.number(), y: z.number(), w: z.number(), h: z.number(),
    }),
    markdownContent: z.string().optional(),
  }).parse(req.body);

  const widget = await addWidget(req.params.id, input);
  res.status(201).json(widget);
});

router.put('/:id/layout', async (req: Request<{ id: string }>, res: Response) => {
  const input = z.object({
    widgets: z.array(z.object({
      widgetId: z.string(),
      gridPosition: z.object({
        x: z.number(), y: z.number(), w: z.number(), h: z.number(),
      }),
    })),
  }).parse(req.body);

  await updateLayout(req.params.id, input);
  res.json({ message: 'Layout updated' });
});

router.post('/:id/duplicate', async (req: Request<{ id: string }>, res: Response) => {
  const dashboard = await duplicateDashboard(
    req.params.id,
    req.user!.userId,
    req.user!.organizationId,
  );
  res.status(201).json(dashboard);
});

router.post('/:id/share', async (req: Request<{ id: string }>, res: Response) => {
  const { userId, canEdit } = z.object({
    userId: z.string(),
    canEdit: z.boolean().default(false),
  }).parse(req.body);

  await shareDashboard(req.params.id, userId, canEdit);
  res.json({ message: 'Dashboard shared' });
});

router.post('/:id/public-link', rbac('ORG_ADMIN'), async (req: Request<{ id: string }>, res: Response) => {
  const result = await generatePublicLink(req.params.id);
  res.json({ publicUrl: `/public/dashboards/${result.publicSlug}` });
});

router.put('/:id/filters', async (req: Request<{ id: string }>, res: Response) => {
  const filters = req.body as Record<string, unknown>;
  await updateDashboardFilters(req.params.id, filters);
  res.json({ message: 'Filters updated' });
});

router.post('/:id/widgets/:wid/refresh', async (req: Request<{ id: string, wid: string }>, res: Response) => {
  await refreshWidget(req.params.wid);
  res.json({ message: 'Widget refreshed' });
});

router.delete('/:id', async (req: Request<{ id: string }>, res: Response) => {
  await deleteDashboard(req.params.id);
  res.json({ message: 'Dashboard deleted' });
});

router.post('/:id/archive', async (req: Request<{ id: string }>, res: Response) => {
  await archiveDashboard(req.params.id);
  res.json({ message: 'Dashboard archived' });
});

export { router as dashboardRoutes };
