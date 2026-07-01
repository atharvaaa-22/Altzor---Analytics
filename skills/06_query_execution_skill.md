# Skill File 06 — Query Execution, Caching & Conversational Pipeline

## Overview
Wire the full conversational query pipeline: receive user question → fetch schema → build prompt → call AI → validate SQL → execute query → cache results → generate narrative → stream response via SSE. This is the **core user-facing workflow** of the platform.

**BRD References:** REQ-QER-001–007, REQ-CQI-001–011, Section 5.2.1 (Conversational Query Workflow)

---

## 1. Query Execution Service — `apps/api/src/services/query/queryExecutor.ts`

```typescript
/**
 * queryExecutor.ts — Execute validated SQL queries against target databases.
 *
 * REQ-QER-001: Default 30s timeout, configurable per org (max 5 min).
 * REQ-QER-002: Result streaming for large datasets.
 * REQ-QER-003: Metadata: row count, exec time, cost estimate, column types.
 * REQ-QER-004: Redis cache, 1hr TTL, org_id + hash(sql + connection_id) key.
 * REQ-QER-007: Read-only enforcement at driver level.
 */

import crypto from 'crypto';
import { redis } from '../../config/redis.js';
import { env } from '../../config/env.js';
import { getConnector, type DbConnector } from '../connectors/connectionFactory.js';
import type { QueryResult } from '../connectors/postgres.connector.js';

const RESULT_CACHE_TTL = env.RESULT_CACHE_TTL_SECONDS; // 1 hour default
const RESULT_CACHE_PREFIX = 'qresult:';

export interface ExecutionResult extends QueryResult {
  cached: boolean;
  costEstimate: number;
  cacheKey: string;
}

/**
 * Generate a deterministic cache key.
 * REQ-QER-004: org_id + hash(sql + connection_id).
 */
function buildCacheKey(orgId: string, sql: string, connectionId: string): string {
  const hash = crypto
    .createHash('sha256')
    .update(`${sql}::${connectionId}`)
    .digest('hex')
    .slice(0, 32);
  return `${RESULT_CACHE_PREFIX}${orgId}:${hash}`;
}

/**
 * Execute a query with caching and timeout.
 */
export async function executeQuery(
  sql: string,
  connectionId: string,
  orgId: string,
  timeoutMs?: number,
): Promise<ExecutionResult> {
  const cacheKey = buildCacheKey(orgId, sql, connectionId);

  // ── Check cache first ────────────────────────────────────────────
  const cached = await redis.get(cacheKey);
  if (cached) {
    const parsed = JSON.parse(cached) as ExecutionResult;
    return { ...parsed, cached: true };
  }

  // ── Execute against database ─────────────────────────────────────
  const connector = await getConnector(connectionId);
  const effectiveTimeout = Math.min(
    timeoutMs ?? env.QUERY_TIMEOUT_DEFAULT_MS,
    env.QUERY_TIMEOUT_MAX_MS,
  );

  const result = await connector.executeQuery(sql, effectiveTimeout);

  // ── Estimate cost (simplified) ───────────────────────────────────
  const costEstimate = estimateQueryCost(result.rowCount, result.executionTimeMs);

  const executionResult: ExecutionResult = {
    ...result,
    cached: false,
    costEstimate,
    cacheKey,
  };

  // ── Cache result ─────────────────────────────────────────────────
  // Only cache if result is not too large (< 5MB serialized)
  const serialized = JSON.stringify(executionResult);
  if (serialized.length < 5 * 1024 * 1024) {
    await redis.setex(cacheKey, RESULT_CACHE_TTL, serialized);
  }

  return executionResult;
}

/**
 * Simplified cost estimation based on rows and execution time.
 * REQ-QER-003: Cost estimate metadata.
 */
function estimateQueryCost(rowCount: number, executionTimeMs: number): number {
  // Simple formula: base cost + row-based + time-based
  const baseCost = 0.001;
  const rowCost = rowCount * 0.00001;
  const timeCost = (executionTimeMs / 1000) * 0.01;
  return Math.round((baseCost + rowCost + timeCost) * 10000) / 10000;
}

/**
 * Invalidate cache for a specific query.
 */
export async function invalidateQueryCache(cacheKey: string): Promise<void> {
  await redis.del(cacheKey);
}
```

---

## 2. Conversation Service — `apps/api/src/services/query/conversationService.ts`

