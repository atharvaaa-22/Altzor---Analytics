import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';
import { semanticApi } from '../api';
import { useSemanticStore } from '../stores/semanticStore';
import type { SemanticSchema, SemanticTable, SemanticColumn } from '../types';

export const useSemanticSchema = (
  connectionId: string,
): {
  schema: SemanticSchema | undefined;
  isLoading: boolean;
  error: Error | null;
  updateTable: UseMutationResult<
    unknown,
    Error,
    { tableId: string; data: Partial<SemanticTable> },
    { previousSchema: SemanticSchema | undefined }
  >['mutate'];
  updateColumn: UseMutationResult<
    unknown,
    Error,
    { columnId: string; data: Partial<SemanticColumn> },
    { previousSchema: SemanticSchema | undefined }
  >['mutate'];
  syncSchema: UseMutationResult<unknown, Error, void, unknown>['mutate'];
  isSyncing: boolean;
} => {
  const queryClient = useQueryClient();
  const queryKey = ['semantic-schema', connectionId];
  const isSyncing = useSemanticStore((state) => state.isSyncing);

  const {
    data: schema,
    isLoading,
    error,
  } = useQuery<SemanticSchema>({
    queryKey,
    queryFn: () => semanticApi.getSchema(connectionId),
    enabled: !!connectionId,
  });

  const updateTable = useMutation({
    mutationFn: ({ tableId, data }: { tableId: string; data: Partial<SemanticTable> }) =>
      semanticApi.updateTable(tableId, data),
    onMutate: async ({ tableId, data }) => {
      await queryClient.cancelQueries({ queryKey });
      const previousSchema = queryClient.getQueryData<SemanticSchema>(queryKey);

      if (previousSchema) {
        queryClient.setQueryData<SemanticSchema>(queryKey, {
          ...previousSchema,
          tables: previousSchema.tables.map((table) =>
            table.id === tableId ? { ...table, ...data } : table,
          ),
        });
      }

      return { previousSchema };
    },
    onError: (_err, _newTodo, context) => {
      if (context?.previousSchema) {
        queryClient.setQueryData(queryKey, context.previousSchema);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  const updateColumn = useMutation({
    mutationFn: ({ columnId, data }: { columnId: string; data: Partial<SemanticColumn> }) =>
      semanticApi.updateColumn(columnId, data),
    onMutate: async ({ columnId, data }) => {
      await queryClient.cancelQueries({ queryKey });
      const previousSchema = queryClient.getQueryData<SemanticSchema>(queryKey);

      if (previousSchema) {
        queryClient.setQueryData<SemanticSchema>(queryKey, {
          ...previousSchema,
          tables: previousSchema.tables.map((table) => ({
            ...table,
            columns: table.columns.map((col) => (col.id === columnId ? { ...col, ...data } : col)),
          })),
        });
      }

      return { previousSchema };
    },
    onError: (_err, _newTodo, context) => {
      if (context?.previousSchema) {
        queryClient.setQueryData(queryKey, context.previousSchema);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  const syncSchema = useMutation({
    mutationFn: () => semanticApi.syncSchema(connectionId),
    onMutate: () => {
      useSemanticStore.getState().setIsSyncing(true);
    },
    onSettled: () => {
      // In a real app, you might wait for a WebSocket or polling to finish
      // For now we'll just invalidate after a delay or immediately
      setTimeout(() => {
        useSemanticStore.getState().setIsSyncing(false);
        void queryClient.invalidateQueries({ queryKey });
      }, 3000); // Simulate job duration
    },
  });

  return {
    schema,
    isLoading,
    error,
    updateTable: updateTable.mutate,
    updateColumn: updateColumn.mutate,
    syncSchema: syncSchema.mutate,
    isSyncing,
  };
};
