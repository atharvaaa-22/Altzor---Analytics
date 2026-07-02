import { api } from '../../../lib/api';
import type { ReportSchedule, AlertRule, AutomationLog } from '../types';

export const automationsApi = {
  createReport: (data: Omit<ReportSchedule, 'id'>) =>
    api.post<ReportSchedule>('/reports', data),
    
  createAlert: (data: Omit<AlertRule, 'id'>) =>
    api.post<AlertRule>('/alerts', data),

  getHistoryLogs: () =>
    api.get<AutomationLog[]>('/automations/history'),
};
