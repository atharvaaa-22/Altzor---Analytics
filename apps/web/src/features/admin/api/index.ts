import { api } from '../../../lib/api';
import type { SystemHealth, QueueStats } from '../types';

export const adminApi = {
  getHealth: (): Promise<SystemHealth> => api.get<SystemHealth>('/health'),
  getQueues: (): Promise<QueueStats[]> => api.get<QueueStats[]>('/admin/queues'),
  pauseQueue: (queueName: string): Promise<unknown> => api.post(`/admin/queues/${queueName}/pause`),
  resumeQueue: (queueName: string): Promise<unknown> =>
    api.post(`/admin/queues/${queueName}/resume`),
};