```typescript
/**
 * conversationService.ts — Full conversational query pipeline.
 *
 * Orchestrates: question → schema → prompt → AI → validate → execute → narrative → store.
 * Section 5.2.1: Conversational Query Workflow (Core Path).
 */

import { prisma } from '../../config/db.js';
import { getSchemaMetadata } from '../connectors/schemaCache.js';
import { getSemanticLayer, formatSemanticForPrompt } from '../semantic/semantic.service.js';
import { buildSystemPrompt, buildMessages, parseAiResponse } from '../ai/promptBuilder.js';
import { callAi } from '../ai/aiClient.js';
import { validateSql } from '../ai/sqlValidator.js';
import { executeQuery, type ExecutionResult } from './queryExecutor.js';
import { generateNarrative, type NarrativeSummary } from '../ai/narrativeGenerator.js';
import { detectChartType } from '../ai/chartDetector.js';
import { ConnectionType } from '@prisma/client';

export interface ConversationResponse {
  messageId: string;
  sql: string;
  explanation: string;
  results: Record<string, unknown>[];
  columns: Array<{ name: string; dataType: string }>;
  rowCount: number;
  executionTimeMs: number;
  costEstimate: number;
  cached: boolean;
  chartType: string;
  narrative: NarrativeSummary;
  confidence: number;
  lineage: {
    tablesUsed: string[];
    columnsUsed: string[];
    filters: string[];
    aggregations: string[];
    rowsScanned: number;
    rowsReturned: number;
  };
  aiModel: string;
  warnings: string[];
}

/**
 * Process a user's natural language question through the full pipeline.
 */
export async function processQuestion(
  conversationId: string,
  connectionId: string,
  question: string,
  userId: string,
  orgId: string,
): Promise<ConversationResponse> {
  // ── Step 1: Save user message ────────────────────────────────────
  const userMessage = await prisma.message.create({
    data: {
      conversationId,
      userId,
      role: 'user',
      content: question,
      connectionId,
    },
  });

  // ── Step 2: Fetch schema metadata (cached) ──────────────────────
  const schema = await getSchemaMetadata(connectionId);

  // ── Step 3: Fetch semantic layer ─────────────────────────────────
  const semanticLayer = await getSemanticLayer(orgId);

  // ── Step 4: Get conversation history ─────────────────────────────
  const history = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
    take: 20, // REQ-CQI-002: Last 20 messages
    select: { role: true, content: true },
  });

  // ── Step 5: Build prompt and call AI ─────────────────────────────
  const systemPrompt = buildSystemPrompt(
    schema.dialect as ConnectionType,
    schema.tables,
    semanticLayer,
  );
  const messages = buildMessages(history, question);
  const aiResponse = await callAi(systemPrompt, messages);

  // ── Step 6: Parse AI response ────────────────────────────────────
  const parsed = parseAiResponse(aiResponse.content);

  // ── Step 7: Validate SQL ─────────────────────────────────────────
  const validation = validateSql(parsed.sql);

  if (!validation.isValid) {
    // Save error message and return
    const errorMsg = await prisma.message.create({
      data: {
        conversationId,
        role: 'assistant',
        content: `I couldn't generate a valid query. ${validation.errors.join('. ')}`,
        aiModel: aiResponse.model,
      },
    });

    throw new QueryError(
      `SQL validation failed: ${validation.errors.join(', ')}`,
      400,
      errorMsg.id,
    );
  }

  // ── Step 8: Execute query ────────────────────────────────────────
  const orgConfig = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { queryTimeoutMs: true },
  });

  let execResult: ExecutionResult;
  try {
    execResult = await executeQuery(
      validation.sanitizedSql,
      connectionId,
      orgId,
      orgConfig?.queryTimeoutMs,
    );
  } catch (execError) {
    const errorMsg = await prisma.message.create({
      data: {
        conversationId,
        role: 'assistant',
        content: `Query execution failed: ${(execError as Error).message}`,
        generatedSql: validation.sanitizedSql,
        aiModel: aiResponse.model,
      },
    });
    throw new QueryError((execError as Error).message, 500, errorMsg.id);
  }

  // ── Step 9: Detect chart type ────────────────────────────────────
  const chartType = detectChartType(execResult.columns, execResult.rowCount);

  // ── Step 10: Generate narrative summary ──────────────────────────
  let narrative: NarrativeSummary;
  try {
    narrative = await generateNarrative(
      question,
      validation.sanitizedSql,
      execResult.rows,
      execResult.columns,
    );
  } catch {
    narrative = { summary: 'Summary unavailable.', confidence: 0.3, keyFindings: [] };
  }

  // ── Step 11: Build lineage data ──────────────────────────────────
  const lineage = {
    tablesUsed: parsed.tablesUsed,
    columnsUsed: parsed.columnsUsed,
    filters: parsed.filters,
    aggregations: parsed.aggregations,
    rowsScanned: execResult.rowCount, // Simplified
    rowsReturned: execResult.rowCount,
  };

  // ── Step 12: Save assistant message ──────────────────────────────
  const assistantMessage = await prisma.message.create({
    data: {
      conversationId,
      role: 'assistant',
      content: parsed.explanation || narrative.summary,
      generatedSql: validation.sanitizedSql,
      queryResults: execResult.rows.slice(0, 500), // Cap stored results
      resultMetadata: {
        rowCount: execResult.rowCount,
        executionTimeMs: execResult.executionTimeMs,
        costEstimate: execResult.costEstimate,
        columns: execResult.columns,
        cached: execResult.cached,
      },
      chartType,
      narrativeSummary: narrative.summary,
      confidenceScore: narrative.confidence,
      lineage,
      connectionId,
      aiModel: aiResponse.model,
      executionTimeMs: execResult.executionTimeMs,
      rowCount: execResult.rowCount,
      costEstimate: execResult.costEstimate,
    },
  });

  // ── Step 13: Auto-generate conversation title ────────────────────
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { title: true },
  });
  if (!conversation?.title) {
    // Auto-title from first question (REQ-CQI-003)
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { title: question.slice(0, 100) },
    });
  }

  return {
    messageId: assistantMessage.id,
    sql: validation.sanitizedSql,
    explanation: parsed.explanation,
    results: execResult.rows,
    columns: execResult.columns,
    rowCount: execResult.rowCount,
    executionTimeMs: execResult.executionTimeMs,
    costEstimate: execResult.costEstimate,
    cached: execResult.cached,
    chartType,
    narrative,
    confidence: narrative.confidence,
    lineage,
    aiModel: aiResponse.model,
    warnings: validation.warnings,
  };
}

