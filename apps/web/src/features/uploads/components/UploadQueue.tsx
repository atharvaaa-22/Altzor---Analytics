import { X, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUploadStore } from '../stores/uploadStore';
import { clsx } from 'clsx';

export function UploadQueue() {
  const { queue, clearCompleted, removeTask } = useUploadStore();

  if (queue.length === 0) return null;

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-6 right-6 w-96 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden z-50 flex flex-col max-h-[600px]"
    >
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/50">
        <h3 className="text-sm font-semibold text-white">Uploads ({queue.length})</h3>
        <button 
          onClick={clearCompleted}
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          Clear Completed
        </button>
      </div>

      <div className="overflow-y-auto p-2 space-y-2">
        <AnimatePresence>
          {queue.map((task) => (
            <motion.div
              key={task.id}
              initial={{ scale: 0.95, opacity: 0, height: 0 }}
              animate={{ scale: 1, opacity: 1, height: 'auto' }}
              exit={{ scale: 0.95, opacity: 0, height: 0 }}
              className="bg-slate-800/50 rounded-lg p-3 relative group border border-transparent hover:border-slate-700 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="mt-1 shrink-0">
                  {task.status === 'completed' ? (
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                  ) : task.status === 'failed' ? (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  ) : (
                    <FileText className="w-5 h-5 text-blue-400" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate pr-6" title={task.file.name}>
                    {task.file.name}
                  </p>
                  
                  {task.status === 'uploading' && (
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>Uploading...</span>
                        <span>{task.progress}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300 ease-out"
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {task.status === 'failed' && (
                    <p className="text-xs text-red-400 mt-1 truncate" title={task.error}>
                      {task.error || 'Upload failed'}
                    </p>
                  )}
                  
                  {task.status === 'completed' && (
                    <p className="text-xs text-emerald-400 mt-1">Ready for analysis</p>
                  )}
                </div>
              </div>

              <button
                onClick={() => removeTask(task.id)}
                className="absolute top-2 right-2 p-1 text-slate-500 hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity rounded-md hover:bg-slate-700/50"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
