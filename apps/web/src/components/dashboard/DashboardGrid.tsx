import { useState, useCallback } from 'react';
// @ts-expect-error Types for WidthProvider are sometimes mismatched
import { Responsive, WidthProvider, Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { DashboardWidget } from './DashboardWidget';
import { DashboardFilters } from './DashboardFilters';

const ResponsiveGrid = WidthProvider(Responsive);

interface Widget {
  id: string;
  type: 'CHART' | 'KPI_CARD' | 'DATA_TABLE' | 'TEXT_MARKDOWN';
  title?: string;
  chartType?: string;
  chartConfig?: Record<string, unknown>;
  savedQueryId?: string;
  naturalQuery?: string;
  markdownContent?: string;
  gridPosition: { x: number; y: number; w: number; h: number };
  lastRefreshedAt?: string;
  cachedData?: unknown;
}

interface DashboardGridProps {
  dashboardId: string;
  widgets: Widget[];
  filters: Record<string, unknown>;
  isEditable: boolean;
  onLayoutChange: (layout: Layout[]) => void;
  onFilterChange: (filters: Record<string, unknown>) => void;
  onRefreshWidget: (widgetId: string) => void;
  onAddWidget: () => void;
}

export function DashboardGrid({
  widgets,
  filters,
  isEditable,
  onLayoutChange,
  onFilterChange,
  onRefreshWidget,
  onAddWidget,
}: DashboardGridProps) {
  const [crossFilter, setCrossFilter] = useState<Record<string, unknown> | null>(null);

  const layouts = {
    lg: widgets.map((w) => ({
      i: w.id,
      x: w.gridPosition.x,
      y: w.gridPosition.y,
      w: w.gridPosition.w,
      h: w.gridPosition.h,
      minW: 2,
      minH: 2,
    })),
  };

  const handleCrossFilter = useCallback(
    (widgetId: string, filterData: Record<string, unknown>) => {
      setCrossFilter({ sourceWidgetId: widgetId, ...filterData });
    },
    [],
  );

  return (
    <div className="dashboard-container">
      <DashboardFilters
        filters={filters}
        onChange={onFilterChange}
      />

      {isEditable && (
        <button className="add-widget-btn" onClick={onAddWidget}>
          + Add Widget
        </button>
      )}

      <ResponsiveGrid
        className="dashboard-grid"
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4 }}
        rowHeight={100}
        isDraggable={isEditable}
        isResizable={isEditable}
        onLayoutChange={(layout: Layout[]) => onLayoutChange(layout)}
        compactType="vertical"
        margin={[16, 16]}
      >
        {widgets.map((widget) => (
          <div key={widget.id} className="widget-wrapper">
            <DashboardWidget
              widget={widget}
              dashboardFilters={filters}
              crossFilter={crossFilter}
              isEditable={isEditable}
              onRefresh={() => onRefreshWidget(widget.id)}
              onCrossFilter={(data) => handleCrossFilter(widget.id, data)}
            />
          </div>
        ))}
      </ResponsiveGrid>
    </div>
  );
}
