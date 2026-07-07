import type React from 'react';
import { useState } from 'react';
import { useOrganization } from '../hooks/useOrganization';
import { Key, Plus, Trash2, Copy, Check, Loader2 } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';

export function ApiKeysTab(): React.JSX.Element {
  const { apiKeys, isLoadingKeys, generateApiKey, revokeApiKey } = useOrganization();
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const res = await generateApiKey.mutateAsync({ name: keyName });
    setNewKey(res.key);
    setIsGenerateOpen(false);
    setKeyName('');
  };

  const copyToClipboard = (): void => {
    if (!newKey) return;
    void navigator.clipboard.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 h-full flex flex-col min-h-0">
      <div className="flex justify-between items-center mb-5 shrink-0">
        <div>
          <h2 className="text-base font-semibold text-slate-900">API Keys</h2>
          <p className="text-sm text-slate-500">
            Manage API keys for programmatic access to Altzor.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          icon={<Plus size={14} />}
          onClick={() => {
            setIsGenerateOpen(true);
            setNewKey(null);
          }}
        >
          Generate Key
        </Button>
      </div>

      {/* New key banner */}
      {newKey && (
        <div className="mb-5 p-4 bg-emerald-50 border border-emerald-200 rounded-xl relative overflow-hidden shrink-0">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
          <h3 className="text-sm font-semibold text-emerald-800 mb-1">
            Key generated — copy it now
          </h3>
          <p className="text-xs text-emerald-700 mb-3">
            This is the only time you'll see the full key.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={newKey}
              className="flex-1 bg-white border border-emerald-200 rounded-lg px-3 py-2 font-mono text-sm text-emerald-800 outline-none"
            />
            <Button
              variant="secondary"
              size="sm"
              icon={copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              onClick={copyToClipboard}
            >
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>
      )}

      {/* Generate form */}
      {isGenerateOpen && (
        <div className="mb-5 p-4 bg-slate-50 border border-slate-200 rounded-xl shrink-0">
          <form
            onSubmit={(e): void => {
              void handleGenerate(e);
            }}
            className="flex flex-col sm:flex-row sm:items-end gap-4"
          >
            <Input
              label="Key name"
              type="text"
              required
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              placeholder="e.g. Production Data Pipeline"
              wrapperClassName="flex-1"
            />
            <div className="flex gap-2 pt-1 sm:pt-0 justify-end">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => setIsGenerateOpen(false)}
              >
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit" loading={generateApiKey.isPending}>
                Generate
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Keys list */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {isLoadingKeys ? (
          <div className="flex items-center justify-center py-12 text-slate-400">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : apiKeys.length === 0 ? (
          <div className="text-sm text-slate-400 p-6 text-center border border-dashed border-slate-200 rounded-xl">
            No API keys generated yet.
          </div>
        ) : (
          apiKeys.map((key) => (
            <div
              key={key.id}
              className="flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-white border border-slate-200 rounded-xl transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                  <Key size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{key.name}</p>
                  <span className="font-mono text-xs px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-400">
                    {key.keyPrefix}••••••••
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right hidden sm:block">
                  <p className="text-xs text-slate-500">
                    Created {new Date(key.createdAt).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-slate-400">
                    Last used:{' '}
                    {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : 'Never'}
                  </p>
                </div>
                <button
                  onClick={() => revokeApiKey.mutate(key.id)}
                  disabled={revokeApiKey.isPending}
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                  title="Revoke key"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
