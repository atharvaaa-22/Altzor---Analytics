import { FileCode } from 'lucide-react';
import type { SavedQuery } from '../types';

export function SavedQueriesSidebar({ queries, onSelect }: { queries: SavedQuery[]; onSelect: (q: SavedQuery) => void }) {
  return (
    <div className="w-64 h-full border-r border-slate-800 bg-slate-900/50 overflow-y-auto shrink-0 flex flex-col p-4">
      <h3 className="text-sm font-semibold text-slate-400 mb-4 uppercase tracking-wider">Saved Queries</h3>
      <div className="space-y-1">
        {queries.map(q => (
          <button
            key={q.id}
            onClick={() => onSelect(q)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 rounded-lg transition-colors text-left"
          >
            <FileCode size={16} className="text-blue-400 shrink-0" />
            <span className="truncate">{q.name}</span>
          </button>
        ))}
        {queries.length === 0 && (
          <div className="text-sm text-slate-500 italic">No saved queries</div>
        )}
      </div>
    </div>
  );
}
