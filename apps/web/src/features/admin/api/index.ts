import { api } from '../../../lib/api';
import type { SystemHealth, QueueStats } from '../types';

export const adminApi = {
  getHealth: () => api.get<SystemHealth>('/health'),
  getQueues: () => api.get<QueueStats[]>('/admin/queues'),
  pauseQueue: (queueName: string) => api.post(`/admin/queues/${queueName}/pause`),
  resumeQueue: (queueName: string) => api.post(`/admin/queues/${queueName}/resume`),
};
