export function DashboardFilters({ filters, onChange }: { filters: Record<string, unknown>; onChange: (f: Record<string, unknown>) => void }) {
  return <div className="dashboard-filters" onClick={() => onChange(filters)}>Dashboard Filters</div>;
}
