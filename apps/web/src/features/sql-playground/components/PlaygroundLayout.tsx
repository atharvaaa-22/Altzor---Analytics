import type React from 'react';
import { useState, useEffect } from 'react';
import { Panel, Group, Separator } from 'react-resizable-panels';
import { Play, Sparkles, Save, Database, ChevronDown } from 'lucide-react';
import { SqlEditor } from './SqlEditor';
import { ResultsGrid } from './ResultsGrid';
import { SavedQueriesSidebar } from './SavedQueriesSidebar';
import { useSqlExecution } from '../hooks/useSqlExecution';
import type { QueryResult } from '../types';
import { Button } from '../../../components/ui/Button';

export function PlaygroundLayout(): React.JSX.Element {
  const { executeQuery, savedQueries } = useSqlExecution();

  const [sql, setSql] = useState('SELECT * FROM users LIMIT 100;');
  const [results, setResults] = useState<QueryResult | null>(null);
  const [connectionId, setConnectionId] = useState('default');

  const handleExecute = async (): Promise<void> => {
    try {
      const res = await executeQuery.mutateAsync({ sql, connectionId });
      setResults(res);
    } catch (e) {
      setResults({
        columns: ['Error'],
        rows: [{ Error: (e as { message?: string }).message || 'Failed to execute query' }],
      });
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        void handleExecute();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return (): void => window.removeEventListener('keydown', handleKeyDown);
  }, [sql, connectionId]);

  return (
    <div className="flex w-full h-full bg-white overflow-hidden rounded-xl border border-slate-200 shadow-sm">
      <SavedQueriesSidebar
        queries={savedQueries}
        onSelect={(q) => {
          setSql(q.sql);
          setConnectionId(q.connectionId);
        }}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
              <Database size={14} className="text-indigo-600" />
              Production Replica
              <ChevronDown size={12} className="text-slate-400" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" icon={<Save size={14} />}>
              Save
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={<Sparkles size={14} />}
              className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
            >
              Explain
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={executeQuery.isPending}
              icon={!executeQuery.isPending ? <Play size={14} /> : undefined}
              onClick={(): void => {
                void handleExecute();
              }}
            >
              Run
              <kbd className="ml-1.5 text-xs opacity-60 border border-indigo-400 rounded px-1">
                ⌘↵
              </kbd>
            </Button>
          </div>
        </div>

        {/* Editor + Results panes */}
        <Group orientation="vertical" className="flex-1">
          <Panel defaultSize={40} minSize={20}>
            <SqlEditor value={sql} onChange={setSql} />
          </Panel>

          <Separator className="h-1.5 bg-slate-200 hover:bg-indigo-400 transition-colors cursor-row-resize flex items-center justify-center">
            <div className="w-8 h-1 bg-slate-300 rounded-full" />
          </Separator>

          <Panel defaultSize={60} minSize={20}>
            <div className="h-full flex flex-col bg-white">
              <div className="px-4 py-2 border-b border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Results
                </span>
                {results?.durationMs && (
                  <span className="text-xs text-slate-400">
                    {results.rows.length} rows · {results.durationMs}ms
                  </span>
                )}
              </div>
              <div className="flex-1 min-h-0">
                <ResultsGrid columns={results?.columns || []} rows={results?.rows || []} />
              </div>
            </div>
          </Panel>
        </Group>
      </div>
    </div>
  );
}
