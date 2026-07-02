# Frontend Specification: Visualizations & Charting

## 1. Purpose
Defines the charting library wrapper used across the Dashboard Builder, SQL Playground, and AI Conversations. Ensures all data visualizations are perfectly on-brand, performant, and interactive.

## 2. Goals
- Standardize all charts to use Recharts (or Apache ECharts if handling 100k+ points).
- Implement drill-down and cross-filtering click events.
- Provide a consistent dark-theme color palette.

## 3. Architecture

### 3.1 Folder Structure
```text
apps/web/src/
├── components/
│   └── visualizations/
│       ├── ChartWrapper.tsx
│       ├── LineChart.tsx
│       ├── BarChart.tsx
│       ├── PieChart.tsx
│       ├── MetricCard.tsx
│       └── utils/
│           └── colors.ts
```

### 3.2 Color Palette (`colors.ts`)
Must map to Tailwind variables to maintain the SaaS look:
```typescript
export const chartColors = [
  '#3b82f6', // blue-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
];
```

## 4. UI Specifications
- **Tooltips**: `bg-slate-900 border border-slate-700 shadow-xl rounded-lg p-3`. Must display exact coordinates and formatting (e.g., currency `$` and commas).
- **Metric Cards**: Large typography. If trending up, a green arrow `lucide-react/TrendingUp text-emerald-400`. If down, `text-rose-400`.
- **Empty States**: If a query returns no rows, the `ChartWrapper` renders a beautiful `lucide-react/Ghost` icon with "No data available for this range".

## 5. Interactions
- **Click Events**: Clicking a bar on a `BarChart` emits a standard `onCrossFilter` event containing the dimension key/value, which the Dashboard Grid catches to update Global Filters.
