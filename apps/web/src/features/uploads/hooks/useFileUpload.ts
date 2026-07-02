import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { uploadsApi } from '../api';
import { useUploadStore } from '../stores/uploadStore';

export function useFileUpload() {
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
        queryClient.invalidateQueries({ queryKey: ['files'] });
      } catch (error: any) {
        updateTaskStatus(
          taskId,
          'failed',
          error?.response?.data?.error || error.message || 'Upload failed'
        );
      }
    },
    [addTask, updateTaskProgress, updateTaskStatus, queryClient]
  );

  return { uploadFile };
}
