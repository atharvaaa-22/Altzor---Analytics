import { api } from '../../../lib/api';
import type { SemanticSchema } from '../types';

export const semanticApi = {
  getSchema: (connectionId: string) =>
    api.get<SemanticSchema>(`/connections/${connectionId}/schema`),

  syncSchema: (connectionId: string) =>
    api.post(`/connections/${connectionId}/sync`),

  updateTable: (
    tableId: string,
    data: { alias?: string; description?: string; isVisible?: boolean }
  ) => api.patch(`/schema/tables/${tableId}`, data),

  updateColumn: (
    columnId: string,
    data: { alias?: string; description?: string; isVisible?: boolean }
  ) => api.patch(`/schema/columns/${columnId}`, data),
};
