import type React from 'react';

export function DashboardFilters({
  filters,
  onChange,
}: {
  filters: Record<string, unknown>;
  onChange: (f: Record<string, unknown>) => void;
}): React.JSX.Element {
  return (
    <div className="dashboard-filters" onClick={(): void => onChange(filters)}>
      Dashboard Filters
    </div>
  );
}
