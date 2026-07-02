export interface FileMetadata {
  id: string;
  name: string;
  size: number;
  type: string;
  rowCount?: number;
  tableName?: string;
  createdAt: string;
  status: 'processing' | 'ready' | 'failed';
}

export interface UploadTask {
  id: string;
  file: File;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  error?: string;
}
