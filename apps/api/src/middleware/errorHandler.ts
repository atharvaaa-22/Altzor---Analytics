import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { logger } from '../utils/logger.js';

export function globalErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const correlationId = req.headers['x-correlation-id'] as string;

  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    correlationId,
  });

  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation error',
      details: err.issues.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
      correlationId,
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Resource not found', correlationId });
      return;
    }
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'Resource already exists', correlationId });
      return;
    }
  }

  if ('statusCode' in err) {
    const status = (err as { statusCode: number }).statusCode;
    res.status(status).json({ error: err.message, correlationId });
    return;
  }

  res.status(500).json({
    error: 'Internal server error',
    correlationId,
    ...(process.env['NODE_ENV'] === 'development' ? { stack: err.stack } : {}),
  });
}
