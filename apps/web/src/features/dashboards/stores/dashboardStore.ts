import { create } from 'zustand';

export interface Widget {
  id: string;
  type: 'line' | 'bar' | 'pie' | 'metric' | 'table';
  title: string;
  queryId: string;
  layout: { x: number; y: number; w: number; h: number };
}

interface DashboardState {
  isEditing: boolean;
  globalFilters: Record<string, string>;
  widgets: Widget[];
  setEditing: (editing: boolean) => void;
  setFilter: (key: string, value: string) => void;
  updateWidgetLayout: (
    layout: Array<{ i: string; x: number; y: number; w: number; h: number }>,
  ) => void;
  addWidget: (widget: Widget) => void;
  removeWidget: (id: string) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  isEditing: false,
  globalFilters: {},
  widgets: [
    {
      id: '1',
      type: 'metric',
      title: 'Total Revenue',
      queryId: 'q1',
      layout: { x: 0, y: 0, w: 3, h: 2 },
    },
    {
      id: '2',
      type: 'line',
      title: 'Revenue over Time',
      queryId: 'q2',
      layout: { x: 3, y: 0, w: 9, h: 5 },
    },
    {
      id: '3',
      type: 'bar',
      title: 'Top Products',
      queryId: 'q3',
      layout: { x: 0, y: 2, w: 3, h: 3 },
    },
  ],
  setEditing: (editing): void => set({ isEditing: editing }),
  setFilter: (key, value): void =>
    set((state) => ({ globalFilters: { ...state.globalFilters, [key]: value } })),
  updateWidgetLayout: (layouts): void =>
    set((state) => {
      const updated = state.widgets.map((w) => {
        const l = layouts.find((lo) => lo.i === w.id);
        return l ? { ...w, layout: { x: l.x, y: l.y, w: l.w, h: l.h } } : w;
      });
      return { widgets: updated };
    }),
  addWidget: (w): void => set((state) => ({ widgets: [...state.widgets, w] })),
  removeWidget: (id): void =>
    set((state) => ({ widgets: state.widgets.filter((w) => w.id !== id) })),
}));
