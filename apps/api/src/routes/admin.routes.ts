import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { rbac } from '../middleware/rbac.js';
import { prisma } from '../config/db.js';

const router = Router();
router.use(authMiddleware);

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

export { router as adminRoutes };
