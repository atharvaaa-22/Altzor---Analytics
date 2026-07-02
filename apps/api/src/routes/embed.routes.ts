import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { rbac } from '../middleware/rbac.js';
import {
  getEmbedConfig, generateSignedUrl, validateEmbedToken,
} from '../services/embed/embed.service.js';
import { prisma } from '../config/db.js';

const router = Router();

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

router.post(
  '/signed-url',
  authMiddleware,
  rbac('ORG_ADMIN'),
  (req: Request, res: Response) => {
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

router.get('/dashboard/:id', async (req: Request<{ id: string }>, res: Response) => {
  const token = req.query['token'] as string;
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

router.get('/chat/:connectionId', async (req: Request<{ connectionId: string }>, res: Response) => {
  const token = req.query['token'] as string;
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
