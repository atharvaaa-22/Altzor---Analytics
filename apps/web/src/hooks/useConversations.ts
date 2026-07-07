import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query';
import { api } from '../lib/api';

interface Conversation {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  connection?: { name: string; type: string };
}

interface ConversationList {
  conversations: Conversation[];
  total: number;
}

export function useConversations(search?: string): UseQueryResult<ConversationList, Error> {
  return useQuery({
    queryKey: ['conversations', search],
    queryFn: () => api.get<ConversationList>('/conversations', search ? { search } : undefined),
  });
}

export function useCreateConversation(): UseMutationResult<
  { id: string },
  Error,
  string | undefined,
  unknown
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (connectionId?: string) =>
      api.post<{ id: string }>('/conversations', { connectionId }),
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useConversationMessages(
  conversationId: string,
): UseQueryResult<{ messages: unknown[] }, Error> {
  return useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => api.get<{ messages: unknown[] }>(`/conversations/${conversationId}/messages`),
    enabled: !!conversationId,
  });
}
