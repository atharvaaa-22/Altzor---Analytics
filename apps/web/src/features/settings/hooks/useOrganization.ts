import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { organizationApi } from '../api';

export function useOrganization() {
  const queryClient = useQueryClient();

  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['org-users'],
    queryFn: organizationApi.getUsers,
  });

  const inviteUser = useMutation({
    mutationFn: organizationApi.inviteUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['org-users'] }),
  });

  const removeUser = useMutation({
    mutationFn: organizationApi.removeUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['org-users'] }),
  });

  const { data: apiKeys = [], isLoading: isLoadingKeys } = useQuery({
    queryKey: ['org-apikeys'],
    queryFn: organizationApi.getApiKeys,
  });

  const generateApiKey = useMutation({
    mutationFn: organizationApi.generateApiKey,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['org-apikeys'] }),
  });

  const revokeApiKey = useMutation({
    mutationFn: organizationApi.revokeApiKey,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['org-apikeys'] }),
  });

  const { data: auditLogs = [], isLoading: isLoadingLogs } = useQuery({
    queryKey: ['org-audit-logs'],
    queryFn: organizationApi.getAuditLogs,
  });

  return {
    users, isLoadingUsers, inviteUser, removeUser,
    apiKeys, isLoadingKeys, generateApiKey, revokeApiKey,
    auditLogs, isLoadingLogs,
  };
}
