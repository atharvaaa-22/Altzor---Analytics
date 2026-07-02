import { useState } from 'react';
import { Folder, FolderOpen, Table as TableIcon } from 'lucide-react';
import { clsx } from 'clsx';
import type { SemanticSchema } from '../types';

interface SchemaTreeProps {
  schema: SemanticSchema;
  selectedTableId: string | null;
  onSelectTable: (id: string) => void;
}

export function SchemaTree({ schema, selectedTableId, onSelectTable }: SchemaTreeProps) {
  // Group tables by schema
  const schemas = schema.tables.reduce((acc, table) => {
    const s = table.schema || 'public';
    if (!acc[s]) acc[s] = [];
    acc[s].push(table);
    return acc;
  }, {} as Record<string, typeof schema.tables>);

  const [expandedSchemas, setExpandedSchemas] = useState<Record<string, boolean>>(
    Object.keys(schemas).reduce((acc, s) => ({ ...acc, [s]: true }), {})
  );

  const toggleSchema = (s: string) => {
    setExpandedSchemas((prev) => ({ ...prev, [s]: !prev[s] }));
  };

  return (
    <div className="flex flex-col w-64 border-r border-slate-800 h-full overflow-y-auto bg-slate-900/50 p-4 shrink-0">
      <h3 className="text-sm font-semibold text-slate-400 mb-4 uppercase tracking-wider">
        Schemas
      </h3>
      
      <div className="space-y-1">
        {Object.entries(schemas).map(([schemaName, tables]) => (
          <div key={schemaName} className="space-y-1">
            <button
              onClick={() => toggleSchema(schemaName)}
              className="flex items-center space-x-2 w-full px-2 py-1.5 text-left text-sm text-slate-300 hover:bg-slate-800 rounded-md transition-colors"
            >
              {expandedSchemas[schemaName] ? (
                <FolderOpen className="w-4 h-4 text-slate-400" />
              ) : (
                <Folder className="w-4 h-4 text-slate-400" />
              )}
              <span>{schemaName}</span>
            </button>
            
            {expandedSchemas[schemaName] && (
              <div className="pl-6 space-y-1">
                {tables.map((table) => (
                  <button
                    key={table.id}
                    onClick={() => onSelectTable(table.id)}
                    className={clsx(
                      "flex items-center space-x-2 w-full px-2 py-1.5 text-left text-sm rounded-md transition-colors",
                      selectedTableId === table.id
                        ? "bg-blue-600/20 text-blue-400"
                        : "text-slate-400 hover:bg-slate-800 hover:text-slate-300"
                    )}
                  >
                    <TableIcon className="w-4 h-4" />
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
