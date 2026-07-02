import { useState } from 'react';
import { useConnections } from '../../hooks/useConnections';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

export function BigQueryForm({ onClose }: { onClose: () => void }) {
  const { createConnection, testConnection } = useConnections();
  const [name, setName] = useState('');
  const [projectId, setProjectId] = useState('');
  const [credentials, setCredentials] = useState('');

  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  const handleTest = async () => {
    setTestStatus('testing');
    try {
      await testConnection.mutateAsync({
        type: 'bigquery',
        config: { projectId, credentials: JSON.parse(credentials) },
      });
      setTestStatus('success');
      setTestMessage('Connection successful!');
    } catch (err: any) {
      setTestStatus('error');
      setTestMessage(err.message || 'Connection failed or invalid JSON format.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createConnection.mutateAsync({
        name,
        type: 'bigquery',
        config: { projectId, credentials: JSON.parse(credentials) },
      });
      onClose();
    } catch (err) {
      // Handle error
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-400 mb-1">Connection Name</label>
        <input required type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="e.g. Analytics Events" />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-400 mb-1">Project ID</label>
        <input required type="text" value={projectId} onChange={(e) => setProjectId(e.target.value)} className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="e.g. my-gcp-project-123" />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-400 mb-1">Service Account Key (JSON)</label>
        <textarea required value={credentials} onChange={(e) => setCredentials(e.target.value)} rows={6} className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono text-xs" placeholder='{"type": "service_account", ...}' />
      </div>

      {testStatus !== 'idle' && (
        <div className={clsx("p-3 rounded-lg flex items-start gap-3 mt-4 border", testStatus === 'success' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : testStatus === 'error' ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-blue-500/10 border-blue-500/20 text-blue-400")}>
          {testStatus === 'testing' ? <Loader2 className="w-5 h-5 animate-spin shrink-0" /> : testStatus === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <div className={clsx("text-sm", testStatus === 'error' && "font-mono whitespace-pre-wrap overflow-x-auto")}>
            {testStatus === 'testing' ? 'Testing connection...' : testMessage}
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-4 mt-6 border-t border-slate-800">
        <button type="button" onClick={handleTest} disabled={testStatus === 'testing'} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-medium py-2 rounded-lg transition-colors">
          Test Connection
        </button>
        <button type="submit" disabled={createConnection.isPending || testStatus === 'testing'} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 rounded-lg transition-colors disabled:opacity-50">
          Save Connection
        </button>
      </div>
    </form>
  );
}
