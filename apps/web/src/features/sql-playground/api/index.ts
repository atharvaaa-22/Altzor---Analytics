import { api } from '../../../lib/api';
import type { QueryResult, SavedQuery, ExplainResult } from '../types';

export const sqlApi = {
  execute: (data: { sql: string; connectionId: string }): Promise<QueryResult> =>
    api.post<QueryResult>('/query/execute', data),

  explain: (data: { sql: string }): Promise<ExplainResult> =>
    api.post<ExplainResult>('/query/explain', data),

  saveQuery: (data: Omit<SavedQuery, 'id'>): Promise<SavedQuery> =>
    api.post<SavedQuery>('/queries/saved', data),

  getSavedQueries: (): Promise<SavedQuery[]> => api.get<SavedQuery[]>('/queries/saved'),
};
