import type React from 'react';
import { DropzoneArea, FileCard, UploadQueue } from '../features/uploads/components';
import { useFilesList } from '../features/uploads/hooks/useFilesList';
import { EmptyState } from '../components/ui/EmptyState';
import { Spinner } from '../components/ui/Spinner';
import { FileSpreadsheet, HardDrive } from 'lucide-react';

export function FilesPage(): React.JSX.Element {
  const { files, isLoading, deleteFile } = useFilesList();

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Data Files</h1>
          <p className="text-sm text-slate-500 mt-1">
            Upload static datasets to query with Altzor AI.
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-500 font-medium">
          <HardDrive size={14} className="text-slate-400" />0 GB / 5 GB used
        </div>
      </div>

      {/* Dropzone */}
      <div className="mb-8 shrink-0">
        <DropzoneArea />
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Uploaded Files</h2>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner size={24} />
          </div>
        ) : files.length === 0 ? (
          <EmptyState
            icon={<FileSpreadsheet size={26} />}
            title="No files uploaded"
            description="Upload CSV, Excel, JSON, or PDF files to start querying them with natural language."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {files.map((file) => (
              <FileCard key={file.id} file={file} onDelete={() => deleteFile(file.id)} />
            ))}
          </div>
        )}
      </div>

      <UploadQueue />
    </div>
  );
}