// ─── Error Class ───────────────────────────────────────────────────
export class QueryError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public messageId?: string,
  ) {
    super(message);
    this.name = 'QueryError';
  }
}
```

---

## 3. SSE Streaming — `apps/api/src/routes/conversations.routes.ts`

```typescript
/**
 * conversations.routes.ts — Conversational query API with SSE streaming.
 *
 * REQ-CQI-001: Chat-style UI with SSE streaming.
 * ARC-API-004: SSE for streaming query responses.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';
import { queryLimiter } from '../middleware/rateLimiter.js';
import { processQuestion } from '../services/query/conversationService.js';

const router = Router();
router.use(authMiddleware);

// ─── POST /api/conversations — Create new conversation ─────────────
router.post('/', async (req: Request, res: Response) => {
  const { connectionId } = z.object({
    connectionId: z.string().optional(),
  }).parse(req.body);

  const conversation = await prisma.conversation.create({
    data: {
      userId: req.user!.userId,
      organizationId: req.user!.organizationId,
      connectionId,
    },
  });

  res.status(201).json({ id: conversation.id });
});

// ─── GET /api/conversations — List conversations ───────────────────
// REQ-CQI-003: Conversation history sidebar with search.
router.get('/', async (req: Request, res: Response) => {
  const { search, page = '1', limit = '20' } = req.query as Record<string, string>;

  const where = {
    userId: req.user!.userId,
    organizationId: req.user!.organizationId,
    isArchived: false,
    ...(search ? { title: { contains: search } } : {}),
  };

  const [conversations, total] = await Promise.all([
    prisma.conversation.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit),
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        connection: { select: { name: true, type: true } },
      },
    }),
    prisma.conversation.count({ where }),
  ]);

  res.json({ conversations, total, page: parseInt(page), limit: parseInt(limit) });
});

// ─── POST /api/conversations/:id/messages — Send message (SSE) ────
// Section 5.2.1: Core conversational query workflow.
const messageSchema = z.object({
  question: z.string().min(1).max(5000),
  connectionId: z.string(),
});

router.post('/:id/messages', queryLimiter, async (req: Request, res: Response) => {
  try {
    const { question, connectionId } = messageSchema.parse(req.body);

    // Set up SSE headers (ARC-API-004)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // Stream status updates
    const sendEvent = (event: string, data: unknown): void => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    sendEvent('status', { stage: 'fetching_schema', message: 'Loading database schema...' });

    // Process the full pipeline
    sendEvent('status', { stage: 'generating_sql', message: 'AI is generating SQL...' });

    const result = await processQuestion(
      req.params.id,
      connectionId,
      question,
      req.user!.userId,
      req.user!.organizationId,
    );

    // Stream results
    sendEvent('sql', { sql: result.sql, explanation: result.explanation });
    sendEvent('status', { stage: 'executing', message: 'Running query...' });

    sendEvent('results', {
      rows: result.results,
      columns: result.columns,
      rowCount: result.rowCount,
      executionTimeMs: result.executionTimeMs,
      costEstimate: result.costEstimate,
      cached: result.cached,
    });

    sendEvent('chart', { chartType: result.chartType });

    sendEvent('narrative', {
      summary: result.narrative.summary,
      confidence: result.narrative.confidence,
      keyFindings: result.narrative.keyFindings,
    });

    sendEvent('lineage', result.lineage);

    if (result.warnings.length > 0) {
      sendEvent('warnings', { warnings: result.warnings });
    }

    sendEvent('complete', { messageId: result.messageId });
    res.end();
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode ?? 500;
    res.write(`event: error\ndata: ${JSON.stringify({ error: (error as Error).message, status })}\n\n`);
    res.end();
  }
});

// ─── GET /api/conversations/:id/messages — Get message history ─────
router.get('/:id/messages', async (req: Request, res: Response) => {
  const messages = await prisma.message.findMany({
    where: { conversationId: req.params.id },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      role: true,
      content: true,
      generatedSql: true,
      queryResults: true,
      resultMetadata: true,
      chartType: true,
      chartOverride: true,
      narrativeSummary: true,
      confidenceScore: true,
      lineage: true,
      aiModel: true,
      createdAt: true,
      feedback: { select: { type: true } },
    },
  });

  res.json({ messages });
});

// ─── POST /api/conversations/:id/messages/:msgId/feedback ──────────
// REQ-CQI-010: Thumbs up/down feedback.
const feedbackSchema = z.object({
  type: z.enum(['THUMBS_UP', 'THUMBS_DOWN']),
  comment: z.string().optional(),
});

router.post('/:id/messages/:msgId/feedback', async (req: Request, res: Response) => {
  const { type, comment } = feedbackSchema.parse(req.body);

  const feedback = await prisma.queryFeedback.upsert({
    where: { messageId: req.params.msgId },
    update: { type, comment },
    create: {
      messageId: req.params.msgId,
      userId: req.user!.userId,
      type,
      comment,
    },
  });

  res.json(feedback);
});

export { router as conversationRoutes };
```

---

## 4. Result Export — `apps/api/src/services/query/resultExporter.ts`

```typescript
/**
 * resultExporter.ts — Export query results in CSV, JSON, XLSX formats.
 *
 * REQ-QER-006: Export in CSV, JSON, Excel (.xlsx).
 * Excel export via SheetJS on the frontend; backend provides CSV/JSON.
 */

