export interface QueryResult {
  columns: string[];
  rows: Record<string, any>[];
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
