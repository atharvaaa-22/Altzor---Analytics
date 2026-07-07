import type React from 'react';
import { useRef, useState, useEffect } from 'react';
import GridLayout, { Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { useDashboardStore } from '../stores/dashboardStore';
import { WidgetContainer } from './WidgetContainer';

export const DashboardGrid = (): React.JSX.Element => {
  const { widgets, isEditing, updateWidgetLayout } = useDashboardStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(1200);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initial width
    setWidth(containerRef.current.getBoundingClientRect().width);

    const observer = new ResizeObserver((entries) => {
      setWidth(entries[0].contentRect.width);
    });
    observer.observe(containerRef.current);
    return (): void => observer.disconnect();
  }, []);

  const layout = widgets.map((w) => ({ i: w.id, ...w.layout }));

  const handleLayoutChange = (currentLayout: Layout): void => {
    if (isEditing) {
      const mapped = currentLayout.map((item) => ({
        i: item.i,
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
      }));
      updateWidgetLayout(mapped);
    }
  };

  return (
    <div className="w-full" ref={containerRef}>
      <GridLayout
        className="layout"
        width={width}
        layout={layout}
        gridConfig={{
          cols: 12,
          rowHeight: 60,
          margin: [24, 24],
        }}
        dragConfig={{ enabled: isEditing }}
        resizeConfig={{ enabled: isEditing }}
        onLayoutChange={handleLayoutChange}
      >
        {widgets.map((widget) => (
          <div
            key={widget.id}
            className={
              isEditing
                ? 'cursor-move ring-2 ring-transparent hover:ring-orange-500/50 rounded-2xl transition-all'
                : ''
            }
          >
            <WidgetContainer widget={widget} />
          </div>
        ))}
      </GridLayout>
    </div>
  );
};
