import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseMutateFunction,
} from '@tanstack/react-query';
import { uploadsApi } from '../api';

export function useFilesList(): {
  files: unknown[];
  isLoading: boolean;
  error: unknown;
  deleteFile: UseMutateFunction<unknown, unknown, string, unknown>;
  isDeleting: boolean;
} {
  const queryClient = useQueryClient();
  const queryKey = ['files'];

  const {
    data: files = [],
    isLoading,
    error,
  } = useQuery({
    queryKey,
    queryFn: uploadsApi.getFiles,
  });

  const deleteFile = useMutation({
    mutationFn: uploadsApi.deleteFile,
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    files,
    isLoading,
    error,
    deleteFile: deleteFile.mutate,
    isDeleting: deleteFile.isPending,
  };
}
