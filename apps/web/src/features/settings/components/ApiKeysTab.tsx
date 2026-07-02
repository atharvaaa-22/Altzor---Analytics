import { useState } from 'react';
import { useOrganization } from '../hooks/useOrganization';
import { Key, Plus, Trash2, Copy, Check, Loader2 } from 'lucide-react';

export function ApiKeysTab() {
  const { apiKeys, isLoadingKeys, generateApiKey, revokeApiKey } = useOrganization();
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await generateApiKey.mutateAsync({ name: keyName });
    setNewKey(res.key);
    setIsGenerateOpen(false);
    setKeyName('');
  };

  const copyToClipboard = () => {
    if (!newKey) return;
    navigator.clipboard.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-8 h-full flex flex-col min-h-0">
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div>
          <h2 className="text-xl font-semibold text-white">API Keys</h2>
          <p className="text-sm text-slate-400">Manage API keys for programmatic access.</p>
        </div>
        <button 
          onClick={() => { setIsGenerateOpen(true); setNewKey(null); }}
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm shadow-lg shadow-blue-500/20 flex items-center gap-2"
        >
          <Plus size={16} /> Generate Key
        </button>
      </div>

      {newKey && (
        <div className="mb-6 p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-xl shrink-0 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
          <h3 className="text-emerald-400 font-semibold mb-2">Key Generated Successfully</h3>
          <p className="text-sm text-slate-300 mb-4">Please copy this key now. You will not be able to see it again.</p>
          <div className="flex gap-2">
            <input type="text" readOnly value={newKey} className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 font-mono text-emerald-300 outline-none" />
            <button onClick={copyToClipboard} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-medium transition-colors border border-slate-700 flex items-center gap-2">
              {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />} 
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      {isGenerateOpen && (
        <div className="mb-6 p-4 bg-slate-900/50 border border-slate-800 rounded-xl shrink-0">
          <form onSubmit={handleGenerate} className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-400 mb-1">Key Name</label>
              <input required type="text" value={keyName} onChange={e => setKeyName(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-blue-500 outline-none" placeholder="e.g. Production Data Pipeline" />
            </div>
            <div className="flex gap-2 pt-2 sm:pt-0 justify-end">
              <button type="button" onClick={() => setIsGenerateOpen(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">Cancel</button>
              <button type="submit" disabled={generateApiKey.isPending} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm disabled:opacity-50 flex items-center gap-2">
                {generateApiKey.isPending && <Loader2 size={14} className="animate-spin" />} Generate
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin">
        {isLoadingKeys ? (
          <div className="text-slate-500">Loading API keys...</div>
        ) : (
          <div className="space-y-3">
            {apiKeys.map(key => (
              <div key={key.id} className="flex items-center justify-between p-4 bg-slate-950/50 rounded-xl border border-slate-800 transition-colors hover:border-slate-700">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center shrink-0">
                    <Key size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-medium truncate">{key.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-xs px-2 py-0.5 bg-slate-900 rounded border border-slate-800 text-slate-400">{key.keyPrefix}••••••••</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6 shrink-0">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-slate-500">Created {new Date(key.createdAt).toLocaleDateString()}</p>
                    <p className="text-xs text-slate-500">Last used: {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : 'Never'}</p>
                  </div>
                  <button 
                    onClick={() => revokeApiKey.mutate(key.id)}
                    disabled={revokeApiKey.isPending}
                    className="text-slate-500 hover:text-rose-400 transition-colors p-2 bg-slate-900 rounded-lg border border-slate-800 hover:border-rose-500/50 hover:bg-rose-500/10"
                    title="Revoke Key"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            {apiKeys.length === 0 && <div className="text-slate-500 text-sm p-4 text-center border border-dashed border-slate-800 rounded-xl">No API keys generated.</div>}
          </div>
        )}
      </div>
    </div>
  );
}
