import axios from 'axios';
import { useAuthStore } from '../../auth';
import type { FileMetadata } from '../types';
import { api } from '../../../lib/api';

const BASE_URL = '/api';

export const uploadsApi = {
  getFiles: (): Promise<FileMetadata[]> => api.get<FileMetadata[]>('/files'),

  deleteFile: (id: string): Promise<unknown> => api.delete(`/files/${id}`),

  uploadFile: async (
    file: File,
    onProgress: (progress: number) => void,
  ): Promise<{ fileId: string; tableName: string; rowCount: number; columns: string[] }> => {
    const formData = new FormData();
    formData.append('file', file);

    const { accessToken } = useAuthStore.getState();

    const response = await axios.post<{
      fileId: string;
      tableName: string;
      rowCount: number;
      columns: string[];
    }>(`${BASE_URL}/files/upload`, formData, {
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
    });

    return response.data;
  },
};
