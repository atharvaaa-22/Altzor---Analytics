import { Redis } from 'ioredis';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

let redisUnavailableLogged = false;

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 1,
  // Return null immediately to stop retrying — Redis is optional
  retryStrategy(): null {
    return null;
  },
  lazyConnect: true,
  enableOfflineQueue: false,
});

redis.on('error', () => {
  if (!redisUnavailableLogged) {
    logger.warn('[Redis] Not available — running without cache. Features that require Redis (query caching, schema caching) will be skipped.');
    redisUnavailableLogged = true;
  }
});

redis.on('connect', () => {
  redisUnavailableLogged = false;
  logger.info('[Redis] Connected successfully');
});
