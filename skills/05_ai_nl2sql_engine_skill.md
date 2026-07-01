# Skill File 05 — AI NL2SQL Engine (Gemini)

## Overview
Implement the core AI engine: natural language to SQL translation using Google Gemini as the primary LLM, dynamic prompt construction with schema + semantic layer + conversation history, SQL validation pipeline with safety checks, and AI-generated narrative summaries with confidence scoring.

**BRD References:** AI-NLP-001–006, REQ-CQI-005–011, NFR-AVAIL-002–003, AI-AGENT-001–004

---

## 1. AI Client — `apps/api/src/services/ai/aiClient.ts`

```typescript
/**
 * aiClient.ts — Gemini AI client with circuit breaker.
 *
 * REQ-CQI-005: Gemini as the primary LLM provider.
 * NFR-AVAIL-003: Circuit breaker on external API calls.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../../config/env.js';
import { CircuitBreaker } from '../../utils/circuitBreaker.js';

// ─── Types ─────────────────────────────────────────────────────────
export interface AiMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AiResponse {
  content: string;
  model: string;
  tokensUsed?: number;
  latencyMs: number;
}

// ─── Gemini Client ─────────────────────────────────────────────────
const genAi = new GoogleGenerativeAI(env.GOOGLE_GENAI_API_KEY);

const geminiBreaker = new CircuitBreaker({
  failureThreshold: 3,
  resetTimeMs: 60_000,
  name: 'gemini-api',
});

/**
 * Send messages to Gemini with circuit breaker protection.
 *
 * Strategy:
 *   1. Try Gemini via circuit breaker
 *   2. If circuit is open or call fails → throw with user-friendly error
 */
export async function callAi(
  systemPrompt: string,
  messages: AiMessage[],
): Promise<AiResponse> {
  try {
    const result = await geminiBreaker.execute(() => callGemini(systemPrompt, messages));
    return result;
  } catch (error) {
    console.error('[AI] Gemini call failed:', (error as Error).message);
    throw new Error(
      'AI service is temporarily unavailable. Please try again in a few moments.',
    );
  }
}

// ─── Gemini Implementation ─────────────────────────────────────────
async function callGemini(
  systemPrompt: string,
  messages: AiMessage[],
): Promise<AiResponse> {
  const start = Date.now();

  const model = genAi.getGenerativeModel({
    model: env.GEMINI_MODEL,
    systemInstruction: systemPrompt,
  });

  // Convert messages to Gemini format
  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const chat = model.startChat({ history });
  const lastMessage = messages[messages.length - 1];
  const result = await chat.sendMessage(lastMessage?.content ?? '');

  const response = result.response;
  const usage = response.usageMetadata;

  return {
    content: response.text(),
    model: env.GEMINI_MODEL,
    tokensUsed: usage
      ? (usage.promptTokenCount ?? 0) + (usage.candidatesTokenCount ?? 0)
      : undefined,
    latencyMs: Date.now() - start,
  };
}
```

---

## 2. Circuit Breaker — `apps/api/src/utils/circuitBreaker.ts`

```typescript
/**
 * circuitBreaker.ts — Circuit breaker pattern for external API calls.
 *
 * NFR-AVAIL-003: Prevent cascading failures on Gemini, email, Slack.
 */

interface CircuitBreakerOptions {
  failureThreshold: number; // Open circuit after N failures
  resetTimeMs: number;      // Try again after this many ms
  name: string;
}

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime = 0;
  private readonly options: CircuitBreakerOptions;

  constructor(options: CircuitBreakerOptions) {
    this.options = options;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.options.resetTimeMs) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error(`Circuit breaker [${this.options.name}] is OPEN`);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.options.failureThreshold) {
      this.state = 'OPEN';
      console.warn(`[CircuitBreaker] ${this.options.name} → OPEN after ${this.failureCount} failures`);
    }
  }
}
```

---

## 3. Prompt Builder — `apps/api/src/services/ai/promptBuilder.ts`

