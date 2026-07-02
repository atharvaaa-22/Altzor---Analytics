import { useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from '@tanstack/react-table';

export function ResultsGrid({ columns, rows }: { columns: string[]; rows: Record<string, any>[] }) {
  const tableColumns = useMemo(() => columns.map(col => ({
    header: col,
    accessorKey: col,
  })), [columns]);

  const table = useReactTable({
    data: rows,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (!columns.length) {
    return (
      <div className="w-full h-full flex items-center justify-center text-slate-500">
        Run a query to see results
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-auto bg-slate-900/50">
      <table className="w-full text-left text-sm whitespace-nowrap">
        <thead className="sticky top-0 bg-slate-800 z-10">
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th key={header.id} className="px-4 py-2 font-medium text-slate-300 border-b border-slate-700">
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext()
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map(row => (
            <tr key={row.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
              {row.getVisibleCells().map(cell => (
                <td key={cell.id} className="px-4 py-2 text-slate-400 font-mono">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
