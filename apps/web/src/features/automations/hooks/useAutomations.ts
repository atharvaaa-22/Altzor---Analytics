import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { automationsApi } from '../api';

export function useAutomations() {
  const queryClient = useQueryClient();

  const createReport = useMutation({
    mutationFn: automationsApi.createReport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });

  const createAlert = useMutation({
    mutationFn: automationsApi.createAlert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });

  const { data: historyLogs = [], isLoading: isLoadingLogs } = useQuery({
    queryKey: ['automation-logs'],
    queryFn: automationsApi.getHistoryLogs,
  });

  return {
    createReport,
    createAlert,
    historyLogs,
    isLoadingLogs,
  };
}
