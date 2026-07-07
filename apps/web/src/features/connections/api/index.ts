import { api } from '../../../lib/api';
import type { Connection, ConnectionFormData, ConnectionType } from '../types';

export const connectionsApi = {
  getConnections: (): Promise<Connection[]> => api.get<Connection[]>('/connections'),

  createConnection: (data: ConnectionFormData): Promise<Connection> =>
    api.post<Connection>('/connections', data),

  testConnection: (data: {
    type: ConnectionType;
    config: Record<string, unknown>;
  }): Promise<{ success: boolean; message?: string }> =>
    api.post<{ success: boolean; message?: string }>('/connections/test', data),

  deleteConnection: (id: string): Promise<unknown> => api.delete(`/connections/${id}`),
};
