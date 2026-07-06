import type React from 'react';
import { useAdmin } from '../hooks/useAdmin';
import { Play, Pause, ListTree } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { Badge } from '../../../components/ui/Badge';

export function QueueManager(): React.JSX.Element {
  const { queues, isLoadingQueues, pauseQueue, resumeQueue } = useAdmin();

  if (isLoadingQueues) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-400">
        Loading queues…
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100">
        <ListTree size={16} className="text-indigo-600" />
        <h3 className="text-sm font-semibold text-slate-800">Worker Queues</h3>
      </div>

      <div className="divide-y divide-slate-100">
        {queues.map((queue) => (
          <div
            key={queue.name}
            className="p-4 flex flex-col md:flex-row items-center gap-5 hover:bg-slate-50 transition-colors"
          >
            <div className="flex-1 min-w-0 w-full">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium text-slate-800 capitalize truncate">
                    {queue.name.replace(/-/g, ' ')}
                  </h4>
                  {queue.isPaused && <Badge variant="warning">Paused</Badge>}
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  {queue.active} active · {queue.waiting} waiting
                </span>
              </div>
              <div className="flex gap-3 text-sm mt-2">
                <div className="flex-1 bg-slate-50 border border-slate-100 rounded-lg p-2 text-center">
                  <p className="text-xs text-slate-400 mb-0.5">Completed</p>
                  <p className="font-semibold text-emerald-600 text-sm">
                    {queue.completed.toLocaleString()}
                  </p>
                </div>
                <div className="flex-1 bg-slate-50 border border-slate-100 rounded-lg p-2 text-center">
                  <p className="text-xs text-slate-400 mb-0.5">Failed</p>
                  <p className="font-semibold text-red-600 text-sm">
                    {queue.failed.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Sparkline */}
            <div className="w-full md:w-36 h-14 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={queue.throughput.map((v, i) => ({ value: v, index: i }))}>
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={queue.isPaused ? '#CBD5E1' : '#6366F1'}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Action button */}
            <div className="shrink-0">
              {queue.isPaused ? (
                <button
                  onClick={() => resumeQueue.mutate(queue.name)}
                  disabled={resumeQueue.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Play size={13} /> Resume
                </button>
              ) : (
                <button
                  onClick={() => pauseQueue.mutate(queue.name)}
                  disabled={pauseQueue.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Pause size={13} /> Pause
                </button>
              )}
            </div>
          </div>
        ))}
        {queues.length === 0 && (
          <div className="p-8 text-center text-sm text-slate-400">No active queues.</div>
        )}
      </div>
    </div>
  );
}
