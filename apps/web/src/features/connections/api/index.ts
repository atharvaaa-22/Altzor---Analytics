import { api } from '../../../lib/api';
import type { Connection, ConnectionFormData, ConnectionType } from '../types';

export const connectionsApi = {
  getConnections: () => api.get<Connection[]>('/connections'),
  
  createConnection: (data: ConnectionFormData) => 
    api.post<Connection>('/connections', data),
    
  testConnection: (data: { type: ConnectionType; config: Record<string, any> }) =>
    api.post<{ success: boolean; message?: string }>('/connections/test', data),
    
  deleteConnection: (id: string) => 
    api.delete(`/connections/${id}`),
};
