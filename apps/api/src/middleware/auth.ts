import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, type AccessTokenPayload } from '../services/auth/auth.service.js';
import { prisma } from '../config/db.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid authorization header' });
      return;
    }

    const token = authHeader.slice(7);
    const payload = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { lastActiveAt: true, isActive: true },
    });

    if (!user || !user.isActive) {
      res.status(401).json({ error: 'Account is deactivated' });
      return;
    }

    if (user.lastActiveAt) {
      const elapsed = Date.now() - user.lastActiveAt.getTime();
      if (elapsed > INACTIVITY_TIMEOUT_MS) {
        res.status(401).json({ error: 'Session expired due to inactivity' });
        return;
      }
    }

    void prisma.user.update({
      where: { id: payload.userId },
      data: { lastActiveAt: new Date() },
    });

    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
