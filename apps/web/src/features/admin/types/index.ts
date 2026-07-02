export interface SystemHealth {
  status: 'ok' | 'degraded' | 'down';
  redis: 'connected' | 'disconnected';
  db: 'connected' | 'disconnected';
  uptime: number;
}

export interface QueueStats {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  isPaused: boolean;
  throughput: number[];
}

export interface AppLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
}
