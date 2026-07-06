import type React from 'react';
import { Database, Clock, MoreVertical, Server, HardDrive, Hexagon, Cloud } from 'lucide-react';
import type { Connection } from '../types';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';
import { Badge } from '../../../components/ui/Badge';

const getStatusVariant = (
  status: Connection['status'],
): 'success' | 'error' | 'info' | 'neutral' => {
  switch (status) {
    case 'healthy':
      return 'success';
    case 'failing':
      return 'error';
    case 'syncing':
      return 'info';
    default:
      return 'neutral';
  }
};

const getStatusText = (status: Connection['status']): string => {
  switch (status) {
    case 'healthy':
      return 'Connected';
    case 'failing':
      return 'Error';
    case 'syncing':
      return 'Syncing';
    default:
      return 'Unknown';
  }
};

const getConnectionIcon = (type: Connection['type']): React.JSX.Element => {
  const cls = 'shrink-0';
  switch (type) {
    case 'postgres':
      return <Database className={clsx(cls, 'text-blue-600')} size={22} />;
    case 'mysql':
      return <Server className={clsx(cls, 'text-orange-500')} size={22} />;
    case 'sqlserver':
      return <HardDrive className={clsx(cls, 'text-red-500')} size={22} />;
    case 'snowflake':
      return <Hexagon className={clsx(cls, 'text-cyan-500')} size={22} />;
    case 'bigquery':
      return <Cloud className={clsx(cls, 'text-blue-500')} size={22} />;
    default:
      return <Database className={clsx(cls, 'text-slate-400')} size={22} />;
  }
};

export function ConnectionCard({ connection }: { connection: Connection }): React.JSX.Element {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col hover:shadow-md transition-shadow duration-200 relative"
    >
      <button className="absolute top-4 right-4 text-slate-300 hover:text-slate-500 transition-colors p-1 rounded-md hover:bg-slate-100">
        <MoreVertical size={16} />
      </button>

      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center">
          {getConnectionIcon(connection.type)}
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-900 truncate" title={connection.name}>
            {connection.name}
          </h3>
          <p className="text-xs text-slate-500 capitalize">{connection.type}</p>
        </div>
      </div>

      <div className="mt-auto space-y-2.5 pt-4 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">Status</span>
          <Badge
            variant={getStatusVariant(connection.status)}
            dot
            pulse={connection.status === 'syncing'}
          >
            {getStatusText(connection.status)}
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <Clock size={11} /> Last sync
          </span>
          <span className="text-xs text-slate-600 font-medium">
            {connection.lastSyncAt ?? 'Never'}
          </span>
        </div>
      </div>

      {connection.error && (
        <div className="mt-3 p-2.5 bg-red-50 border border-red-100 rounded-lg">
          <p className="text-xs text-red-600 font-mono truncate" title={connection.error}>
            {connection.error}
          </p>
        </div>
      )}
    </motion.div>
  );
}
