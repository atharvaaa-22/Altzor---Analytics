import { prisma } from '../../config/db.js';
import { getSchemaMetadata } from '../connectors/schemaCache.js';
import { getSemanticLayer } from '../semantic/semantic.service.js';
import { buildSystemPrompt, buildMessages, parseAiResponse } from '../ai/promptBuilder.js';
import { callAi } from '../ai/aiClient.js';
import { validateSql } from '../ai/sqlValidator.js';
import { executeQuery, type ExecutionResult } from './queryExecutor.js';
import { generateNarrative, type NarrativeSummary } from '../ai/narrativeGenerator.js';
import { detectChartType } from '../ai/chartDetector.js';

/** Safely JSON-stringify values that may contain BigInt (from SQLite raw queries). */
function safeBigIntStringify(value: unknown): string {
  return JSON.stringify(value, (_key: string, val: unknown): unknown =>
    typeof val === 'bigint' ? Number(val) : val
  );
}


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

export async function processQuestion(
  conversationId: string,
  connectionId: string,
  question: string,
  userId: string,
  orgId: string,
): Promise<ConversationResponse> {
  // 'default' and 'local' are virtual SQLite connection IDs — not real DB records.
  // Use undefined so Prisma's optional FK to DatabaseConnection stays null.
  const dbConnectionId = (connectionId === 'default' || connectionId === 'local')
    ? undefined
    : connectionId;

  await prisma.message.create({
    data: {
      conversationId,
      userId,
      role: 'user',
      content: question,
      connectionId: dbConnectionId,
    },
  });

  const schema = await getSchemaMetadata(connectionId);
  const semanticLayer = await getSemanticLayer(orgId);

  const history = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
    take: 20,
    select: { role: true, content: true },
  });

  const systemPrompt = buildSystemPrompt(
    schema.dialect,
    schema.tables,
    semanticLayer,
  );
  const messages = buildMessages(history, question);
  const aiResponse = await callAi(systemPrompt, messages);

  const parsed = parseAiResponse(aiResponse.content);
  const validation = validateSql(parsed.sql);

  if (!validation.isValid) {
    const errorMsg = await prisma.message.create({
      data: {
        conversationId,
        connectionId: dbConnectionId,
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
      orgConfig?.queryTimeoutMs ?? undefined,
    );
  } catch (execError) {
    const errorMsg = await prisma.message.create({
      data: {
        conversationId,
        connectionId: dbConnectionId,
        role: 'assistant',
        content: `Query execution failed: ${(execError as Error).message}`,
        generatedSql: validation.sanitizedSql,
        aiModel: aiResponse.model,
      },
    });
    throw new QueryError((execError as Error).message, 500, errorMsg.id);
  }

  const chartType = detectChartType(execResult.columns, execResult.rowCount);

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

  const lineage = {
    tablesUsed: parsed.tablesUsed,
    columnsUsed: parsed.columnsUsed,
    filters: parsed.filters,
    aggregations: parsed.aggregations,
    rowsScanned: execResult.rowCount,
    rowsReturned: execResult.rowCount,
  };

  const assistantMessage = await prisma.message.create({
    data: {
      conversationId,
      role: 'assistant',
      content: parsed.explanation || narrative.summary,
      generatedSql: validation.sanitizedSql,
      queryResults: safeBigIntStringify(execResult.rows.slice(0, 500)),
      resultMetadata: JSON.stringify({
        rowCount: execResult.rowCount,
        executionTimeMs: execResult.executionTimeMs,
        costEstimate: execResult.costEstimate,
        columns: execResult.columns,
        cached: execResult.cached,
      }),
      chartType,
      narrativeSummary: narrative.summary,
      confidenceScore: narrative.confidence,
      lineage: JSON.stringify(lineage),
      connectionId: dbConnectionId,
      aiModel: aiResponse.model,
      executionTimeMs: execResult.executionTimeMs,
      rowCount: execResult.rowCount,
      costEstimate: execResult.costEstimate,
    },
  });

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { title: true },
  });
  if (!conversation?.title) {
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
