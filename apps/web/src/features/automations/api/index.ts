import { api } from '../../../lib/api';
import type { ReportSchedule, AlertRule, AutomationLog } from '../types';

export const automationsApi = {
  createReport: (data: Omit<ReportSchedule, 'id'>): Promise<ReportSchedule> =>
    api.post<ReportSchedule>('/reports', data),

  createAlert: (data: Omit<AlertRule, 'id'>): Promise<AlertRule> =>
    api.post<AlertRule>('/alerts', data),

  getHistoryLogs: (): Promise<AutomationLog[]> => api.get<AutomationLog[]>('/automations/history'),
};
