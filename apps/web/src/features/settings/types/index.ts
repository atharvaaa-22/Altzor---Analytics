export type UserRole = 'ADMIN' | 'EDITOR' | 'VIEWER';

export interface OrgUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  joinedAt: string;
}

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt?: string;
}

export interface AuditLog {
  id: string;
  action: string;
  actorEmail: string;
  timestamp: string;
  metadata?: Record<string, any>;
}
