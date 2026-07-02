import { ChartRenderer } from '../charts/ChartRenderer';
import ReactMarkdown from 'react-markdown';
import { MetricCard } from '../visualizations';

interface DashboardWidgetProps {
  widget: {
    id: string;
    type: string;
    title?: string;
    chartType?: string;
    cachedData?: unknown;
    markdownContent?: string;
    lastRefreshedAt?: string;
  };
  dashboardFilters: Record<string, unknown>;
  crossFilter: Record<string, unknown> | null;
  isEditable: boolean;
  onRefresh: () => void;
  onCrossFilter: (data: Record<string, unknown>) => void;
}

export function DashboardWidget({
  widget,
  onRefresh,
  onCrossFilter,
}: DashboardWidgetProps) {
  const renderContent = () => {
    switch (widget.type) {
      case 'CHART':
        return widget.cachedData ? (
          <ChartRenderer
            data={(widget.cachedData as { rows: Record<string, unknown>[] }).rows ?? []}
            columns={(widget.cachedData as { columns: Array<{ name: string; dataType: string }> }).columns ?? []}
            chartType={widget.chartType ?? 'BAR'}
            onDrillDown={(point) => onCrossFilter(point)}
          />
        ) : (
          <div className="widget-empty">No data. Click refresh.</div>
        );

      case 'KPI_CARD':
        const kpiValue = widget.cachedData
          ? Number(Object.values(widget.cachedData as Record<string, unknown>)[0] ?? 0)
          : 0;
        return (
          <div className="w-full h-full p-4 flex items-center justify-center">
            <MetricCard 
              title={widget.title ?? 'KPI'} 
              value={kpiValue} 
            />
          </div>
        );

      case 'DATA_TABLE':
        return widget.cachedData ? (
          <div className="data-table-widget">
            <table>
              <thead>
                <tr>
                  {((widget.cachedData as { columns: Array<{ name: string }> }).columns ?? []).map((col) => (
                    <th key={col.name}>{col.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {((widget.cachedData as { rows: Record<string, unknown>[] }).rows ?? [])
                  .slice(0, 50)
                  .map((row, i) => (
                    <tr key={i}>
                      {((widget.cachedData as { columns: Array<{ name: string }> }).columns ?? []).map((col) => (
                        <td key={col.name}>{String(row[col.name] ?? '')}</td>
                      ))}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : null;

      case 'TEXT_MARKDOWN':
        return (
          <div className="markdown-widget">
            <ReactMarkdown>{widget.markdownContent ?? ''}</ReactMarkdown>
          </div>
        );

      default:
        return <div>Unknown widget type</div>;
    }
  };

  return (
    <div className="dashboard-widget-inner">
      <div className="widget-header">
        <h3 className="widget-title">{widget.title ?? 'Untitled'}</h3>
        <div className="widget-actions">
          {widget.lastRefreshedAt && (
            <span className="widget-timestamp">
              {new Date(widget.lastRefreshedAt).toLocaleTimeString()}
            </span>
          )}
          <button className="widget-refresh-btn" onClick={onRefresh} title="Refresh">
            ↻
          </button>
        </div>
      </div>
      <div className="widget-body">{renderContent()}</div>
    </div>
  );
}
