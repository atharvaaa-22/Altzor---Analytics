import { api } from '../../../lib/api';
import type { SemanticSchema } from '../types';

export const semanticApi = {
  getSchema: (connectionId: string): Promise<SemanticSchema> =>
    api.get<SemanticSchema>(`/connections/${connectionId}/schema`),

  syncSchema: (connectionId: string): Promise<unknown> =>
    api.post(`/connections/${connectionId}/sync`),

  updateTable: (
    tableId: string,
    data: { alias?: string; description?: string; isVisible?: boolean },
  ): Promise<unknown> => api.patch(`/schema/tables/${tableId}`, data),

  updateColumn: (
    columnId: string,
    data: { alias?: string; description?: string; isVisible?: boolean },
  ): Promise<unknown> => api.patch(`/schema/columns/${columnId}`, data),
};
