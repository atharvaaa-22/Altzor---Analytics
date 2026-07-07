import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import { env } from './config/env.js';
import { prisma } from './config/db.js';
import { redis } from './config/redis.js';

import { correlationIdMiddleware } from './middleware/correlationId.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { globalErrorHandler } from './middleware/errorHandler.js';

import { authRoutes } from './routes/auth.routes.js';
import { connectionRoutes } from './routes/connections.routes.js';
import { conversationRoutes } from './routes/conversations.routes.js';
import { dashboardRoutes } from './routes/dashboards.routes.js';
import { fileRoutes } from './routes/files.routes.js';
import { queryRoutes } from './routes/queries.routes.js';
import { semanticRoutes } from './routes/semantic.routes.js';
import { embedRoutes } from './routes/embed.routes.js';
import { collaborationRoutes } from './routes/collaboration.routes.js';
import { adminRoutes } from './routes/admin.routes.js';

import { logger } from './utils/logger.js';
import { startWorkers } from './jobs/queue.js';

const app = express();

app.use(helmet({
  contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false,
}));

app.use(cors({
  origin: env.NODE_ENV === 'production'
    ? ['https://app.platform.com']
    : ['http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-Id'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(compression());

app.use(correlationIdMiddleware);

app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    correlationId: req.headers['x-correlation-id'],
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });
  next();
});

app.use('/api', apiLimiter);

app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    await redis.ping();
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: (error as Error).message,
    });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/dashboards', dashboardRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/queries', queryRoutes);
app.use('/api/semantic', semanticRoutes);
app.use('/api/embed', embedRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', collaborationRoutes);

if (env.NODE_ENV === 'development') {
  app.get('/api/docs', (_req, res) => {
    res.json({ message: 'Swagger UI — integrate swagger-ui-express with OpenAPI spec here' });
  });
}

app.use('/embed', embedRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use(globalErrorHandler);

const server = app.listen(env.PORT, () => {
  logger.info(`🚀 API server running on port ${env.PORT}`);
  logger.info(`   Environment: ${env.NODE_ENV}`);
  
  void startWorkers();
});

const gracefulShutdown = (signal: string): void => {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  server.close(() => {
    logger.info('HTTP server closed');

    prisma.$disconnect()
      .then(() => {
        logger.info('Database disconnected');
        redis.disconnect();
        logger.info('Redis disconnected');
        process.exit(0);
      })
      .catch((err) => {
        logger.error('Error during shutdown', err);
        process.exit(1);
      });
  });

  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30_000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export { app };
