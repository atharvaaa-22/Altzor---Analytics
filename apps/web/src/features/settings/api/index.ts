import { api } from '../../../lib/api';
import type { OrgUser, ApiKey, AuditLog, UserRole } from '../types';

export const organizationApi = {
  getUsers: () => api.get<OrgUser[]>('/orgs/users'),
  inviteUser: (data: { email: string; role: UserRole }) => api.post<{ success: boolean }>('/orgs/invites', data),
  removeUser: (id: string) => api.delete(`/orgs/users/${id}`),
  
  getApiKeys: () => api.get<ApiKey[]>('/orgs/apikeys'),
  generateApiKey: (data: { name: string }) => api.post<{ key: string } & ApiKey>('/orgs/apikeys', data),
  revokeApiKey: (id: string) => api.delete(`/orgs/apikeys/${id}`),
  
  getAuditLogs: () => api.get<AuditLog[]>('/orgs/audit-logs'),
};
