export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  durationMs?: number;
}

export interface SavedQuery {
  id: string;
  name: string;
  sql: string;
  connectionId: string;
}

export interface ExplainResult {
  markdown: string;
}
