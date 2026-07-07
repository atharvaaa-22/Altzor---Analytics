import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import { connectionsApi } from '../api';
import type { Connection, ConnectionFormData, ConnectionType } from '../types';

export interface UseConnectionsResult {
  connections: Connection[];
  isLoading: boolean;
  error: Error | null;
  createConnection: UseMutationResult<Connection, Error, ConnectionFormData, unknown>;
  testConnection: UseMutationResult<
    { success: boolean; message?: string },
    Error,
    { type: ConnectionType; config: Record<string, unknown> },
    unknown
  >;
  deleteConnection: UseMutationResult<unknown, Error, string, unknown>;
}

export function useConnections(): UseConnectionsResult {
  const queryClient = useQueryClient();
  const queryKey = ['connections'];

  const {
    data: connections = [],
    isLoading,
    error,
  } = useQuery({
    queryKey,
    queryFn: connectionsApi.getConnections,
  });

  const createConnection = useMutation({
    mutationFn: connectionsApi.createConnection,
    onSuccess: async (): Promise<void> => {
      await queryClient.invalidateQueries({ queryKey });
    },
  });

  const testConnection = useMutation({
    mutationFn: connectionsApi.testConnection,
  });

  const deleteConnection = useMutation({
    mutationFn: connectionsApi.deleteConnection,
    onSuccess: async (): Promise<void> => {
      await queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    connections,
    isLoading,
    error,
    createConnection,
    testConnection,
    deleteConnection,
  };
}
