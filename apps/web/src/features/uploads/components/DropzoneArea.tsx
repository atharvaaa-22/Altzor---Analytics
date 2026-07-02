import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud } from 'lucide-react';
import { clsx } from 'clsx';
import { useFileUpload } from '../hooks/useFileUpload';

export function DropzoneArea() {
  const { uploadFile } = useFileUpload();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach((file) => {
      uploadFile(file);
    });
  }, [uploadFile]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    maxSize: 500 * 1024 * 1024, // 500MB
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/json': ['.json'],
      'application/pdf': ['.pdf'],
    },
  });

  return (
    <div
      {...getRootProps()}
      className={clsx(
        "flex flex-col items-center justify-center w-full p-12 border-2 border-dashed rounded-2xl cursor-pointer transition-colors duration-200",
        isDragActive ? "border-blue-500 bg-blue-900/20" : "border-slate-700 bg-slate-900/30",
        isDragReject && "border-red-500 bg-red-900/20",
        !isDragActive && !isDragReject && "hover:bg-slate-800/50 hover:border-slate-600"
      )}
    >
      <input {...getInputProps()} />
      <div className={clsx(
        "p-4 rounded-full mb-4 transition-colors duration-200",
        isDragActive ? "bg-blue-500/20 text-blue-400" : "bg-slate-800 text-slate-400",
        isDragReject && "bg-red-500/20 text-red-400"
      )}>
        <UploadCloud size={32} />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">
        {isDragActive 
          ? isDragReject ? "File type or size not supported!" : "Drop the files here..." 
          : "Drag and drop CSV, Excel, JSON, or PDF"}
      </h3>
      <p className="text-sm text-slate-400 text-center max-w-sm">
        Supports files up to 500MB. Data will be securely processed and mapped to ephemeral tables.
      </p>
    </div>
  );
}
