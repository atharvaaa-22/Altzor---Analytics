# Skill File 13 — Express Bootstrap & Route Wiring

## Overview
Wire all routes, middleware, and services into the Express.js application entry point. Configure CORS, body parsing, cookie parsing, error handling, Swagger docs, BullMQ job queues, and graceful shutdown. This is the **glue** that brings the entire API together.

**BRD References:** Section 5.1 (Tier 2), ARC-API-001–005, NFR-MAINT-006–008

---

## 1. Express App Bootstrap — `apps/api/src/index.ts`

```typescript
/**
 * index.ts — Express application bootstrap.
 *
 * Wires all middleware, routes, job queues, and monitoring.
 * Section 5.1 (Tier 2): Express.js 5.x on Node.js 22 LTS.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import { env } from './config/env.js';
import { prisma } from './config/db.js';
import { redis } from './config/redis.js';

// Middleware
import { correlationIdMiddleware } from './middleware/correlationId.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { globalErrorHandler } from './middleware/errorHandler.js';

// Routes
import { authRoutes } from './routes/auth.routes.js';
import { connectionRoutes } from './routes/connections.routes.js';
import { conversationRoutes } from './routes/conversations.routes.js';
import { dashboardRoutes } from './routes/dashboards.routes.js';
import { fileRoutes } from './routes/files.routes.js';
import { queryRoutes } from './routes/queries.routes.js';
import { semanticRoutes } from './routes/semantic.routes.js';
import { embedRoutes } from './routes/embed.routes.js';
import { collaborationRoutes } from './routes/collaboration.routes.js';

// Logger
import { logger } from './utils/logger.js';

const app = express();

// ─── Security Headers ──────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false,
}));

// ─── CORS ──────────────────────────────────────────────────────────
app.use(cors({
  origin: env.NODE_ENV === 'production'
    ? ['https://app.platform.com'] // Production origins
    : ['http://localhost:5173'],    // Vite dev server
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-Id'],
}));

// ─── Body Parsing ──────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(compression());

// ─── Correlation ID ────────────────────────────────────────────────
// NFR-MAINT-006: Correlation IDs on all requests.
app.use(correlationIdMiddleware);

// ─── Request Logging ───────────────────────────────────────────────
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    correlationId: req.headers['x-correlation-id'],
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });
  next();
});

// ─── Rate Limiting ─────────────────────────────────────────────────
// ARC-API-002: Rate limiting at API level.
app.use('/api', apiLimiter);

// ─── Health Check ──────────────────────────────────────────────────
// NFR-AVAIL-001: ALB health checks.
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

// ─── API Routes ────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/dashboards', dashboardRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/queries', queryRoutes);
app.use('/api/semantic', semanticRoutes);
app.use('/api/embed', embedRoutes);
app.use('/api', collaborationRoutes);  // Nested under /api/dashboards/:id/comments etc.

// ─── Swagger UI (Development Only) ────────────────────────────────
// ARC-API-005: OpenAPI at /api/docs in dev only.
if (env.NODE_ENV === 'development') {
  app.get('/api/docs', (_req, res) => {
    res.json({ message: 'Swagger UI — integrate swagger-ui-express with OpenAPI spec here' });
  });
}

// ─── Embed Routes (Public) ─────────────────────────────────────────
app.use('/embed', embedRoutes);

// ─── 404 Handler ───────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─── Global Error Handler ──────────────────────────────────────────
app.use(globalErrorHandler);

// ─── Start Server ──────────────────────────────────────────────────
const server = app.listen(env.PORT, () => {
  logger.info(`🚀 API server running on port ${env.PORT}`);
  logger.info(`   Environment: ${env.NODE_ENV}`);
});

// ─── Graceful Shutdown ─────────────────────────────────────────────
const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  server.close(async () => {
    logger.info('HTTP server closed');

    await prisma.$disconnect();
    logger.info('Database disconnected');

    redis.disconnect();
    logger.info('Redis disconnected');

    process.exit(0);
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30_000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export { app };
```

---

## 2. Global Error Handler — `apps/api/src/middleware/errorHandler.ts`

```typescript
/**
 * errorHandler.ts — Global error handling middleware.
 *
 * Catches all unhandled errors and returns consistent JSON responses.
 * NFR-MAINT-008: Sentry integration for error tracking.
 */

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

  // Log error
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    correlationId,
  });

  // Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation error',
      details: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
      correlationId,
    });
    return;
  }

  // Prisma errors
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

  // Auth errors
  if ('statusCode' in err) {
    const status = (err as { statusCode: number }).statusCode;
    res.status(status).json({ error: err.message, correlationId });
    return;
  }

  // Default 500
  res.status(500).json({
    error: 'Internal server error',
    correlationId,
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
}
```

---

## 3. Logger — `apps/api/src/utils/logger.ts`

