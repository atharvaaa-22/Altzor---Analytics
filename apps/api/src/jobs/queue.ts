import { Queue, Worker, type ConnectionOptions } from 'bullmq';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const redisUrl = new URL(env.REDIS_URL);
const connection: ConnectionOptions = {
  host: redisUrl.hostname,
  port: redisUrl.port ? Number(redisUrl.port) : 6379,
  username: redisUrl.username || undefined,
  password: redisUrl.password || undefined,
  db:
    redisUrl.pathname && redisUrl.pathname.length > 1
      ? Number(redisUrl.pathname.slice(1))
      : undefined,
  tls: redisUrl.protocol === 'rediss:' ? {} : undefined,
  maxRetriesPerRequest: null,
};

export const schemaSyncQueue = new Queue('schema-sync', { connection });
export const reportDeliveryQueue = new Queue('report-delivery', { connection });
export const alertQueue = new Queue('alerts', { connection });

export function startWorkers(): void {
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

  new Worker(
    'report-delivery',
    // eslint-disable-next-line @typescript-eslint/require-await
    async (job) => {
      const { userId } = job.data as { userId: string };
      logger.info(`[Job] Delivering report to user: ${userId}`);
    },
    { connection, concurrency: 2 },
  );

  new Worker(
    'alerts',
    // eslint-disable-next-line @typescript-eslint/require-await
    async (job) => {
      const { type, threshold } = job.data as { type: string; threshold: number };
      logger.info(`[Job] Processing alert: ${type} (threshold: ${threshold})`);
    },
    { connection, concurrency: 5 },
  );

  logger.info('[BullMQ] All workers started');
}
