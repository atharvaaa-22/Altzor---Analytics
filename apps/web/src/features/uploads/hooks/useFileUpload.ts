import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { uploadsApi } from '../api';
import { useUploadStore } from '../stores/uploadStore';

export function useFileUpload(): { uploadFile: (file: File) => Promise<void> } {
  const queryClient = useQueryClient();
  const { addTask, updateTaskProgress, updateTaskStatus } = useUploadStore();

  const uploadFile = useCallback(
    async (file: File) => {
      const taskId = crypto.randomUUID();

      addTask({
        id: taskId,
        file,
        progress: 0,
        status: 'uploading',
      });

      try {
        await uploadsApi.uploadFile(file, (progress) => {
          updateTaskProgress(taskId, progress);
        });

        updateTaskStatus(taskId, 'completed');

        // Optimistically update or invalidate files list
        void queryClient.invalidateQueries({ queryKey: ['files'] });
      } catch (error: unknown) {
        const err = error as { response?: { data?: { error?: string } }; message?: string };
        updateTaskStatus(
          taskId,
          'failed',
          err.response?.data?.error || err.message || 'Upload failed',
        );
      }
    },
    [addTask, updateTaskProgress, updateTaskStatus, queryClient],
  );

  return { uploadFile };
}
