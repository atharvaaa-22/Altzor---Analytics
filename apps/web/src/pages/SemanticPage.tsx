import type React from 'react';
import { useEffect } from 'react';
import { Database, Network } from 'lucide-react';
import { SchemaTree, TableEditorPanel, SyncStatusBadge } from '../features/semantic/components';
import { useSemanticSchema } from '../features/semantic/hooks/useSemanticSchema';
import { useSemanticStore } from '../features/semantic/stores/semanticStore';
import { Spinner } from '../components/ui/Spinner';

export function SemanticPage(): React.JSX.Element {
  const connectionId = 'default';
  const { schema, isLoading, error } = useSemanticSchema(connectionId);
  const { selectedTableId, setSelectedTableId } = useSemanticStore();

  useEffect(() => {
    if (schema?.tables?.length && !selectedTableId) {
      setSelectedTableId(schema.tables[0].id);
    }
  }, [schema, selectedTableId, setSelectedTableId]);

  const selectedTable = schema?.tables?.find((t) => t.id === selectedTableId);

  return (
    <div className="h-full flex flex-col">
      {/* Page header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Semantic Layer</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Map your raw tables into business-friendly AI concepts.
          </p>
        </div>
        <SyncStatusBadge connectionId={connectionId} />
      </div>

      {/* Two-column layout */}
      <div className="flex-1 flex overflow-hidden bg-slate-50">
        {/* Left sidebar tree */}
        <div className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
            <Database size={15} className="text-indigo-600 shrink-0" />
            <span className="text-sm font-medium text-slate-700 truncate">Production Replica</span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center flex-1">
              <Spinner size={20} />
            </div>
          ) : error ? (
            <div className="p-4 text-sm text-red-600">Failed to load schema</div>
          ) : schema ? (
            <SchemaTree
              schema={schema}
              selectedTableId={selectedTableId}
              onSelectTable={setSelectedTableId}
            />
          ) : null}
        </div>

        {/* Right editor panel */}
        <div className="flex-1 bg-white border-l border-slate-200 flex flex-col overflow-hidden">
          {selectedTable ? (
            <TableEditorPanel connectionId={connectionId} table={selectedTable} />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <Network size={24} className="text-slate-300" />
              </div>
              <p className="text-sm font-medium text-slate-700 mb-1">No table selected</p>
              <p className="text-xs text-slate-400">
                Select a table from the left panel to edit its semantic properties
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