```typescript
/**
 * promptBuilder.ts — Dynamic LLM prompt construction.
 *
 * AI-NLP-004: Prompt includes system instructions, chunked schema,
 * conversation history (last 20), semantic metrics/dimensions, and dialect.
 */

import { ConnectionType } from '@prisma/client';
import { chunkSchema, formatSchemaForPrompt, type SchemaTable } from '../connectors/schemaCache.js';
import { formatSemanticForPrompt, type SemanticLayer } from '../semantic/semantic.service.js';
import type { AiMessage } from './aiClient.js';

// ─── Dialect Instructions ──────────────────────────────────────────
const DIALECT_INSTRUCTIONS: Record<ConnectionType, string> = {
  POSTGRESQL: `Generate PostgreSQL-compatible SQL. Use double quotes for identifiers. Use DATE_TRUNC, EXTRACT, and :: for type casting. Use ILIKE for case-insensitive matching.`,
  MYSQL: `Generate MySQL 8.0-compatible SQL. Use backticks for identifiers. Use DATE_FORMAT, STR_TO_DATE. Use LIMIT syntax without OFFSET when not paginating.`,
  MSSQL: `Generate T-SQL compatible with SQL Server 2019+. Use square brackets for identifiers. Use TOP instead of LIMIT. Use CONVERT/CAST for type conversion. Use DATEPART, DATEDIFF for date operations.`,
  SNOWFLAKE: `Generate Snowflake SQL. Use double quotes for case-sensitive identifiers. Use Snowflake-specific functions like FLATTEN, PARSE_JSON, TRY_CAST. Use DATE_TRUNC for date operations.`,
  BIGQUERY: `Generate Google BigQuery SQL (Standard SQL). Use backtick-quoted project.dataset.table format. Use TIMESTAMP_TRUNC, DATE_TRUNC. Use UNNEST for arrays. Use SAFE_CAST for safe type conversion.`,
  MONGODB: `Generate a MongoDB aggregation pipeline as a JSON array. Use $match, $group, $sort, $project, $limit stages. Return valid JSON that can be parsed with JSON.parse().`,
};

// ─── System Prompt ─────────────────────────────────────────────────
export function buildSystemPrompt(
  dialect: ConnectionType,
  schemaTables: SchemaTable[],
  semanticLayer: SemanticLayer,
): string {
  const schemaChunks = chunkSchema(schemaTables);
  // For now, use the first chunk. In production, select the most relevant chunk
  // based on the user's query using keyword matching or embedding similarity.
  const schemaText = formatSchemaForPrompt(schemaChunks[0] ?? []);
  const semanticText = formatSemanticForPrompt(semanticLayer);

  return `You are an expert SQL analyst and data scientist. Your job is to translate natural language questions into precise, efficient SQL queries.

## Rules
1. Generate ONLY the SQL query — no explanations, no markdown code fences.
2. Always include a LIMIT clause (default 1000) unless the user explicitly asks for all rows.
3. NEVER generate INSERT, UPDATE, DELETE, DROP, TRUNCATE, or ALTER statements.
4. If the question is ambiguous, generate the most reasonable interpretation and note your assumptions.
5. Use table aliases for readability.
6. Include comments for complex logic.
7. When calculating percentages or ratios, handle division by zero.
8. For date/time operations, use the correct dialect-specific functions.

## Database Dialect
${DIALECT_INSTRUCTIONS[dialect]}

## Available Schema
${schemaText}

${semanticText}

