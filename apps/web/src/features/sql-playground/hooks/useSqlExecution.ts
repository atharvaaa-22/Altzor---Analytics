import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';
import { sqlApi } from '../api';
import type { QueryResult, SavedQuery, ExplainResult } from '../types';

export function useSqlExecution(): {
  executeQuery: UseMutationResult<
    QueryResult,
    Error,
    { sql: string; connectionId: string },
    unknown
  >;
  explainQuery: UseMutationResult<ExplainResult, Error, { sql: string }, unknown>;
  saveQuery: UseMutationResult<SavedQuery, Error, Omit<SavedQuery, 'id'>, unknown>;
  savedQueries: SavedQuery[];
  isLoadingSaved: boolean;
} {
  const queryClient = useQueryClient();

  const executeQuery = useMutation({
    mutationFn: sqlApi.execute,
  });

  const explainQuery = useMutation({
    mutationFn: sqlApi.explain,
  });

  const saveQuery = useMutation({
    mutationFn: sqlApi.saveQuery,
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: ['saved-queries'] });
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