export function exportToCsv(
  rows: Record<string, unknown>[],
  columns: Array<{ name: string }>,
): string {
  if (rows.length === 0) return '';

  const header = columns.map((c) => escapeCsvField(c.name)).join(',');
  const lines = rows.map((row) =>
    columns.map((c) => escapeCsvField(String(row[c.name] ?? ''))).join(','),
  );

  return [header, ...lines].join('\n');
}

function escapeCsvField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

export function exportToJson(rows: Record<string, unknown>[]): string {
  return JSON.stringify(rows, null, 2);
}
```

---

## 5. Audit Logging — `apps/api/src/services/audit/auditLogger.ts`

```typescript
/**
 * auditLogger.ts — Immutable audit trail for all actions.
 *
 * NFR-SEC-006: Track every query, user, data accessed, AI model version.
 * Logs are immutable, retained 7+ years.
 */

import { prisma } from '../../config/db.js';

export interface AuditEntry {
  action: string;
  userId?: string;
  organizationId: string;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  // Fire-and-forget — never block the main flow
  void prisma.auditLog.create({ data: entry }).catch((err) => {
    console.error('[Audit] Failed to log:', err);
  });
}

// ─── Predefined Actions ────────────────────────────────────────────
export const AuditActions = {
  QUERY_EXECUTED: 'query_executed',
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  USER_CREATED: 'user_created',
  USER_DELETED: 'user_deleted',
  CONNECTION_CREATED: 'connection_created',
  CONNECTION_DELETED: 'connection_deleted',
  DASHBOARD_CREATED: 'dashboard_created',
  DASHBOARD_SHARED: 'dashboard_shared',
  FILE_UPLOADED: 'file_uploaded',
  FILE_DELETED: 'file_deleted',
  METRIC_CREATED: 'metric_created',
  PASSWORD_CHANGED: 'password_changed',
  ROLE_CHANGED: 'role_changed',
} as const;
```

---

## 6. Verification Checklist

| Step | Action | Expected |
|------|--------|----------|
| Create conversation | `POST /api/conversations` | 201 + conversation ID |
| Send question (SSE) | `POST /api/conversations/:id/messages` | SSE events: status → sql → results → chart → narrative → complete |
| Results cached | Send same question twice | 2nd response has `cached: true` |
| Follow-up question | Reference previous result | Context-aware response (REQ-CQI-004) |
| History loads | `GET /api/conversations/:id/messages` | All messages with SQL, results, charts |
| Feedback saved | `POST /:id/messages/:msgId/feedback` | Thumbs up/down stored |
| Export CSV | Export endpoint | Valid CSV with headers |
| Audit logged | Check `audit_logs` table | `query_executed` entry with details |
| Timeout enforced | Query >30s | Timeout error (REQ-QER-001) |

---

## Next Skill → `07_visualization_frontend_skill.md`
