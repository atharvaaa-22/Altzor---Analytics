import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { useSemanticSchema } from '../hooks/useSemanticSchema';
import type { SemanticTable, SemanticColumn } from '../types';
import { z } from 'zod';

const aliasSchema = z.string().regex(/^[a-zA-Z0-9_ ]*$/, "Only letters, numbers, spaces, and underscores allowed");

interface TableEditorPanelProps {
  connectionId: string;
  table: SemanticTable;
}

export function TableEditorPanel({ connectionId, table }: TableEditorPanelProps) {
  const { updateTable, updateColumn } = useSemanticSchema(connectionId);
  
  const [tableAlias, setTableAlias] = useState(table.alias || '');
  const [tableDesc, setTableDesc] = useState(table.description || '');
  const [aliasError, setAliasError] = useState('');

  // Update local state when table prop changes
  useEffect(() => {
    setTableAlias(table.alias || '');
    setTableDesc(table.description || '');
    setAliasError('');
  }, [table.id]);

  const handleTableAliasChange = (val: string) => {
    setTableAlias(val);
    const result = aliasSchema.safeParse(val);
    if (!result.success) {
      setAliasError("Only letters, numbers, spaces, and underscores allowed");
      return;
    }
    setAliasError('');
    updateTable({ tableId: table.id, data: { alias: val } });
  };

  const handleTableDescChange = (val: string) => {
    setTableDesc(val);
    updateTable({ tableId: table.id, data: { description: val } });
  };

  const handleColumnToggle = (column: SemanticColumn) => {
    updateColumn({ columnId: column.id, data: { isVisible: !column.isVisible } });
  };

  const handleColumnAlias = (column: SemanticColumn, val: string) => {
    const result = aliasSchema.safeParse(val);
    if (result.success) {
      updateColumn({ columnId: column.id, data: { alias: val } });
    }
  };

  const handleColumnDesc = (column: SemanticColumn, val: string) => {
    updateColumn({ columnId: column.id, data: { description: val } });
  };

  return (
    <motion.div
      key={table.id} // Forces re-animation when table changes
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 flex flex-col p-6 overflow-y-auto"
    >
      <div className="max-w-4xl space-y-8">
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            {table.name}
            {table.schema && <span className="text-sm font-normal text-slate-400 bg-slate-800 px-2 py-0.5 rounded">schema: {table.schema}</span>}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">
                AI Alias
              </label>
              <input
                type="text"
                value={tableAlias}
                onChange={(e) => handleTableAliasChange(e.target.value)}
                placeholder="e.g. Customers"
                className={clsx(
                  "w-full bg-slate-900/50 border-transparent hover:bg-slate-800/50 focus:bg-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-md px-3 py-2 text-sm transition-colors text-white",
                  aliasError && "border-red-500 focus:border-red-500 focus:ring-red-500"
                )}
              />
              {aliasError && <p className="text-xs text-red-500 mt-1">{aliasError}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">
                Description
              </label>
              <textarea
                value={tableDesc}
                onChange={(e) => handleTableDescChange(e.target.value)}
                placeholder="Describe this table for the AI..."
                rows={2}
                className="w-full bg-slate-900/50 border-transparent hover:bg-slate-800/50 focus:bg-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-md px-3 py-2 text-sm transition-colors resize-none text-white"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-200">Columns</h3>
          
          <div className="bg-slate-900/50 rounded-lg border border-slate-800 overflow-hidden">
            <table className="min-w-full divide-y divide-slate-800">
              <thead className="bg-slate-900/80">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Alias</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Description</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">Visible</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {table.columns.map((col) => (
                  <tr key={col.id} className={clsx("hover:bg-slate-800/20 transition-colors", col.isDeletedFromSource && "opacity-50")}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className={clsx("text-sm font-medium text-slate-200", col.isDeletedFromSource && "line-through text-red-400")}>
                        {col.name}
                      </div>
                      {col.isDeletedFromSource && (
                        <div className="text-xs text-red-500 mt-0.5">Missing from source</div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-400">
                      {col.type}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <input
                        type="text"
                        defaultValue={col.alias || ''}
                        onBlur={(e) => handleColumnAlias(col, e.target.value)}
                        disabled={col.isDeletedFromSource}
                        placeholder="Alias..."
                        className="w-full bg-transparent border-transparent hover:bg-slate-800/50 focus:bg-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-md px-2 py-1 text-sm transition-colors text-white"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        defaultValue={col.description || ''}
                        onBlur={(e) => handleColumnDesc(col, e.target.value)}
                        disabled={col.isDeletedFromSource}
                        placeholder="Description..."
                        className="w-full bg-transparent border-transparent hover:bg-slate-800/50 focus:bg-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-md px-2 py-1 text-sm transition-colors text-white"
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <button
                        role="switch"
                        aria-checked={col.isVisible}
                        onClick={() => handleColumnToggle(col)}
                        disabled={col.isDeletedFromSource}
                        className={clsx(
                          "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-opacity-75 disabled:cursor-not-allowed",
                          col.isVisible ? "bg-blue-600" : "bg-slate-700"
                        )}
                      >
                        <span className="sr-only">Toggle column visibility</span>
                        <span
                          aria-hidden="true"
                          className={clsx(
                            "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                            col.isVisible ? "translate-x-4" : "translate-x-0"
                          )}
                        />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
