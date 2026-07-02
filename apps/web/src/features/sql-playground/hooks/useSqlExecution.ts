import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sqlApi } from '../api';

export function useSqlExecution() {
  const queryClient = useQueryClient();

  const executeQuery = useMutation({
    mutationFn: sqlApi.execute,
  });

  const explainQuery = useMutation({
    mutationFn: sqlApi.explain,
  });

  const saveQuery = useMutation({
    mutationFn: sqlApi.saveQuery,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-queries'] });
    },
  });

  const { data: savedQueries = [], isLoading: isLoadingSaved } = useQuery({
    queryKey: ['saved-queries'],
    queryFn: sqlApi.getSavedQueries,
  });

  return {
    executeQuery,
    explainQuery,
    saveQuery,
    savedQueries,
    isLoadingSaved,
  };
}
