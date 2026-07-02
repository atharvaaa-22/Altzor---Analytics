import { useAdmin } from '../hooks/useAdmin';
import { Activity, Database, Server, Clock } from 'lucide-react';
import { clsx } from 'clsx';

export function SystemHealthGrid() {
  const { health, isLoadingHealth } = useAdmin();

  if (isLoadingHealth) {
    return <div className="text-slate-500">Loading system health...</div>;
  }

  const formatUptime = (seconds?: number) => {
    if (!seconds) return '-';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'ok':
      case 'connected': return 'text-emerald-400 bg-emerald-400/10 border-emerald-500/20';
      case 'degraded': return 'text-amber-400 bg-amber-400/10 border-amber-500/20';
      case 'down':
      case 'disconnected': return 'text-rose-400 bg-rose-400/10 border-rose-500/20';
      default: return 'text-slate-400 bg-slate-800 border-slate-700';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg"><Activity size={20} /></div>
          <div>
            <p className="text-sm font-medium text-slate-400">API Status</p>
            <p className="font-semibold text-white capitalize">{health?.status || 'Unknown'}</p>
          </div>
        </div>
        <div className={clsx("w-3 h-3 rounded-full animate-pulse", health?.status === 'ok' ? 'bg-emerald-500' : 'bg-rose-500')} />
      </div>
      
      <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg"><Database size={20} /></div>
          <div>
            <p className="text-sm font-medium text-slate-400">PostgreSQL</p>
            <p className="font-semibold text-white capitalize">{health?.db || 'Unknown'}</p>
          </div>
        </div>
        <div className={clsx("px-2 py-0.5 rounded text-xs font-medium border uppercase tracking-wider", getStatusColor(health?.db))}>
          {health?.db || 'N/A'}
        </div>
      </div>

      <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-500/10 text-red-400 rounded-lg"><Server size={20} /></div>
          <div>
            <p className="text-sm font-medium text-slate-400">Redis Cache</p>
            <p className="font-semibold text-white capitalize">{health?.redis || 'Unknown'}</p>
          </div>
        </div>
        <div className={clsx("px-2 py-0.5 rounded text-xs font-medium border uppercase tracking-wider", getStatusColor(health?.redis))}>
          {health?.redis || 'N/A'}
        </div>
      </div>

      <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg"><Clock size={20} /></div>
          <div>
            <p className="text-sm font-medium text-slate-400">Uptime</p>
            <p className="font-semibold text-white">{formatUptime(health?.uptime)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