```typescript
/**
 * logger.ts — Winston structured logging.
 *
 * NFR-MAINT-006: Centralized structured logging (Winston → CloudWatch).
 */

import winston from 'winston';
import { env } from '../config/env.js';

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  env.NODE_ENV === 'production'
    ? winston.format.json()
    : winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, ...meta }) => {
          const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          return `${timestamp} [${level}] ${message}${metaStr}`;
        }),
      ),
);

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: logFormat,
  defaultMeta: { service: 'ai-analytics-api' },
  transports: [
    new winston.transports.Console(),
    // Production: Add CloudWatch transport
    // new WinstonCloudWatch({ logGroupName: env.CLOUDWATCH_LOG_GROUP, ... })
  ],
});
```

---

## 4. BullMQ Job Queue — `apps/api/src/jobs/queue.ts`

```typescript
/**
 * queue.ts — BullMQ job queue setup.
 *
 * Section 5.1: BullMQ 5.x for async jobs (reports, schema sync, alerts).
 */

import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });

// ─── Queues ────────────────────────────────────────────────────────
export const schemaSyncQueue = new Queue('schema-sync', { connection });
export const reportDeliveryQueue = new Queue('report-delivery', { connection });
export const alertQueue = new Queue('alerts', { connection });

// ─── Workers ───────────────────────────────────────────────────────
export function startWorkers(): void {
  // Schema Sync Worker
  new Worker(
    'schema-sync',
    async (job) => {
      const { connectionId } = job.data as { connectionId: string };
      logger.info(`[Job] Schema sync for connection: ${connectionId}`);
      const { refreshSchemaCache } = await import('../services/connectors/schemaCache.js');
      await refreshSchemaCache(connectionId);
    },
    { connection, concurrency: 3 },
  );

  // Report Delivery Worker
  new Worker(
    'report-delivery',
    async (job) => {
      const { userId, reportType, data } = job.data as Record<string, unknown>;
      logger.info(`[Job] Delivering report to user: ${userId}`);
      // TODO: Generate report (PDF/Excel) and send via SES
    },
    { connection, concurrency: 2 },
  );

  // Alert Processor Worker
  new Worker(
    'alerts',
    async (job) => {
      const { type, threshold, currentValue, orgId } = job.data as Record<string, unknown>;
      logger.info(`[Job] Processing alert: ${type} (threshold: ${threshold})`);
      // TODO: Evaluate condition and send notifications
    },
    { connection, concurrency: 5 },
  );

  logger.info('[BullMQ] All workers started');
}
```

---

## 5. API Package Config — `apps/api/package.json`

```json
{
  "name": "@platform/api",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "lint": "eslint src/",
    "test": "vitest run",
    "test:watch": "vitest",
    "db:migrate": "prisma migrate dev",
    "db:seed": "prisma db seed",
    "db:studio": "prisma studio"
  },
  "dependencies": {
    "@aws-sdk/client-s3": "^3.600.0",
    "@google/generative-ai": "^0.12.0",
    "@prisma/client": "^5.15.0",
    "bcryptjs": "^2.4.3",
    "bullmq": "^5.8.0",
    "compression": "^1.7.4",
    "cookie-parser": "^1.4.6",
    "cors": "^2.8.5",
    "csv-parse": "^5.5.0",
    "express": "^5.0.0",
    "express-rate-limit": "^7.3.0",
    "helmet": "^7.1.0",
    "ioredis": "^5.4.0",
    "jsonwebtoken": "^9.0.2",
    "mongodb": "^6.7.0",
    "mssql": "^11.0.0",
    "multer": "^1.4.5-lts.1",
    "mysql2": "^3.10.0",
    "pdf-parse": "^1.1.1",
    "pg": "^8.12.0",
    "react-markdown": "^9.0.0",
    "snowflake-sdk": "^1.12.0",
    "winston": "^3.13.0",
    "xlsx": "^0.18.5",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/compression": "^1.7.5",
    "@types/cookie-parser": "^1.4.7",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.6",
    "@types/multer": "^1.4.11",
    "@types/pg": "^8.11.6",
    "prisma": "^5.15.0",
    "tsx": "^4.15.0",
    "typescript": "^5.4.0",
    "vitest": "^1.6.0"
  },
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

---

## 6. Verification Checklist

| Step | Command | Expected |
|------|---------|----------|
| Start API | `npm run dev` in `apps/api` | `🚀 API server running on port 4000` |
| Health check | `GET /health` | `{ status: "healthy" }` |
| Routes registered | `GET /api/nonexistent` | 404 JSON response |
| CORS works | Request from `localhost:5173` | No CORS errors |
| Error handler | Send invalid JSON body | 400 validation error |
| Prisma 404 | Get non-existent resource | 404 "Resource not found" |
| Correlation ID | Check response headers | `X-Correlation-Id` present |
| Structured logs | Check console output | Timestamped JSON/colored logs |
| Graceful shutdown | `Ctrl+C` | DB and Redis disconnected cleanly |

---

## Next Skill → `14_react_frontend_skill.md`
