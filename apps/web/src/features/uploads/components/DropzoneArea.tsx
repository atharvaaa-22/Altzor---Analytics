import { useCallback, useState } from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';
import { UploadCloud } from 'lucide-react';
import { clsx } from 'clsx';
import { useFileUpload } from '../hooks/useFileUpload';
import { getDropzoneAccept, isExtensionAllowed } from '@platform/shared';

export function DropzoneArea(): React.JSX.Element {
  const { uploadFile } = useFileUpload();

  const [rejectionError, setRejectionError] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      setRejectionError(null);
      const validFiles = [...acceptedFiles];

      fileRejections.forEach((rejection) => {
        // Fix MIME mismatch: if the extension is valid, accept it anyway
        const ext = rejection.file.name.substring(rejection.file.name.lastIndexOf('.'));
        if (isExtensionAllowed(ext) && rejection.file.size <= 500 * 1024 * 1024) {
          validFiles.push(rejection.file);
        } else if (rejection.file.size > 500 * 1024 * 1024) {
          setRejectionError('One or more files exceed the 500MB limit');
        } else {
          setRejectionError('File type not supported');
        }
      });

      validFiles.forEach((file) => {
        void uploadFile(file);
      });
    },
    [uploadFile],
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    maxSize: 500 * 1024 * 1024,
    accept: getDropzoneAccept(),
  });

  return (
    <div
      {...getRootProps()}
      className={clsx(
        'flex flex-col items-center justify-center w-full py-12 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200',
        isDragActive && !isDragReject && 'border-indigo-400 bg-indigo-50',
        isDragReject && 'border-red-400 bg-red-50',
        !isDragActive &&
          !isDragReject &&
          'border-slate-300 bg-white hover:border-indigo-300 hover:bg-indigo-50/30',
      )}
    >
      <input {...getInputProps()} />
      <div
        className={clsx(
          'w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors',
          isDragActive && !isDragReject
            ? 'bg-indigo-100 text-indigo-600'
            : 'bg-slate-100 text-slate-400',
          isDragReject && 'bg-red-100 text-red-500',
        )}
      >
        <UploadCloud size={24} />
      </div>
      <h3
        className={clsx(
          'text-sm font-semibold mb-1.5',
          isDragActive && !isDragReject && !rejectionError ? 'text-indigo-700' : 'text-slate-800',
          (isDragReject || rejectionError) && 'text-red-600',
        )}
      >
        {isDragActive
          ? isDragReject
            ? 'File type or size not supported'
            : 'Drop your files here…'
          : rejectionError
            ? rejectionError
            : 'Drag & drop files here, or click to browse'}
      </h3>
      <p className="text-xs text-slate-500 text-center max-w-sm">
        Supports CSV, XLSX, XLS, JSON, PDF, DOCX, PNG, JPG · Max 500 MB
      </p>
    </div>
  );
}
