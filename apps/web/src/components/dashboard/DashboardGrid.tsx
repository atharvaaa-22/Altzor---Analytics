import type React from 'react';
import { useState, useCallback } from 'react';
import { Responsive, type Layout } from 'react-grid-layout';
// @ts-expect-error - WidthProvider missing from types but exported at runtime
import { WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { DashboardWidget } from './DashboardWidget';
import { DashboardFilters } from './DashboardFilters';

type ResponsiveGridProps = Omit<React.ComponentProps<typeof Responsive>, 'width'> & {
  width?: number;
  isDraggable?: boolean;
  isResizable?: boolean;
  compactType?: string;
  onLayoutChange?: (layout: unknown, layouts?: unknown) => void;
};
const ResponsiveGrid = (
  WidthProvider as unknown as (c: typeof Responsive) => React.ComponentType<ResponsiveGridProps>
)(Responsive);

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
}: DashboardGridProps): React.JSX.Element {
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
    (widgetId: string, filterData: Record<string, unknown>): void => {
      setCrossFilter({ sourceWidgetId: widgetId, ...filterData });
    },
    [],
  );

  return (
    <div className="dashboard-container">
      <DashboardFilters filters={filters} onChange={onFilterChange} />

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
        onLayoutChange={(layout: unknown): void => onLayoutChange(layout as Layout[])}
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
              onRefresh={(): void => onRefreshWidget(widget.id)}
              onCrossFilter={(data: Record<string, unknown>): void =>
                handleCrossFilter(widget.id, data)
              }
            />
          </div>
        ))}
      </ResponsiveGrid>
    </div>
  );
}