## Response Format
Respond with ONLY a JSON object:
{
  "sql": "YOUR SQL QUERY HERE",
  "explanation": "Brief 1-sentence description of what this query does",
  "confidence": 0.95,
  "tables_used": ["table1", "table2"],
  "columns_used": ["col1", "col2"],
  "aggregations": ["SUM", "COUNT"],
  "filters": ["date >= '2024-01-01'"],
  "assumptions": ["Assumed 'revenue' refers to order_total column"]
}`;
}

// ─── Build Messages ────────────────────────────────────────────────
/**
 * Build message array from conversation history.
 * REQ-CQI-002: Last 20 messages sent to LLM for context.
 */
export function buildMessages(
  conversationHistory: Array<{ role: string; content: string }>,
  currentQuestion: string,
): AiMessage[] {
  // Take last 20 messages (REQ-CQI-002)
  const history = conversationHistory
    .slice(-20)
    .map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

  // Append current question
  history.push({
    role: 'user',
    content: currentQuestion,
  });

  return history;
}

// ─── Parse AI Response ─────────────────────────────────────────────
export interface ParsedAiResponse {
  sql: string;
  explanation: string;
  confidence: number;
  tablesUsed: string[];
  columnsUsed: string[];
  aggregations: string[];
  filters: string[];
  assumptions: string[];
}

export function parseAiResponse(raw: string): ParsedAiResponse {
  // Try to extract JSON from response (may be wrapped in markdown code fences)
  let jsonStr = raw.trim();

  // Strip markdown code fences if present
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1]!.trim();
  }

  try {
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
    return {
      sql: (parsed.sql as string) ?? '',
      explanation: (parsed.explanation as string) ?? '',
      confidence: (parsed.confidence as number) ?? 0.5,
      tablesUsed: (parsed.tables_used as string[]) ?? [],
      columnsUsed: (parsed.columns_used as string[]) ?? [],
      aggregations: (parsed.aggregations as string[]) ?? [],
      filters: (parsed.filters as string[]) ?? [],
      assumptions: (parsed.assumptions as string[]) ?? [],
    };
  } catch {
    // If JSON parsing fails, assume the raw response is just SQL
    return {
      sql: raw.trim(),
      explanation: '',
      confidence: 0.5,
      tablesUsed: [],
      columnsUsed: [],
      aggregations: [],
      filters: [],
      assumptions: [],
    };
  }
}
```

---

## 4. SQL Validation Pipeline — `apps/api/src/services/ai/sqlValidator.ts`

