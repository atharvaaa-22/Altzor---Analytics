import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { login, refreshAccessToken, logout, changePassword } from '../services/auth/auth.service.js';
import { authMiddleware } from '../middleware/auth.js';
import { loginLimiter } from '../middleware/rateLimiter.js';
import { env } from '../config/env.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/login', loginLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const result = await login(email, password);

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/auth',
    });

    res.json({
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode ?? 500;
    res.status(status).json({ error: (error as Error).message });
  }
});

router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const oldToken = req.cookies?.['refreshToken'] as string | undefined;
    if (!oldToken) {
      res.status(401).json({ error: 'No refresh token provided' });
      return;
    }

    const result = await refreshAccessToken(oldToken);

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/auth',
    });

    res.json({
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (error) {
    res.status(401).json({ error: (error as Error).message });
  }
});

router.post('/logout', async (req: Request, res: Response) => {
  const token = req.cookies?.['refreshToken'] as string | undefined;
  if (token) {
    await logout(token);
  }
  res.clearCookie('refreshToken', { path: '/api/auth' });
  res.json({ message: 'Logged out successfully' });
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

router.post('/change-password', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    await changePassword(req.user!.userId, currentPassword, newPassword);
    res.clearCookie('refreshToken', { path: '/api/auth' });
    res.json({ message: 'Password changed. Please login again.' });
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode ?? 500;
    res.status(status).json({ error: (error as Error).message });
  }
});

export { router as authRoutes };
