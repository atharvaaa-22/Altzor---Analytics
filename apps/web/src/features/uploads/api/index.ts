import axios from 'axios';
import { useAuthStore } from '../../auth';
import type { FileMetadata } from '../types';
import { api } from '../../../lib/api';

const BASE_URL = '/api';

export const uploadsApi = {
  getFiles: () => api.get<FileMetadata[]>('/files'),
  
  deleteFile: (id: string) => api.delete(`/files/${id}`),

  uploadFile: async (
    file: File,
    onProgress: (progress: number) => void
  ) => {
    const formData = new FormData();
    formData.append('file', file);

    const { accessToken } = useAuthStore.getState();

    const response = await axios.post<{ fileId: string; tableName: string; rowCount: number; columns: string[] }>(
      `${BASE_URL}/files/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        withCredentials: true,
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percentCompleted);
          }
        },
      }
    );

    return response.data;
  },
};
