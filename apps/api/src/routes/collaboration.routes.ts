import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import {
  createComment, getComments, deleteComment,
  createAnnotation, getAnnotations, deleteAnnotation,
} from '../services/collaboration/collaboration.service.js';

const router = Router();
router.use(authMiddleware);

router.post('/dashboards/:dashId/comments', async (req: Request<{ dashId: string }>, res: Response) => {
  const input = z.object({
    content: z.string().min(1).max(5000),
    widgetId: z.string().optional(),
    parentId: z.string().optional(),
    mentions: z.array(z.string()).optional(),
  }).parse(req.body);

  const comment = await createComment(req.user!.userId, {
    ...input,
    dashboardId: req.params.dashId,
  });

  res.status(201).json(comment);
});

router.get('/dashboards/:dashId/comments', async (req: Request<{ dashId: string }>, res: Response) => {
  const widgetId = req.query['widgetId'] as string | undefined;
  const comments = await getComments(req.params.dashId, widgetId);
  res.json(comments);
});

router.delete('/comments/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    await deleteComment(req.params.id, req.user!.userId);
    res.json({ message: 'Comment deleted' });
  } catch (error) {
    res.status(403).json({ error: (error as Error).message });
  }
});

router.post('/widgets/:widgetId/annotations', async (req: Request<{ widgetId: string }>, res: Response) => {
  const input = z.object({
    content: z.string().min(1).max(2000),
    dataPointRef: z.object({
      x: z.unknown().optional(),
      y: z.unknown().optional(),
      series: z.string().optional(),
      value: z.unknown().optional(),
      label: z.string().optional(),
    }),
  }).parse(req.body);

  const annotation = await createAnnotation(req.user!.userId, {
    ...input,
    widgetId: req.params.widgetId,
  });

  res.status(201).json(annotation);
});

router.get('/widgets/:widgetId/annotations', async (req: Request<{ widgetId: string }>, res: Response) => {
  const annotations = await getAnnotations(req.params.widgetId);
  res.json(annotations);
});

router.delete('/annotations/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    await deleteAnnotation(req.params.id, req.user!.userId);
    res.json({ message: 'Annotation deleted' });
  } catch (error) {
    res.status(403).json({ error: (error as Error).message });
  }
});

export { router as collaborationRoutes };
