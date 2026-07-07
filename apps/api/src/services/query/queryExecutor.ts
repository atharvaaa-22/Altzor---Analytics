import crypto from 'crypto';
import { env } from '../../config/env.js';
import { getConnector } from '../connectors/connectionFactory.js';
import type { QueryResult } from '../connectors/postgres.connector.js';

const RESULT_CACHE_TTL_MS = env.RESULT_CACHE_TTL_SECONDS * 1000;
const MAX_CACHED_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export interface ExecutionResult extends QueryResult {
  cached: boolean;
  costEstimate: number;
  cacheKey: string;
}

// In-memory result cache (replaces Redis)
const resultCache = new Map<string, { data: ExecutionResult; expiresAt: number }>();

function buildCacheKey(orgId: string, sql: string, connectionId: string): string {
  const hash = crypto
    .createHash('sha256')
    .update(`${sql}::${connectionId}`)
    .digest('hex')
    .slice(0, 32);
  return `qresult:${orgId}:${hash}`;
}

export async function executeQuery(
  sql: string,
  connectionId: string,
  orgId: string,
  timeoutMs?: number,
): Promise<ExecutionResult> {
  const cacheKey = buildCacheKey(orgId, sql, connectionId);

  const entry = resultCache.get(cacheKey);
  if (entry && Date.now() < entry.expiresAt) {
    return { ...entry.data, cached: true };
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
  if (serialized.length < MAX_CACHED_SIZE_BYTES) {
    resultCache.set(cacheKey, {
      data: executionResult,
      expiresAt: Date.now() + RESULT_CACHE_TTL_MS,
    });
  }

  return executionResult;
}

function estimateQueryCost(rowCount: number, executionTimeMs: number): number {
  const baseCost = 0.001;
  const rowCost = rowCount * 0.00001;
  const timeCost = (executionTimeMs / 1000) * 0.01;
  return Math.round((baseCost + rowCost + timeCost) * 10000) / 10000;
}

export function invalidateQueryCache(cacheKey: string): void {
  resultCache.delete(cacheKey);
}
