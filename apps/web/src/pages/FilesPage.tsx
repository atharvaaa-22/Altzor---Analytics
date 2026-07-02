import React from 'react';
import { DropzoneArea, FileCard, UploadQueue } from '../features/uploads/components';
import { useFilesList } from '../features/uploads/hooks/useFilesList';

export function FilesPage() {
  const { files, isLoading, deleteFile } = useFilesList();

  return (
    <div className="p-8 max-w-7xl mx-auto w-full relative h-full flex flex-col">
      <div className="flex justify-between items-center mb-8 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Data Files</h1>
          <p className="text-slate-400">Upload static datasets to query with Altzor AI.</p>
        </div>
        <div className="text-sm font-medium text-slate-400 bg-slate-900/50 px-4 py-2 rounded-lg border border-slate-800">
          Used: 0 GB / 5 GB
        </div>
      </div>

      <div className="mb-10 shrink-0">
        <DropzoneArea />
      </div>

      <div className="flex-1 overflow-y-auto pb-8">
        <h3 className="text-lg font-semibold text-slate-200 mb-4">Uploaded Files</h3>
        
        {isLoading ? (
          <div className="text-slate-500">Loading files...</div>
        ) : files.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/20">
            <p className="text-slate-500">No files uploaded yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {files.map((file) => (
              <FileCard
                key={file.id}
                file={file}
                onDelete={() => deleteFile(file.id)}
                onPreview={() => console.log('Preview', file.id)}
              />
            ))}
          </div>
        )}
      </div>

      <UploadQueue />
    </div>
  );
}
