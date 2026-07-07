import type { ConnectionType, SchemaTable } from '../connectors/connectionFactory.js';
import { chunkSchema, formatSchemaForPrompt } from '../connectors/schemaCache.js';
import { formatSemanticForPrompt, type SemanticLayer } from '../semantic/semantic.service.js';
import type { AiMessage } from './aiClient.js';

const DIALECT_INSTRUCTIONS: Record<ConnectionType, string> = {
  POSTGRESQL: `Generate PostgreSQL-compatible SQL. Use double quotes for identifiers. Use DATE_TRUNC, EXTRACT, and :: for type casting. Use ILIKE for case-insensitive matching.`,
  MYSQL: `Generate MySQL 8.0-compatible SQL. Use backticks for identifiers. Use DATE_FORMAT, STR_TO_DATE. Use LIMIT syntax without OFFSET when not paginating.`,
  MSSQL: `Generate T-SQL compatible with SQL Server 2019+. Use square brackets for identifiers. Use TOP instead of LIMIT. Use CONVERT/CAST for type conversion. Use DATEPART, DATEDIFF for date operations.`,
  SNOWFLAKE: `Generate Snowflake SQL. Use double quotes for case-sensitive identifiers. Use Snowflake-specific functions like FLATTEN, PARSE_JSON, TRY_CAST. Use DATE_TRUNC for date operations.`,
  BIGQUERY: `Generate Google BigQuery SQL (Standard SQL). Use backtick-quoted project.dataset.table format. Use TIMESTAMP_TRUNC, DATE_TRUNC. Use UNNEST for arrays. Use SAFE_CAST for safe type conversion.`,
  MONGODB: `Generate a MongoDB aggregation pipeline as a JSON array. Use $match, $group, $sort, $project, $limit stages. Return valid JSON that can be parsed with JSON.parse().`,
  SQLITE: `Generate SQLite-compatible SQL. Use double quotes for identifiers. Use strftime() or date() for date and time grouping/manipulation. SQLite does not support DATE_TRUNC or complex PostgreSQL casting.`,
};

export function buildSystemPrompt(
  dialect: ConnectionType,
  schemaTables: SchemaTable[],
  semanticLayer: SemanticLayer,
): string {
  const schemaChunks = chunkSchema(schemaTables);
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

export function buildMessages(
  conversationHistory: Array<{ role: string; content: string }>,
  currentQuestion: string,
): AiMessage[] {
  const history = conversationHistory.slice(-20).map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));

  history.push({
    role: 'user',
    content: currentQuestion,
  });

  return history;
}

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
  let jsonStr = raw.trim();

  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1]!.trim();
  }

  try {
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
    return {
      sql: (parsed['sql'] as string) ?? '',
      explanation: (parsed['explanation'] as string) ?? '',
      confidence: (parsed['confidence'] as number) ?? 0.5,
      tablesUsed: (parsed['tables_used'] as string[]) ?? [],
      columnsUsed: (parsed['columns_used'] as string[]) ?? [],
      aggregations: (parsed['aggregations'] as string[]) ?? [],
      filters: (parsed['filters'] as string[]) ?? [],
      assumptions: (parsed['assumptions'] as string[]) ?? [],
    };
  } catch {
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
