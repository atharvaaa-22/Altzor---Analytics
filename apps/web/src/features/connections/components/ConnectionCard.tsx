import { Database, Clock, MoreVertical, Server, HardDrive, Hexagon, Cloud } from 'lucide-react';
import type { Connection } from '../types';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';

const getStatusColor = (status: Connection['status']) => {
  switch (status) {
    case 'healthy': return 'bg-emerald-500';
    case 'failing': return 'bg-red-500';
    case 'syncing': return 'bg-blue-500';
    default: return 'bg-slate-500';
  }
};

const getStatusText = (status: Connection['status']) => {
  switch (status) {
    case 'healthy': return 'Active';
    case 'failing': return 'Failing';
    case 'syncing': return 'Syncing';
    default: return 'Unknown';
  }
};

const getConnectionIcon = (type: Connection['type']) => {
  switch (type) {
    case 'postgres': return <Database className="text-blue-400" size={24} />;
    case 'mysql': return <Server className="text-orange-400" size={24} />;
    case 'sqlserver': return <HardDrive className="text-red-400" size={24} />;
    case 'snowflake': return <Hexagon className="text-cyan-400" size={24} />;
    case 'bigquery': return <Cloud className="text-blue-500" size={24} />;
    default: return <Database className="text-slate-400" size={24} />;
  }
};

export function ConnectionCard({ connection }: { connection: Connection }) {
  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)' }}
      className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-6 relative overflow-hidden transition-colors hover:border-slate-700 flex flex-col"
    >
      <div className="absolute top-0 right-0 p-4">
        <button className="text-slate-500 hover:text-slate-300 transition-colors">
          <MoreVertical size={20} />
        </button>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className="bg-slate-800 p-3 rounded-xl shadow-inner border border-slate-700/50">
          {getConnectionIcon(connection.type)}
        </div>
        <div>
          <h3 className="text-lg font-bold text-white truncate max-w-[180px]" title={connection.name}>{connection.name}</h3>
          <p className="text-sm text-slate-400 capitalize">{connection.type}</p>
        </div>
      </div>

      <div className="mt-auto space-y-3 pt-4 border-t border-slate-800/50">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-400 flex items-center gap-2">
            Status
          </span>
          <div className="flex items-center gap-2 bg-slate-950/50 px-2.5 py-1 rounded-full border border-slate-800">
            <span className={clsx("w-2 h-2 rounded-full shadow-sm", getStatusColor(connection.status), connection.status === 'syncing' && "animate-pulse")} />
            <span className="text-xs font-medium text-slate-300">{getStatusText(connection.status)}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-400 flex items-center gap-2">
            <Clock size={14} /> Last Sync
          </span>
          <span className="text-xs font-medium text-slate-300">
            {connection.lastSyncAt ? connection.lastSyncAt : 'N/A'}
          </span>
        </div>
      </div>
      
      {connection.error && (
        <div className="mt-3 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-xs text-red-400 font-mono truncate" title={connection.error}>
            {connection.error}
          </p>
        </div>
      )}
    </motion.div>
  );
}
