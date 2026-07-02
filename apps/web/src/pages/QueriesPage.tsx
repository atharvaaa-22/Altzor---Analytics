import { PlaygroundLayout } from '../features/sql-playground/components';

export function QueriesPage() {
  return (
    <div className="h-full flex flex-col p-4 md:p-8 max-w-[1600px] mx-auto w-full">
      <div className="mb-6 shrink-0">
        <h1 className="text-3xl font-bold text-white mb-2">SQL Playground</h1>
        <p className="text-slate-400">Write, test, and save raw SQL queries against your connected databases.</p>
      </div>

      <div className="flex-1 min-h-0">
        <PlaygroundLayout />
      </div>
    </div>
  );
}
