import type React from 'react';
import { motion } from 'framer-motion';
import { FileText, Trash2, Eye } from 'lucide-react';
import type { FileMetadata } from '../types';
import { Badge } from '../../../components/ui/Badge';

interface FileCardProps {
  file: FileMetadata;
  onDelete: () => void;
  onPreview?: () => void;
}

const statusVariant = (status: FileMetadata['status']): 'success' | 'error' | 'warning' => {
  if (status === 'ready') return 'success';
  if (status === 'failed') return 'error';
  return 'warning';
};

const statusText = (status: FileMetadata['status']): string => {
  if (status === 'ready') return 'Ready';
  if (status === 'failed') return 'Failed';
  return 'Processing';
};

export function FileCard({ file, onDelete, onPreview }: FileCardProps): React.JSX.Element {
  const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
  const rowsStr = file.rowCount
    ? file.rowCount > 1000
      ? `${(file.rowCount / 1000).toFixed(1)}k`
      : file.rowCount
    : '-';

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col hover:shadow-md transition-shadow duration-200 group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500">
          <FileText size={20} />
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onPreview && (
            <button
              onClick={onPreview}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
              title="Preview"
            >
              <Eye size={14} />
            </button>
          )}
          <button
            onClick={onDelete}
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <h4 className="text-sm font-medium text-slate-900 mb-1 truncate" title={file.name}>
        {file.name}
      </h4>

      <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>{sizeMB} MB</span>
          <span>·</span>
          <span>{rowsStr} rows</span>
        </div>
        <Badge variant={statusVariant(file.status)} dot>
          {statusText(file.status)}
        </Badge>
      </div>
    </motion.div>
  );
}
