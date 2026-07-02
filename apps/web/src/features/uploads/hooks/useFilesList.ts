import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadsApi } from '../api';

export function useFilesList() {
  const queryClient = useQueryClient();
  const queryKey = ['files'];

  const { data: files = [], isLoading, error } = useQuery({
    queryKey,
    queryFn: uploadsApi.getFiles,
  });

  const deleteFile = useMutation({
    mutationFn: uploadsApi.deleteFile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
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
