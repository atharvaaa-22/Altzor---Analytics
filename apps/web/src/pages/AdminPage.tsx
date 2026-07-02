import { SystemHealthGrid, QueueManager, LiveLogTail } from '../features/admin/components';

export function AdminPage() {
  return (
    <div className="p-8 max-w-6xl mx-auto w-full space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">System Admin Panel</h1>
        <p className="text-slate-400">Monitor platform health, queue lengths, and memory pools.</p>
      </div>
      
      <SystemHealthGrid />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <QueueManager />
        <LiveLogTail />
      </div>
    </div>
  );
}
