import type React from 'react';
import { CheckCircle2, XCircle, Clock, FileText, Bell } from 'lucide-react';
import type { AutomationLog } from '../types';
import { clsx } from 'clsx';
import { formatDistanceToNow } from 'date-fns';

export function HistoryLogTable({
  logs,
  isLoading,
}: {
  logs: AutomationLog[];
  isLoading?: boolean;
}): React.JSX.Element {
  if (isLoading) {
    return <div className="p-8 text-center text-slate-500">Loading history logs...</div>;
  }

  if (logs.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 bg-slate-900/20 rounded-xl border border-dashed border-slate-800">
        No automation history found.
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto bg-slate-900/50 rounded-xl border border-slate-800 shadow-xl">
      <table className="w-full text-left text-sm whitespace-nowrap">
        <thead className="bg-slate-800 text-slate-300">
          <tr>
            <th className="px-6 py-4 font-medium">Type</th>
            <th className="px-6 py-4 font-medium">Status</th>
            <th className="px-6 py-4 font-medium">Target ID</th>
            <th className="px-6 py-4 font-medium">Executed At</th>
            <th className="px-6 py-4 font-medium">Details</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/50">
          {logs.map((log) => (
            <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  {log.type === 'REPORT' ? (
                    <FileText size={16} className="text-blue-400" />
                  ) : (
                    <Bell size={16} className="text-amber-400" />
                  )}
                  <span className="font-medium text-slate-200">{log.type}</span>
                </div>
              </td>
              <td className="px-6 py-4">
                <div
                  className={clsx(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
                    log.status === 'SUCCESS'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/20',
                  )}
                >
                  {log.status === 'SUCCESS' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                  {log.status}
                </div>
              </td>
              <td className="px-6 py-4 font-mono text-xs text-slate-400">{log.targetId}</td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2 text-slate-400">
                  <Clock size={14} />
                  {formatDistanceToNow(new Date(log.executedAt), { addSuffix: true })}
                </div>
              </td>
              <td className="px-6 py-4 text-slate-400 max-w-xs truncate" title={log.error}>
                {log.error || '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
