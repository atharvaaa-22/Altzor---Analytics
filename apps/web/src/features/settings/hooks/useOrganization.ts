import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';
import { organizationApi } from '../api';
import type { OrgUser, ApiKey, AuditLog, UserRole } from '../types';

export function useOrganization(): {
  users: OrgUser[];
  isLoadingUsers: boolean;
  inviteUser: UseMutationResult<
    { success: boolean },
    Error,
    { email: string; role: UserRole },
    unknown
  >;
  removeUser: UseMutationResult<unknown, Error, string, unknown>;
  apiKeys: ApiKey[];
  isLoadingKeys: boolean;
  generateApiKey: UseMutationResult<{ key: string } & ApiKey, Error, { name: string }, unknown>;
  revokeApiKey: UseMutationResult<unknown, Error, string, unknown>;
  auditLogs: AuditLog[];
  isLoadingLogs: boolean;
} {
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
    users,
    isLoadingUsers,
    inviteUser,
    removeUser,
    apiKeys,
    isLoadingKeys,
    generateApiKey,
    revokeApiKey,
    auditLogs,
    isLoadingLogs,
  };
}
