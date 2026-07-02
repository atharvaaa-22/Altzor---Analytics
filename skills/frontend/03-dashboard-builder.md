# Frontend Specification: Dashboard Builder Module

## 1. Purpose
To allow users to construct, customize, and persist dynamic dashboards using widgets generated from the AI Conversation module or built manually via SQL. This module must feel like a premium BI tool (e.g., Metabase, Linear, Wisdom AI).

## 2. Goals
- Implement a robust, highly performant drag-and-drop grid system.
- Support real-time resizing and reflowing of chart widgets.
- Enable global dashboard filtering (Date ranges, categorical dropdowns).
- Render beautiful, interactive charts using Recharts or Apache ECharts.

## 3. Architecture

### 3.1 Folder Structure
```text
apps/web/src/
├── features/dashboards/
│   ├── components/
│   │   ├── DashboardGrid.tsx
│   │   ├── WidgetContainer.tsx
│   │   ├── GlobalFilters.tsx
│   │   └── charts/
│   │       ├── LineChartWidget.tsx
│   │       ├── BarChartWidget.tsx
│   │       └── MetricCardWidget.tsx
│   ├── hooks/
│   │   ├── useDashboardSync.ts
│   │   └── useWidgetData.ts
│   └── stores/
│       └── dashboardEditStore.ts
```

### 3.2 Responsibilities
- **`DashboardGrid.tsx`**: Wraps `react-grid-layout`. Manages the `[x, y, w, h]` coordinates of every widget in the layout state.
- **`WidgetContainer.tsx`**: Acts as an Error Boundary and Suspense boundary for individual charts. Fetches its own data.
- **`dashboardEditStore.ts`**: Tracks if the dashboard is in "View" or "Edit" mode. Tracks dirty state for the "Save Changes" button.

## 4. Component Hierarchy & Data Flow
```text
<DashboardPage> (Fetches Dashboard Layout & Filter Config via TanStack Query)
  ├── <DashboardHeader> (Title, Edit Button, Save Button, Date Picker)
  ├── <GlobalFilters> (Context provider for current filter values)
  └── <DashboardGrid> (react-grid-layout)
        ├── <WidgetContainer id="1">
        │     └── <useWidgetData(id, globalFilters)> -> Returns Data
        │     └── <BarChartWidget data={data} config={config} />
        ├── <WidgetContainer id="2">
        │     └── <useWidgetData(id, globalFilters)>
        │     └── <MetricCardWidget data={data} config={config} />
```

## 5. API Contracts

| Action | Method | Endpoint | Payload | Response |
| :--- | :--- | :--- | :--- | :--- |
| **Get Layout** | `GET` | `/api/dashboards/:id` | *None* | `200 OK`, `{ widgets: [...], filters: [...] }` |
| **Update Layout** | `PUT` | `/api/dashboards/:id` | `{ widgets: [...] }` | `200 OK` |
| **Get Widget Data**| `POST` | `/api/widgets/:id/data` | `{ filters: { dateRange, ... } }` | `200 OK`, `{ data: [] }` |

**Caching Strategy**: Widget data is aggressively cached by TanStack Query (`staleTime: 5 minutes`) parameterized by the active global filters.

## 6. UI Specifications

### 6.1 Layout Hierarchy & Wireframe
```text
[ Header: Dashboard Title | Date Range Dropdown | Edit Button | Share ]
[ Sub-Header: Active Filters (Pills)                                 ]
-----------------------------------------------------------------------
[ Widget (w:6, h:4)                  ] [ Widget (w:6, h:4)            ]
[ Metric: 45.2K  (+12%)              ] [ Bar Chart Rendering          ]
[                                    ] [                              ]
-----------------------------------------------------------------------
[ Widget (w:12, h:6)                                                  ]
[ Line Chart: Revenue over Time                                       ]
[                                                                     ]
```

### 6.2 Styling Guidelines
- **Grid Background**: In edit mode, display a subtle dotted grid background `bg-[radial-gradient(#334155_1px,transparent_1px)] bg-[size:20px_20px]`.
- **Widgets**: `bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl`. Shadow on hover.
- **Typography**: Widget titles are `text-sm font-medium text-slate-400`. Numbers are `text-3xl font-bold text-white tracking-tight`.

### 6.3 Animation Specifications
- **Grid Reflow**: `react-grid-layout` handles native CSS transforms. Ensure `transition-property: transform` is smoothed.
- **Chart Loading**: Use a pulsing skeleton box inside the widget while `<useWidgetData>` is `isLoading`.

### 6.4 States
- **Edit Mode**: Widgets gain a drag handle (six dots icon) in the top right. They become resizable via a bottom-right caret. A "Save Changes" floating action button appears at the top.
- **Empty State**: If no widgets exist, show a dotted-border dropzone in the center with a primary button: "Add your first widget or Ask AI to generate one".

## 7. Edge Cases & Error Handling
- **Widget Query Failure**: If a specific widget's SQL query fails (e.g., column deleted from DB), the `WidgetContainer` catches it. Instead of crashing the dashboard, the single widget renders a `bg-red-950/20` box with a localized "Data unavailable" error.
- **Collision Detection**: Prevent widgets from overlapping. `react-grid-layout` handles this natively via `preventCollision={false}` and `compactType="vertical"`.

## 8. Acceptance Criteria
1. User can drag and drop widgets to reorder them; layout persists on save.
2. Global date picker automatically triggers a refetch for all widgets utilizing the `dateRange` filter.
3. Tooltips on charts are beautifully styled with a dark theme, matching the application aesthetic.
