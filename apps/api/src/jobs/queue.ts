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
  // Stop reconnecting immediately if Redis is down
  enableOfflineQueue: false,
};

// Lazily created queues — only available when Redis is running
let schemaSyncQueue: Queue | null = null;
let reportDeliveryQueue: Queue | null = null;
let alertQueue: Queue | null = null;

export { schemaSyncQueue, reportDeliveryQueue, alertQueue };

export async function startWorkers(): Promise<void> {
  // Test if Redis is actually reachable before starting BullMQ workers
  await import('redis').catch(() => null);

  // Simple TCP check using ioredis
  try {
    const { Redis } = await import('ioredis');
    const testClient = new Redis({
      host: redisUrl.hostname,
      port: redisUrl.port ? Number(redisUrl.port) : 6379,
      maxRetriesPerRequest: 1,
      retryStrategy: (): null => null,
      connectTimeout: 2000,
      lazyConnect: false,
    });

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        testClient.disconnect();
        reject(new Error('timeout'));
      }, 2500);

      testClient.once('connect', () => {
        clearTimeout(timeout);
        testClient.disconnect();
        resolve();
      });

      testClient.once('error', (err) => {
        clearTimeout(timeout);
        testClient.disconnect();
        reject(err);
      });
    });
  } catch {
    logger.warn(
      '[BullMQ] Redis not available — background job workers are disabled. Core API features remain fully functional.',
    );
    return;
  }

  // Redis is available — create queues and start workers
  schemaSyncQueue = new Queue('schema-sync', { connection });
  reportDeliveryQueue = new Queue('report-delivery', { connection });
  alertQueue = new Queue('alerts', { connection });

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
