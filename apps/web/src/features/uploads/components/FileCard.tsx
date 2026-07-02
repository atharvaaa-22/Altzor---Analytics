import { motion } from 'framer-motion';
import { FileText, Trash2, Eye } from 'lucide-react';
import type { FileMetadata } from '../types';

interface FileCardProps {
  file: FileMetadata;
  onDelete: () => void;
  onPreview?: () => void;
}

export function FileCard({ file, onDelete, onPreview }: FileCardProps) {
  const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
  const rowsStr = file.rowCount ? (file.rowCount > 1000 ? `${(file.rowCount / 1000).toFixed(1)}k` : file.rowCount) : '-';

  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: "0px 10px 20px rgba(0,0,0,0.2)" }}
      className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex flex-col transition-colors hover:border-slate-700 relative group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
          <FileText size={24} />
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onPreview && (
            <button onClick={onPreview} className="text-slate-500 hover:text-slate-300 transition-colors p-1.5 hover:bg-slate-800 rounded-md" title="Preview Data">
              <Eye size={16} />
            </button>
          )}
          <button onClick={onDelete} className="text-slate-500 hover:text-red-400 transition-colors p-1.5 hover:bg-red-500/10 rounded-md" title="Delete File">
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      
      <h4 className="text-sm font-medium text-slate-200 mb-1 truncate" title={file.name}>
        {file.name}
      </h4>
      
      <div className="flex items-center gap-3 text-xs text-slate-500 mt-auto pt-4 border-t border-slate-800/50">
        <span>{sizeMB} MB</span>
        <span className="w-1 h-1 rounded-full bg-slate-700" />
        <span>{rowsStr} Rows</span>
        <span className="w-1 h-1 rounded-full bg-slate-700" />
        <span className={file.status === 'ready' ? 'text-emerald-400' : file.status === 'failed' ? 'text-red-400' : 'text-amber-400'}>
          {file.status === 'ready' ? 'Ready' : file.status === 'failed' ? 'Failed' : 'Processing'}
        </span>
      </div>
    </motion.div>
  );
}
