import { useAdmin } from '../hooks/useAdmin';
import { Play, Pause, ListTree } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

export function QueueManager() {
  const { queues, isLoadingQueues, pauseQueue, resumeQueue } = useAdmin();

  if (isLoadingQueues) {
    return <div className="text-slate-500 p-8 text-center border border-dashed border-slate-800 rounded-2xl">Loading queues...</div>;
  }

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      <div className="p-4 border-b border-slate-800 flex items-center gap-2">
        <ListTree size={18} className="text-blue-400" />
        <h3 className="font-semibold text-white">BullMQ Worker Queues</h3>
      </div>
      <div className="divide-y divide-slate-800/50">
        {queues.map(queue => (
          <div key={queue.name} className="p-4 flex flex-col md:flex-row items-center gap-6 hover:bg-slate-800/20 transition-colors">
            <div className="flex-1 min-w-0 w-full">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-slate-200 capitalize truncate">{queue.name.replace(/-/g, ' ')}</h4>
                  {queue.isPaused && <span className="bg-amber-500/10 text-amber-400 text-xs px-2 py-0.5 rounded border border-amber-500/20 font-medium">PAUSED</span>}
                </div>
                <div className="text-xs text-slate-500 font-mono">
                  {queue.active} active • {queue.waiting} waiting
                </div>
              </div>
              <div className="flex gap-4 text-sm mt-3">
                <div className="flex-1 bg-slate-950 rounded-lg p-2 border border-slate-800 text-center">
                  <p className="text-xs text-slate-500 mb-1">Completed</p>
                  <p className="font-semibold text-emerald-400">{queue.completed.toLocaleString()}</p>
                </div>
                <div className="flex-1 bg-slate-950 rounded-lg p-2 border border-slate-800 text-center">
                  <p className="text-xs text-slate-500 mb-1">Failed</p>
                  <p className="font-semibold text-rose-400">{queue.failed.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="w-full md:w-48 h-16 shrink-0 flex items-end">
              <div className="w-full h-full relative group">
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-slate-900/80 rounded backdrop-blur-sm">
                  <span className="text-xs font-medium text-slate-300">Throughput (jobs/min)</span>
                </div>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={queue.throughput.map((v, i) => ({ value: v, index: i }))}>
                    <Line type="monotone" dataKey="value" stroke={queue.isPaused ? '#64748b' : '#3b82f6'} strokeWidth={2} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="shrink-0 flex items-center justify-end w-full md:w-auto">
              {queue.isPaused ? (
                <button 
                  onClick={() => resumeQueue.mutate(queue.name)}
                  disabled={resumeQueue.isPending}
                  className="bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <Play size={16} /> Resume
                </button>
              ) : (
                <button 
                  onClick={() => pauseQueue.mutate(queue.name)}
                  disabled={pauseQueue.isPending}
                  className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <Pause size={16} /> Pause
                </button>
              )}
            </div>
          </div>
        ))}
        {queues.length === 0 && <div className="p-8 text-center text-slate-500">No queues active.</div>}
      </div>
    </div>
  );
}
