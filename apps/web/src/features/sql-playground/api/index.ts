import { api } from '../../../lib/api';
import type { QueryResult, SavedQuery, ExplainResult } from '../types';

export const sqlApi = {
  execute: (data: { sql: string; connectionId: string }) =>
    api.post<QueryResult>('/query/execute', data),
    
  explain: (data: { sql: string }) =>
    api.post<ExplainResult>('/query/explain', data),
    
  saveQuery: (data: Omit<SavedQuery, 'id'>) =>
    api.post<SavedQuery>('/queries/saved', data),
    
  getSavedQueries: () =>
    api.get<SavedQuery[]>('/queries/saved'),
};
