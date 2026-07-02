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

router.get('/', async (req: Request, res: Response) => {
  const layer = await getSemanticLayer(req.user!.organizationId);
  res.json(layer);
});

const metricSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  formula: z.string().min(1),
  dataType: z.enum(['number', 'currency', 'percentage', 'integer']),
  formatPattern: z.string().optional(),
});

router.post('/metrics', rbac('ORG_ADMIN'), async (req: Request, res: Response) => {
  try {
    const input = metricSchema.parse(req.body);
    const result = await createMetric(req.user!.organizationId, input);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.put('/metrics/:id', rbac('ORG_ADMIN'), async (req: Request<{ id: string }>, res: Response) => {
  try {
    const input = metricSchema.parse(req.body);
    const result = await updateMetric(req.params.id, req.user!.organizationId, input);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.delete('/metrics/:id', rbac('ORG_ADMIN'), async (req: Request<{ id: string }>, res: Response) => {
  await deleteMetric(req.params.id, req.user!.organizationId);
  res.json({ message: 'Metric deactivated' });
});

const dimensionSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  sourceTable: z.string().min(1),
  sourceColumn: z.string().min(1),
  dataType: z.string().min(1),
  synonyms: z.array(z.string()).optional(),
});

router.post('/dimensions', rbac('ORG_ADMIN'), async (req: Request, res: Response) => {
  try {
    const input = dimensionSchema.parse(req.body);
    const result = await createDimension(req.user!.organizationId, input);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.put('/dimensions/:id', rbac('ORG_ADMIN'), async (req: Request<{ id: string }>, res: Response) => {
  try {
    const input = dimensionSchema.parse(req.body);
    const result = await updateDimension(req.params.id, req.user!.organizationId, input);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

export { router as semanticRoutes };
