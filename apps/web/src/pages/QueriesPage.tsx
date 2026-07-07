import type React from 'react';
import { PlaygroundLayout } from '../features/sql-playground/components';

export function QueriesPage(): React.JSX.Element {
  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Page header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0">
        <h1 className="text-xl font-bold text-slate-900">SQL Playground</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Write, test, and save SQL queries against your connected databases.
        </p>
      </div>

      <div className="flex-1 min-h-0 p-5">
        <PlaygroundLayout />
      </div>
    </div>
  );
}
