import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });

export const schemaSyncQueue = new Queue('schema-sync', { connection: connection as any });
export const reportDeliveryQueue = new Queue('report-delivery', { connection: connection as any });
export const alertQueue = new Queue('alerts', { connection: connection as any });

export function startWorkers(): void {
  new Worker(
    'schema-sync',
    async (job) => {
      const { connectionId } = job.data as { connectionId: string };
      logger.info(`[Job] Schema sync for connection: ${connectionId}`);
      const { refreshSchemaCache } = await import('../services/connectors/schemaCache.js');
      await refreshSchemaCache(connectionId);
    },
    { connection: connection as any, concurrency: 3 },
  );

  new Worker(
    'report-delivery',
    // eslint-disable-next-line @typescript-eslint/require-await
    async (job) => {
      const { userId } = job.data as { userId: string };
      logger.info(`[Job] Delivering report to user: ${userId}`);
    },
    { connection: connection as any, concurrency: 2 },
  );

  new Worker(
    'alerts',
    // eslint-disable-next-line @typescript-eslint/require-await
    async (job) => {
      const { type, threshold } = job.data as { type: string; threshold: number };
      logger.info(`[Job] Processing alert: ${type} (threshold: ${threshold})`);
    },
    { connection: connection as any, concurrency: 5 },
  );

  logger.info('[BullMQ] All workers started');
}
