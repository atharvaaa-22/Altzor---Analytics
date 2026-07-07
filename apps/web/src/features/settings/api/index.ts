import { api } from '../../../lib/api';
import type { OrgUser, ApiKey, AuditLog, UserRole } from '../types';

export const organizationApi = {
  getUsers: (): Promise<OrgUser[]> => api.get<OrgUser[]>('/orgs/users'),
  inviteUser: (data: { email: string; role: UserRole }): Promise<{ success: boolean }> =>
    api.post<{ success: boolean }>('/orgs/invites', data),
  removeUser: (id: string): Promise<unknown> => api.delete(`/orgs/users/${id}`),

  getApiKeys: (): Promise<ApiKey[]> => api.get<ApiKey[]>('/orgs/apikeys'),
  generateApiKey: (data: { name: string }): Promise<{ key: string } & ApiKey> =>
    api.post<{ key: string } & ApiKey>('/orgs/apikeys', data),
  revokeApiKey: (id: string): Promise<unknown> => api.delete(`/orgs/apikeys/${id}`),

  getAuditLogs: (): Promise<AuditLog[]> => api.get<AuditLog[]>('/orgs/audit-logs'),
};
