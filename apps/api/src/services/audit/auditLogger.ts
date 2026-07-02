import { prisma } from '../../config/db.js';

export interface AuditEntry {
  action: string;
  userId?: string;
  organizationId: string;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export function logAudit(entry: AuditEntry): void {
  const data = {
    ...entry,
    details: entry.details ? JSON.stringify(entry.details) : undefined,
  };

  void prisma.auditLog.create({ data }).catch((err) => {
    console.error('[Audit] Failed to log:', err);
  });
}

export const AuditActions = {
  QUERY_EXECUTED: 'query_executed',
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  USER_CREATED: 'user_created',
  USER_DELETED: 'user_deleted',
  CONNECTION_CREATED: 'connection_created',
  CONNECTION_DELETED: 'connection_deleted',
  DASHBOARD_CREATED: 'dashboard_created',
  DASHBOARD_SHARED: 'dashboard_shared',
  FILE_UPLOADED: 'file_uploaded',
  FILE_DELETED: 'file_deleted',
  METRIC_CREATED: 'metric_created',
  PASSWORD_CHANGED: 'password_changed',
  ROLE_CHANGED: 'role_changed',
} as const;
