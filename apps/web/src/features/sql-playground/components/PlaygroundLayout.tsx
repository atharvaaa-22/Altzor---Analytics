import { useState, useEffect } from 'react';
import { Panel, Group, Separator } from 'react-resizable-panels';
import { Play, Sparkles, Save, Loader2, Database } from 'lucide-react';
import { SqlEditor } from './SqlEditor';
import { ResultsGrid } from './ResultsGrid';
import { SavedQueriesSidebar } from './SavedQueriesSidebar';
import { useSqlExecution } from '../hooks/useSqlExecution';
import type { QueryResult } from '../types';

export function PlaygroundLayout() {
  const { executeQuery, savedQueries, saveQuery, isLoadingSaved } = useSqlExecution();
  
  const [sql, setSql] = useState('SELECT * FROM users LIMIT 100;');
  const [results, setResults] = useState<QueryResult | null>(null);
  const [connectionId, setConnectionId] = useState('default');
  
  const handleExecute = async () => {
    try {
      const res = await executeQuery.mutateAsync({ sql, connectionId });
      setResults(res);
    } catch (e) {
      // display error in results grid
      setResults({ columns: ['Error'], rows: [{ Error: (e as any).message || 'Failed to execute query' }] });
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleExecute();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sql, connectionId]);

  return (
    <div className="flex w-full h-full bg-slate-950 overflow-hidden text-white font-sans rounded-2xl border border-slate-800">
      <SavedQueriesSidebar 
        queries={savedQueries} 
        onSelect={(q) => {
          setSql(q.sql);
          setConnectionId(q.connectionId);
        }} 
      />
      
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
              <Database size={16} className="text-orange-400" />
              <span className="text-sm font-medium">Production Replica</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700">
              <Save size={16} />
              Save
            </button>
            <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 rounded-lg transition-colors border border-purple-500/20">
              <Sparkles size={16} />
              Explain
            </button>
            <button 
              onClick={handleExecute}
              disabled={executeQuery.isPending}
              className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50"
            >
              {executeQuery.isPending ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
              Run (Cmd+Enter)
            </button>
          </div>
        </div>

        <Group orientation="vertical" className="flex-1">
          <Panel defaultSize={40} minSize={20}>
            <SqlEditor value={sql} onChange={setSql} />
          </Panel>
          
          <Separator className="h-1.5 bg-slate-800 hover:bg-blue-500 transition-colors cursor-row-resize flex items-center justify-center">
            <div className="w-8 h-1 bg-slate-600 rounded-full" />
          </Separator>
          
          <Panel defaultSize={60} minSize={20}>
            <div className="h-full flex flex-col bg-slate-900">
              <div className="px-4 py-2 border-b border-slate-800 bg-slate-900 flex justify-between items-center shrink-0">
                <span className="text-sm font-medium text-slate-300">Results</span>
                {results?.durationMs && (
                  <span className="text-xs text-slate-500">{results.rows.length} rows • {results.durationMs}ms</span>
                )}
              </div>
              <div className="flex-1 min-h-0">
                <ResultsGrid 
                  columns={results?.columns || []} 
                  rows={results?.rows || []} 
                />
              </div>
            </div>
          </Panel>
        </Group>
      </div>
    </div>
  );
}
