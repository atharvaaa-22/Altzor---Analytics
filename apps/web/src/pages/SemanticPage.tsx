import { useEffect } from 'react';
import { Database } from 'lucide-react';
import { SchemaTree, TableEditorPanel, SyncStatusBadge } from '../features/semantic/components';
import { useSemanticSchema } from '../features/semantic/hooks/useSemanticSchema';
import { useSemanticStore } from '../features/semantic/stores/semanticStore';

export function SemanticPage() {
  const connectionId = 'default'; // In a real app, this would come from a connection selector or route
  
  const { schema, isLoading, error } = useSemanticSchema(connectionId);
  const { selectedTableId, setSelectedTableId } = useSemanticStore();

  // Auto-select first table when schema loads
  useEffect(() => {
    if (schema?.tables?.length && !selectedTableId) {
      setSelectedTableId(schema.tables[0].id);
    }
  }, [schema, selectedTableId, setSelectedTableId]);

  const selectedTable = schema?.tables?.find((t) => t.id === selectedTableId);

  return (
    <div className="h-full flex flex-col p-8 max-w-7xl mx-auto w-full">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Semantic Layer</h1>
          <p className="text-slate-400">Map your raw tables into business-friendly AI concepts.</p>
        </div>
        <SyncStatusBadge connectionId={connectionId} />
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden min-h-[500px]">
        {/* Left Sidebar Tree */}
        <div className="w-72 bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl overflow-hidden flex flex-col shrink-0">
          <div className="flex items-center gap-2 text-white font-medium p-4 border-b border-slate-800 bg-slate-900/80">
            <Database size={16} className="text-blue-400" />
            Production Replica
          </div>
          {isLoading ? (
            <div className="p-4 text-slate-400 text-sm">Loading schema...</div>
          ) : error ? (
            <div className="p-4 text-red-400 text-sm">Failed to load schema</div>
          ) : schema ? (
            <SchemaTree 
              schema={schema} 
              selectedTableId={selectedTableId}
              onSelectTable={setSelectedTableId} 
            />
          ) : null}
        </div>

        {/* Right Editor */}
        <div className="flex-1 bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
          {selectedTable ? (
            <TableEditorPanel connectionId={connectionId} table={selectedTable} />
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500">
              Select a table to edit its semantic properties
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
