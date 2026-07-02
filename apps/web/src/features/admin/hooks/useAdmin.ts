import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../api';

export function useAdmin() {
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['system-queues'] }),
  });

  const resumeQueue = useMutation({
    mutationFn: adminApi.resumeQueue,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['system-queues'] }),
  });

  return {
    health, isLoadingHealth,
    queues, isLoadingQueues,
    pauseQueue, resumeQueue,
  };
}
