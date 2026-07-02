import { Redis } from 'ioredis';
import { env } from './env.js';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times: number): number | null {
    if (times > 10) return null;
    return Math.min(times * 200, 5000);
  },
  lazyConnect: true,
});

redis.on('error', (err: Error) => {
  console.error('[Redis] Connection error:', err.message);
});

redis.on('connect', () => {
  console.log('[Redis] Connected successfully');
});
