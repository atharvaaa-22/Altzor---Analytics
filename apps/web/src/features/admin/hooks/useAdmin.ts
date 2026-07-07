import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';
import { adminApi } from '../api';
import type { SystemHealth, QueueStats } from '../types';

export function useAdmin(): {
  health: SystemHealth | undefined;
  isLoadingHealth: boolean;
  queues: QueueStats[];
  isLoadingQueues: boolean;
  pauseQueue: UseMutationResult<unknown, Error, string, unknown>;
  resumeQueue: UseMutationResult<unknown, Error, string, unknown>;
} {
  const queryClient = useQueryClient();

  const { data: health, isLoading: isLoadingHealth } = useQuery({
    queryKey: ['system-health'],
    queryFn: adminApi.getHealth,
    refetchInterval: 10000,
  });

  const { data: queues = [], isLoading: isLoadingQueues } = useQuery({
    queryKey: ['system-queues'],
    queryFn: adminApi.getQueues,
    refetchInterval: 5000,
  });

  const pauseQueue = useMutation({
    mutationFn: adminApi.pauseQueue,
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: ['system-queues'] });
    },
  });

  const resumeQueue = useMutation({
    mutationFn: adminApi.resumeQueue,
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: ['system-queues'] });
    },
  });

  return {
    health,
    isLoadingHealth,
    queues,
    isLoadingQueues,
    pauseQueue,
    resumeQueue,
  };
}
