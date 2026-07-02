export type ReportFormat = 'PDF' | 'CSV';
export type AlertCondition = 'GREATER_THAN' | 'LESS_THAN' | 'EQUALS' | 'NOT_EQUALS';
export type Channel = 'EMAIL' | 'SLACK' | 'WEBHOOK';

export interface ReportSchedule {
  id: string;
  dashboardId: string;
  format: ReportFormat;
  cron: string;
  emails: string[];
}

export interface AlertRule {
  id: string;
  queryId: string;
  condition: AlertCondition;
  threshold: number;
  channels: Channel[];
  webhookUrl?: string;
  slackChannel?: string;
}

export interface AutomationLog {
  id: string;
  type: 'REPORT' | 'ALERT';
  targetId: string;
  status: 'SUCCESS' | 'FAILED';
  executedAt: string;
  error?: string;
}
