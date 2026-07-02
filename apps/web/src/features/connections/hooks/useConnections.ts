import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { connectionsApi } from '../api';
import type { ConnectionFormData, ConnectionType } from '../types';

export function useConnections() {
  const queryClient = useQueryClient();
  const queryKey = ['connections'];

  const { data: connections = [], isLoading, error } = useQuery({
    queryKey,
    queryFn: connectionsApi.getConnections,
  });

  const createConnection = useMutation({
    mutationFn: connectionsApi.createConnection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const testConnection = useMutation({
    mutationFn: connectionsApi.testConnection,
  });

  const deleteConnection = useMutation({
    mutationFn: connectionsApi.deleteConnection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
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
