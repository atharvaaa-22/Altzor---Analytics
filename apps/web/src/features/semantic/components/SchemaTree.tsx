import type React from 'react';
import { useState } from 'react';
import { ChevronRight, Folder, FolderOpen, Table as TableIcon } from 'lucide-react';
import { clsx } from 'clsx';
import type { SemanticSchema } from '../types';

interface SchemaTreeProps {
  schema: SemanticSchema;
  selectedTableId: string | null;
  onSelectTable: (id: string) => void;
}

export function SchemaTree({
  schema,
  selectedTableId,
  onSelectTable,
}: SchemaTreeProps): React.JSX.Element {
  const schemas = schema.tables.reduce(
    (acc, table) => {
      const s = table.schema || 'public';
      if (!acc[s]) acc[s] = [];
      acc[s].push(table);
      return acc;
    },
    {} as Record<string, typeof schema.tables>,
  );

  const [expandedSchemas, setExpandedSchemas] = useState<Record<string, boolean>>(
    Object.keys(schemas).reduce((acc, s) => ({ ...acc, [s]: true }), {}),
  );

  const toggleSchema = (s: string): void => {
    setExpandedSchemas((prev) => ({ ...prev, [s]: !prev[s] }));
  };

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3 px-1">
        Schemas
      </p>

      <div className="space-y-0.5">
        {Object.entries(schemas).map(([schemaName, tables]) => (
          <div key={schemaName}>
            <button
              onClick={() => toggleSchema(schemaName)}
              className="flex items-center gap-1.5 w-full px-2 py-1.5 text-left text-xs font-medium text-slate-600 hover:bg-slate-50 rounded-md transition-colors"
            >
              <ChevronRight
                size={13}
                className={clsx(
                  'text-slate-400 transition-transform shrink-0',
                  expandedSchemas[schemaName] && 'rotate-90',
                )}
              />
              {expandedSchemas[schemaName] ? (
                <FolderOpen size={13} className="text-indigo-400 shrink-0" />
              ) : (
                <Folder size={13} className="text-slate-400 shrink-0" />
              )}
              <span>{schemaName}</span>
            </button>

            {expandedSchemas[schemaName] && (
              <div className="pl-5 mt-0.5 space-y-0.5">
                {tables.map((table) => (
                  <button
                    key={table.id}
                    onClick={() => onSelectTable(table.id)}
                    className={clsx(
                      'flex items-center gap-1.5 w-full px-2 py-1.5 text-left text-xs rounded-md transition-colors',
                      selectedTableId === table.id
                        ? 'bg-indigo-50 text-indigo-700 font-medium'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                    )}
                  >
                    <TableIcon
                      size={12}
                      className={clsx(
                        'shrink-0',
                        selectedTableId === table.id ? 'text-indigo-500' : 'text-slate-400',
                      )}
                    />
                    <span className="truncate" title={table.name}>
                      {table.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
