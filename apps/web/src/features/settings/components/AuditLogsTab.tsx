import { useOrganization } from '../hooks/useOrganization';
import { useReactTable, getCoreRowModel, flexRender, createColumnHelper, getPaginationRowModel } from '@tanstack/react-table';
import type { AuditLog } from '../types';

const columnHelper = createColumnHelper<AuditLog>();

const columns = [
  columnHelper.accessor('action', {
    header: 'Action',
    cell: info => <span className="font-medium text-slate-200">{info.getValue()}</span>,
  }),
  columnHelper.accessor('actorEmail', {
    header: 'Actor',
    cell: info => <span className="text-slate-400">{info.getValue()}</span>,
  }),
  columnHelper.accessor('timestamp', {
    header: 'Timestamp',
    cell: info => <span className="text-slate-400">{new Date(info.getValue()).toLocaleString()}</span>,
  }),
  columnHelper.accessor('metadata', {
    header: 'Metadata',
    cell: info => (
      <span className="text-xs font-mono text-slate-500 bg-slate-950 px-2 py-1 rounded border border-slate-800 max-w-xs truncate inline-block">
        {info.getValue() ? JSON.stringify(info.getValue()) : '-'}
      </span>
    ),
  }),
];

export function AuditLogsTab() {
  const { auditLogs, isLoadingLogs } = useOrganization();

  const table = useReactTable({
    data: auditLogs,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 15 },
    },
  });

  return (
    <div className="p-8 h-full flex flex-col min-h-0">
      <div className="mb-6 shrink-0">
        <h2 className="text-xl font-semibold text-white">Audit Logs</h2>
        <p className="text-sm text-slate-400">Track and monitor all actions performed within the workspace.</p>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col bg-slate-900/50 rounded-xl border border-slate-800 shadow-xl">
        <div className="flex-1 overflow-auto scrollbar-thin">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-800 text-slate-300 sticky top-0 z-10">
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th key={header.id} className="px-6 py-4 font-medium border-b border-slate-700">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {isLoadingLogs ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">Loading logs...</td>
                </tr>
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">No audit logs found.</td>
                </tr>
              ) : (
                table.getRowModel().rows.map(row => (
                  <tr key={row.id} className="hover:bg-slate-800/30 transition-colors">
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="px-6 py-4">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <div className="flex items-center justify-between p-4 bg-slate-900 border-t border-slate-800 shrink-0">
          <span className="text-sm text-slate-400">
            Page {table.getState().pagination.pageIndex + 1} of {Math.max(1, table.getPageCount())}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded border border-slate-700 disabled:opacity-50 text-sm hover:bg-slate-700 transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded border border-slate-700 disabled:opacity-50 text-sm hover:bg-slate-700 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
