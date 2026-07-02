import { RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';
import { useSemanticSchema } from '../hooks/useSemanticSchema';

export function SyncStatusBadge({ connectionId }: { connectionId: string }) {
  const { isSyncing, syncSchema } = useSemanticSchema(connectionId);

  return (
    <button
      onClick={() => syncSchema()}
      disabled={isSyncing}
      className={clsx(
        "flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-300",
        isSyncing 
          ? "bg-blue-600/20 text-blue-400 cursor-not-allowed border border-blue-500/30" 
          : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700 hover:border-slate-600"
      )}
    >
      <RefreshCw className={clsx("w-4 h-4", isSyncing && "animate-spin")} />
      <span>{isSyncing ? 'Syncing Schema...' : 'Sync Schema'}</span>
    </button>
  );
}
