import crypto from 'crypto';
import { redis } from '../../config/redis.js';
import { env } from '../../config/env.js';
import { getConnector } from '../connectors/connectionFactory.js';
import type { QueryResult } from '../connectors/postgres.connector.js';

const RESULT_CACHE_TTL = env.RESULT_CACHE_TTL_SECONDS; // 1 hour default
const RESULT_CACHE_PREFIX = 'qresult:';

export interface ExecutionResult extends QueryResult {
  cached: boolean;
  costEstimate: number;
  cacheKey: string;
}

function buildCacheKey(orgId: string, sql: string, connectionId: string): string {
  const hash = crypto
    .createHash('sha256')
    .update(`${sql}::${connectionId}`)
    .digest('hex')
    .slice(0, 32);
  return `${RESULT_CACHE_PREFIX}${orgId}:${hash}`;
}

export async function executeQuery(
  sql: string,
  connectionId: string,
  orgId: string,
  timeoutMs?: number,
): Promise<ExecutionResult> {
  const cacheKey = buildCacheKey(orgId, sql, connectionId);

  const cached = await redis.get(cacheKey);
  if (cached) {
    const parsed = JSON.parse(cached) as ExecutionResult;
    return { ...parsed, cached: true };
  }

  const connector = await getConnector(connectionId);
  const effectiveTimeout = Math.min(
    timeoutMs ?? env.QUERY_TIMEOUT_DEFAULT_MS,
    env.QUERY_TIMEOUT_MAX_MS,
  );

  const result = await connector.executeQuery(sql, effectiveTimeout);

  const costEstimate = estimateQueryCost(result.rowCount, result.executionTimeMs);

  const executionResult: ExecutionResult = {
    ...result,
    cached: false,
    costEstimate,
    cacheKey,
  };

  const serialized = JSON.stringify(executionResult);
  if (serialized.length < 5 * 1024 * 1024) {
    await redis.setex(cacheKey, RESULT_CACHE_TTL, serialized);
  }

  return executionResult;
}

function estimateQueryCost(rowCount: number, executionTimeMs: number): number {
  const baseCost = 0.001;
  const rowCost = rowCount * 0.00001;
  const timeCost = (executionTimeMs / 1000) * 0.01;
  return Math.round((baseCost + rowCost + timeCost) * 10000) / 10000;
}

export async function invalidateQueryCache(cacheKey: string): Promise<void> {
  await redis.del(cacheKey);
}
