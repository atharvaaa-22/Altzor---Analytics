import type React from 'react';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { useSemanticSchema } from '../hooks/useSemanticSchema';
import type { SemanticTable, SemanticColumn } from '../types';
import { z } from 'zod';
import { Input, Textarea } from '../../../components/ui/Input';

const aliasSchema = z
  .string()
  .regex(/^[a-zA-Z0-9_ ]*$/, 'Only letters, numbers, spaces, and underscores allowed');

interface TableEditorPanelProps {
  connectionId: string;
  table: SemanticTable;
}

export function TableEditorPanel({
  connectionId,
  table,
}: TableEditorPanelProps): React.JSX.Element {
  const { updateTable, updateColumn } = useSemanticSchema(connectionId);

  const [tableAlias, setTableAlias] = useState(table.alias || '');
  const [tableDesc, setTableDesc] = useState(table.description || '');
  const [aliasError, setAliasError] = useState('');

  useEffect(() => {
    setTableAlias(table.alias || '');
    setTableDesc(table.description || '');
    setAliasError('');
  }, [table.id]);

  const handleTableAliasChange = (val: string): void => {
    setTableAlias(val);
    const result = aliasSchema.safeParse(val);
    if (!result.success) {
      setAliasError('Only letters, numbers, spaces, and underscores allowed');
      return;
    }
    setAliasError('');
    updateTable({ tableId: table.id, data: { alias: val } });
  };

  const handleTableDescChange = (val: string): void => {
    setTableDesc(val);
    updateTable({ tableId: table.id, data: { description: val } });
  };

  const handleColumnToggle = (column: SemanticColumn): void => {
    updateColumn({ columnId: column.id, data: { isVisible: !column.isVisible } });
  };

  const handleColumnAlias = (column: SemanticColumn, val: string): void => {
    const result = aliasSchema.safeParse(val);
    if (result.success) {
      updateColumn({ columnId: column.id, data: { alias: val } });
    }
  };

  const handleColumnDesc = (column: SemanticColumn, val: string): void => {
    updateColumn({ columnId: column.id, data: { description: val } });
  };

  return (
    <motion.div
      key={table.id}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex-1 flex flex-col overflow-y-auto"
    >
      {/* Panel header */}
      <div className="px-6 py-4 border-b border-slate-200 shrink-0">
        <div className="flex items-baseline gap-3">
          <h2 className="text-base font-bold text-slate-900">{table.name}</h2>
          {table.schema && (
            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md font-mono">
              {table.schema}
            </span>
          )}
        </div>
      </div>

      <div className="p-6 space-y-8 max-w-4xl">
        {/* Table-level settings */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-4">AI Semantic Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="AI Alias"
              value={tableAlias}
              onChange={(e) => handleTableAliasChange(e.target.value)}
              placeholder="e.g. Customers"
              error={aliasError}
              hint="The name your AI assistant will use to refer to this table"
            />
            <Textarea
              label="Description"
              value={tableDesc}
              onChange={(e) => handleTableDescChange(e.target.value)}
              placeholder="Describe this table for the AI…"
              rows={3}
              hint="Helps the AI understand the table's purpose and content"
            />
          </div>
        </div>

        {/* Columns table */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-4">
            Columns
            <span className="ml-2 text-xs font-normal text-slate-400">
              {table.columns.length} columns
            </span>
          </h3>
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {['Name', 'Type', 'AI Alias', 'Description', 'Visible'].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {table.columns.map((col) => (
                  <tr
                    key={col.id}
                    className={clsx(
                      'hover:bg-slate-50 transition-colors',
                      col.isDeletedFromSource && 'opacity-50',
                    )}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={clsx(
                          'text-sm font-medium',
                          col.isDeletedFromSource ? 'line-through text-red-500' : 'text-slate-900',
                        )}
                      >
                        {col.name}
                      </span>
                      {col.isDeletedFromSource && (
                        <div className="text-xs text-red-500 mt-0.5">Removed from source</div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        {col.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        defaultValue={col.alias || ''}
                        onBlur={(e) => handleColumnAlias(col, e.target.value)}
                        disabled={col.isDeletedFromSource}
                        placeholder="Alias…"
                        className="w-full text-sm bg-transparent border border-transparent hover:border-slate-200 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 rounded-md px-2 py-1 transition-all outline-none text-slate-700 disabled:cursor-not-allowed"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        defaultValue={col.description || ''}
                        onBlur={(e) => handleColumnDesc(col, e.target.value)}
                        disabled={col.isDeletedFromSource}
                        placeholder="Description…"
                        className="w-full text-sm bg-transparent border border-transparent hover:border-slate-200 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 rounded-md px-2 py-1 transition-all outline-none text-slate-500 disabled:cursor-not-allowed"
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <button
                        role="switch"
                        aria-checked={col.isVisible}
                        onClick={() => handleColumnToggle(col)}
                        disabled={col.isDeletedFromSource}
                        className={clsx(
                          'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed',
                          col.isVisible ? 'bg-indigo-600' : 'bg-slate-200',
                        )}
                      >
                        <span className="sr-only">Toggle visibility</span>
                        <span
                          aria-hidden="true"
                          className={clsx(
                            'inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200',
                            col.isVisible ? 'translate-x-4' : 'translate-x-0.5',
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
