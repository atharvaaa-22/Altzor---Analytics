import type React from 'react';
import { useOrganization } from '../hooks/useOrganization';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  getPaginationRowModel,
} from '@tanstack/react-table';
import type { AuditLog } from '../types';
import { Button } from '../../../components/ui/Button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const columnHelper = createColumnHelper<AuditLog>();

const columns = [
  columnHelper.accessor('action', {
    header: 'Action',
    cell: (info) => <span className="text-sm font-medium text-slate-900">{info.getValue()}</span>,
  }),
  columnHelper.accessor('actorEmail', {
    header: 'Actor',
    cell: (info) => <span className="text-sm text-slate-600">{info.getValue()}</span>,
  }),
  columnHelper.accessor('timestamp', {
    header: 'Timestamp',
    cell: (info) => (
      <span className="text-sm text-slate-500">{new Date(info.getValue()).toLocaleString()}</span>
    ),
  }),
  columnHelper.accessor('metadata', {
    header: 'Metadata',
    cell: (info) => (
      <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-1 rounded max-w-xs truncate inline-block">
        {info.getValue() ? JSON.stringify(info.getValue()) : '–'}
      </span>
    ),
  }),
];

export function AuditLogsTab(): React.JSX.Element {
  const { auditLogs, isLoadingLogs } = useOrganization();

  const table = useReactTable({
    data: auditLogs,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 15 } },
  });

  return (
    <div className="p-6 h-full flex flex-col min-h-0">
      <div className="mb-5 shrink-0">
        <h2 className="text-base font-semibold text-slate-900">Audit Logs</h2>
        <p className="text-sm text-slate-500">Track all actions performed within the workspace.</p>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col border border-slate-200 rounded-xl">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoadingLogs ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-400">
                    Loading logs…
                  </td>
                </tr>
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-400">
                    No audit logs found.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50 shrink-0">
          <span className="text-xs text-slate-500">
            Page {table.getState().pagination.pageIndex + 1} of {Math.max(1, table.getPageCount())}
          </span>
          <div className="flex gap-1.5">
            <Button
              variant="secondary"
              size="sm"
              icon={<ChevronLeft size={14} />}
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
              <ChevronRight size={14} className="ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
