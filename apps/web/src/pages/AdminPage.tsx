import type React from 'react';
import { SystemHealthGrid, QueueManager, LiveLogTail } from '../features/admin/components';

export function AdminPage(): React.JSX.Element {
  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto w-full space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">System Admin</h1>
        <p className="text-sm text-slate-500 mt-1">
          Monitor platform health, queues, and live application logs.
        </p>
      </div>

      <SystemHealthGrid />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <QueueManager />
        <LiveLogTail />
      </div>
    </div>
  );
}