```typescript
/**
 * sqlValidator.ts — Multi-stage SQL validation pipeline.
 *
 * AI-NLP-005: Syntax check, safety check, injection detection, performance guardrails.
 * REQ-CQI-007: Full validation before execution.
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedSql: string;
}

// ─── Forbidden Keywords ────────────────────────────────────────────
const DML_DDL_KEYWORDS = [
  'INSERT', 'UPDATE', 'DELETE', 'DROP', 'TRUNCATE', 'ALTER',
  'CREATE', 'GRANT', 'REVOKE', 'EXEC', 'EXECUTE', 'CALL',
  'MERGE', 'REPLACE', 'LOAD', 'COPY',
];

// ─── SQL Injection Patterns ────────────────────────────────────────
const INJECTION_PATTERNS = [
  /;\s*(DROP|DELETE|INSERT|UPDATE|ALTER|CREATE|TRUNCATE)/i,
  /UNION\s+ALL\s+SELECT.*FROM\s+information_schema/i,
  /\/\*[\s\S]*?\*\//,    // Block comments (potential obfuscation)
  /xp_cmdshell/i,
  /WAITFOR\s+DELAY/i,
  /BENCHMARK\s*\(/i,
  /SLEEP\s*\(/i,
  /INTO\s+OUTFILE/i,
  /LOAD_FILE\s*\(/i,
];

/**
 * Run the full SQL validation pipeline.
 */
export function validateSql(sql: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let sanitized = sql.trim();

  // ── Step 1: Basic Syntax Check ───────────────────────────────────
  if (!sanitized || sanitized.length === 0) {
    errors.push('Empty SQL query');
    return { isValid: false, errors, warnings, sanitizedSql: sanitized };
  }

  // Remove trailing semicolons (prevent multi-statement)
  sanitized = sanitized.replace(/;\s*$/, '');

  // Check for multiple statements (semicolons in middle)
  if (sanitized.includes(';')) {
    errors.push('Multiple SQL statements are not allowed');
  }

  // ── Step 2: Safety Check (No DML/DDL) ────────────────────────────
  const upperSql = sanitized.toUpperCase().trim();
  for (const keyword of DML_DDL_KEYWORDS) {
    // Check if the statement STARTS with a dangerous keyword
    if (upperSql.startsWith(keyword + ' ') || upperSql.startsWith(keyword + '\n')) {
      errors.push(`${keyword} operations are not allowed. Only SELECT queries are permitted.`);
    }
  }

  // Also check for dangerous keywords in subqueries/CTEs
  const dangerousInBody = DML_DDL_KEYWORDS.filter((kw) => {
    // Match keyword when it appears as a standalone word (not part of column name)
    const regex = new RegExp(`\\b${kw}\\b`, 'i');
    return regex.test(sanitized) && !upperSql.startsWith('SELECT') && !upperSql.startsWith('WITH');
  });

  if (dangerousInBody.length > 0 && upperSql.startsWith('SELECT')) {
    // If it starts with SELECT but contains DDL keywords, warn
    warnings.push(`Query contains potentially dangerous keywords: ${dangerousInBody.join(', ')}`);
  }

  // ── Step 3: SQL Injection Detection ──────────────────────────────
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(sanitized)) {
      errors.push('Potential SQL injection pattern detected');
      break;
    }
  }

  // ── Step 4: Performance Guardrails ───────────────────────────────
  // Check for LIMIT clause
  if (!(/\bLIMIT\b/i.test(sanitized)) && !(/\bTOP\b/i.test(sanitized))) {
    // Auto-append LIMIT 1000 for safety
    sanitized += ' LIMIT 1000';
    warnings.push('LIMIT 1000 automatically applied for performance safety');
  }

  // Check for SELECT * (discouraged for large tables)
  if (/SELECT\s+\*/i.test(sanitized)) {
    warnings.push('SELECT * may return excessive columns. Consider specifying needed columns.');
  }

  // Check for missing WHERE clause on large operations
  if (/\bFROM\b/i.test(sanitized) && !/\bWHERE\b/i.test(sanitized) && !/\bLIMIT\s+\d/i.test(sanitized)) {
    warnings.push('No WHERE clause detected. Results may be very large.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    sanitizedSql: sanitized,
  };
}
```

---

## 5. Narrative Summary Generator — `apps/api/src/services/ai/narrativeGenerator.ts`

```typescript
/**
 * narrativeGenerator.ts — AI-generated narrative summaries for query results.
 *
 * REQ-DVI-004: 1–3 sentence summary highlighting key trends and anomalies.
 * REQ-DVI-006: Confidence score for each insight.
 */

import { callAi } from './aiClient.js';

export interface NarrativeSummary {
  summary: string;
  confidence: number;
  keyFindings: string[];
}

export async function generateNarrative(
  question: string,
  sql: string,
  results: Record<string, unknown>[],
  columnTypes: Array<{ name: string; dataType: string }>,
): Promise<NarrativeSummary> {
  // Limit results to prevent token overflow
  const sampleRows = results.slice(0, 50);
  const rowCount = results.length;

  const systemPrompt = `You are a data insights analyst. Given a question, the SQL query used, and the result data, generate a concise narrative summary.

Rules:
1. Write 1-3 sentences highlighting key trends, patterns, and anomalies.
2. Include specific numbers and percentages when relevant.
3. Flag any surprising findings.
4. Provide a confidence score (0.0 to 1.0) based on data completeness and query accuracy.
5. List 1-3 key findings as bullet points.

Respond ONLY with JSON:
{
  "summary": "Your narrative summary here",
  "confidence": 0.85,
  "key_findings": ["Finding 1", "Finding 2"]
}`;

  const message = `Question: ${question}

SQL: ${sql}

