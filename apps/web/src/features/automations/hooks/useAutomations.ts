import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';
import { automationsApi } from '../api';
import type { ReportSchedule, AlertRule, AutomationLog } from '../types';

export function useAutomations(): {
  createReport: UseMutationResult<ReportSchedule, Error, Omit<ReportSchedule, 'id'>, unknown>;
  createAlert: UseMutationResult<AlertRule, Error, Omit<AlertRule, 'id'>, unknown>;
  historyLogs: AutomationLog[];
  isLoadingLogs: boolean;
} {
  const queryClient = useQueryClient();

  const createReport = useMutation({
    mutationFn: automationsApi.createReport,
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });

  const createAlert = useMutation({
    mutationFn: automationsApi.createAlert,
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: ['alerts'] });
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
