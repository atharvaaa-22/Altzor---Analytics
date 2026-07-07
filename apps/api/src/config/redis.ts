import { Redis } from 'ioredis';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times: number): number | null {
    if (times > 10) return null;
    return Math.min(times * 200, 5000);
  },
  lazyConnect: true,
});

redis.on('error', (err: Error) => {
  logger.error('[Redis] Connection error: ' + err.message);
});

redis.on('connect', () => {
  logger.info('[Redis] Connected successfully');
});