Result Info:
- Total rows: ${rowCount}
- Columns: ${columnTypes.map((c) => `${c.name} (${c.dataType})`).join(', ')}
- Sample data (first ${sampleRows.length} rows):
${JSON.stringify(sampleRows, null, 2)}`;

  const response = await callAi(systemPrompt, [{ role: 'user', content: message }]);

  try {
    let jsonStr = response.content.trim();
    const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) jsonStr = match[1]!.trim();

    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
    return {
      summary: (parsed.summary as string) ?? 'No summary available.',
      confidence: (parsed.confidence as number) ?? 0.5,
      keyFindings: (parsed.key_findings as string[]) ?? [],
    };
  } catch {
    return {
      summary: response.content.slice(0, 500),
      confidence: 0.3,
      keyFindings: [],
    };
  }
}
```

---

## 6. Chart Type Detector — `apps/api/src/services/ai/chartDetector.ts`

```typescript
/**
 * chartDetector.ts — Auto-detect optimal chart type from result shape.
 *
 * REQ-DVI-001: Auto-detect result shapes → KPI, bar, line, pie, scatter, etc.
 */

import { ChartType } from '@prisma/client';

interface ColumnInfo {
  name: string;
  dataType: string;
}

/**
 * Detect optimal chart type based on result shape.
 */
export function detectChartType(
  columns: ColumnInfo[],
  rowCount: number,
): ChartType {
  // Single value → KPI card
  if (rowCount === 1 && columns.length === 1) {
    return ChartType.KPI;
  }

  // Single row, multiple numeric columns → KPI or table
  if (rowCount === 1 && columns.length <= 5) {
    return ChartType.KPI;
  }

  const numericCols = columns.filter((c) =>
    ['integer', 'bigint', 'decimal', 'numeric', 'float', 'double', 'real', 'money', 'number']
      .some((t) => c.dataType.toLowerCase().includes(t)),
  );

  const dateCols = columns.filter((c) =>
    ['date', 'timestamp', 'datetime', 'time']
      .some((t) => c.dataType.toLowerCase().includes(t)),
  );

  const categoryCols = columns.filter((c) =>
    !numericCols.includes(c) && !dateCols.includes(c),
  );

  // Time series: date column + numeric column(s) → line chart
  if (dateCols.length >= 1 && numericCols.length >= 1) {
    return ChartType.LINE;
  }

  // Category + single numeric → bar chart
  if (categoryCols.length === 1 && numericCols.length === 1) {
    if (rowCount <= 8) return ChartType.PIE;
    return ChartType.BAR;
  }

  // Category + multiple numerics → grouped bar
  if (categoryCols.length >= 1 && numericCols.length >= 2) {
    return ChartType.BAR;
  }

  // Two numeric columns → scatter
  if (numericCols.length === 2 && categoryCols.length === 0) {
    return ChartType.SCATTER;
  }

  // Matrix-like (2 categories + 1 numeric) → heatmap
  if (categoryCols.length === 2 && numericCols.length === 1) {
    return ChartType.HEATMAP;
  }

  // Many columns or rows → table
  if (columns.length > 6 || rowCount > 100) {
    return ChartType.TABLE;
  }

  // Default
  return ChartType.TABLE;
}
```

---

## 7. Verification Checklist

| Step | Action | Expected |
|------|--------|----------|
| Gemini call works | `callAi()` with test prompt | Response with `model: gemini-2.5-flash` |
| Circuit breaker | 3 rapid Gemini failures | Circuit opens, returns error |
| Prompt built | `buildSystemPrompt()` | Contains schema + semantic + dialect |
| SQL validated | `validateSql("DROP TABLE users")` | `isValid: false`, DDL blocked |
| LIMIT enforced | `validateSql("SELECT * FROM t")` | LIMIT 1000 auto-appended |
| Injection blocked | SQL with `; DROP TABLE` | Injection pattern detected |
| Narrative generated | `generateNarrative()` with results | 1-3 sentence summary + confidence |
| Chart detected | Single value result | `KPI` chart type |
| Token usage | Check response object | `tokensUsed` populated from Gemini |

---

## Next Skill → `06_query_execution_skill.md`
