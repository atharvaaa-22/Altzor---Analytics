# Skill File 08 — Dashboard Builder

## Overview
Build the drag-and-drop dashboard system with a 12-column responsive grid (react-grid-layout), multiple widget types (charts, KPI cards, data tables, text/markdown), dashboard-level filters, sharing, cross-filtering, and drill-down capabilities.

**BRD References:** REQ-DB-007–015

---

## 1. Dashboard Service — `apps/api/src/services/dashboard/dashboard.service.ts`

```typescript
/**
 * dashboard.service.ts — Dashboard and widget CRUD.
 *
 * REQ-DB-007: 12-column responsive grid.
 * REQ-DB-008: Charts, KPI cards, data tables, text/markdown widgets.
 * REQ-DB-009: Add widgets from saved queries or new NL questions.
 * REQ-DB-013: Duplication, archiving, deletion.
 */

import crypto from 'crypto';
import { prisma } from '../../config/db.js';
import { WidgetType, ChartType } from '@prisma/client';

// ─── Types ─────────────────────────────────────────────────────────
export interface CreateDashboardInput {
  title: string;
  description?: string;
}

export interface CreateWidgetInput {
  type: WidgetType;
  title?: string;
  savedQueryId?: string;        // REQ-DB-009
  naturalQuery?: string;        // REQ-DB-009
  chartType?: ChartType;
  chartConfig?: Record<string, unknown>;
  gridPosition: { x: number; y: number; w: number; h: number };
  markdownContent?: string;     // REQ-DB-008: text/markdown
}

export interface UpdateLayoutInput {
  widgets: Array<{
    widgetId: string;
    gridPosition: { x: number; y: number; w: number; h: number };
  }>;
}

// ─── Create Dashboard ──────────────────────────────────────────────
export async function createDashboard(
  userId: string,
  orgId: string,
  input: CreateDashboardInput,
) {
  return prisma.dashboard.create({
    data: {
      title: input.title,
      description: input.description,
      userId,
      organizationId: orgId,
    },
  });
}

// ─── Add Widget ────────────────────────────────────────────────────
export async function addWidget(
  dashboardId: string,
  input: CreateWidgetInput,
) {
  return prisma.dashboardWidget.create({
    data: {
      dashboardId,
      type: input.type,
      title: input.title,
      savedQueryId: input.savedQueryId,
      naturalQuery: input.naturalQuery,
      chartType: input.chartType,
      chartConfig: input.chartConfig,
      gridPosition: input.gridPosition,
      markdownContent: input.markdownContent,
    },
  });
}

// ─── Update Layout (after drag & drop) ─────────────────────────────
export async function updateLayout(
  dashboardId: string,
  input: UpdateLayoutInput,
) {
  const updates = input.widgets.map((w) =>
    prisma.dashboardWidget.update({
      where: { id: w.widgetId },
      data: { gridPosition: w.gridPosition },
    }),
  );

  await prisma.$transaction(updates);
}

// ─── Duplicate Dashboard (REQ-DB-013) ──────────────────────────────
export async function duplicateDashboard(
  dashboardId: string,
  userId: string,
  orgId: string,
) {
  const source = await prisma.dashboard.findUniqueOrThrow({
    where: { id: dashboardId },
    include: { widgets: true },
  });

  const newDashboard = await prisma.dashboard.create({
    data: {
      title: `${source.title} (Copy)`,
      description: source.description,
      userId,
      organizationId: orgId,
      layout: source.layout,
      filters: source.filters,
    },
  });

  // Duplicate widgets
  for (const widget of source.widgets) {
    await prisma.dashboardWidget.create({
      data: {
        dashboardId: newDashboard.id,
        type: widget.type,
        title: widget.title,
        savedQueryId: widget.savedQueryId,
        naturalQuery: widget.naturalQuery,
        chartType: widget.chartType,
        chartConfig: widget.chartConfig,
        gridPosition: widget.gridPosition,
        markdownContent: widget.markdownContent,
      },
    });
  }

  return newDashboard;
}

// ─── Share Dashboard (REQ-DB-012) ──────────────────────────────────
export async function shareDashboard(
  dashboardId: string,
  targetUserId: string,
  canEdit: boolean = false,
) {
  return prisma.dashboardShare.upsert({
    where: {
      dashboardId_userId: { dashboardId, userId: targetUserId },
    },
    update: { canEdit },
    create: { dashboardId, userId: targetUserId, canEdit },
  });
}

// ─── Generate Public Link (REQ-DB-012) ─────────────────────────────
export async function generatePublicLink(dashboardId: string) {
  const slug = crypto.randomBytes(16).toString('hex');
  return prisma.dashboard.update({
    where: { id: dashboardId },
    data: { isPublic: true, publicSlug: slug },
  });
}

// ─── Archive / Delete (REQ-DB-013) ─────────────────────────────────
export async function archiveDashboard(dashboardId: string) {
  return prisma.dashboard.update({
    where: { id: dashboardId },
    data: { isArchived: true },
  });
}

export async function deleteDashboard(dashboardId: string) {
  return prisma.dashboard.delete({ where: { id: dashboardId } });
}

// ─── Update Dashboard Filters (REQ-DB-010) ─────────────────────────
export async function updateDashboardFilters(
  dashboardId: string,
  filters: Record<string, unknown>,
) {
  return prisma.dashboard.update({
    where: { id: dashboardId },
    data: { filters },
  });
}

// ─── Refresh Widget (REQ-DB-011) ───────────────────────────────────
export async function refreshWidget(widgetId: string) {
  return prisma.dashboardWidget.update({
    where: { id: widgetId },
    data: { lastRefreshedAt: new Date(), cachedData: null },
  });
}
```

---

## 2. Dashboard Grid Component — `apps/web/src/components/dashboard/DashboardGrid.tsx`

```tsx
/**
 * DashboardGrid.tsx — 12-column responsive drag-and-drop grid.
 *
 * REQ-DB-007: react-grid-layout, resize and reorder widgets.
 * REQ-DB-010: Dashboard-level filters applied across all widgets.
 * REQ-DB-011: Manual refresh + per-widget last-refreshed timestamp.
 * REQ-DB-014: Cross-filtering between widgets.
 */

import React, { useState, useCallback } from 'react';
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
  dashboardId,
  widgets,
  filters,
  isEditable,
  onLayoutChange,
  onFilterChange,
  onRefreshWidget,
  onAddWidget,
}: DashboardGridProps) {
  // REQ-DB-014: Cross-filtering state
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

  // REQ-DB-014: Handle cross-filter click from a widget
  const handleCrossFilter = useCallback(
    (widgetId: string, filterData: Record<string, unknown>) => {
      setCrossFilter({ sourceWidgetId: widgetId, ...filterData });
    },
    [],
  );

  return (
    <div className="dashboard-container">
      {/* Dashboard-level Filters — REQ-DB-010 */}
      <DashboardFilters
        filters={filters}
        onChange={onFilterChange}
      />

      {/* Add Widget Button */}
      {isEditable && (
        <button className="add-widget-btn" onClick={onAddWidget}>
          + Add Widget
        </button>
      )}

      {/* Responsive Grid — REQ-DB-007 */}
      <ResponsiveGrid
        className="dashboard-grid"
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4 }}
        rowHeight={100}
        isDraggable={isEditable}
        isResizable={isEditable}
        onLayoutChange={(layout) => onLayoutChange(layout)}
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
```

---

## 3. Dashboard Widget — `apps/web/src/components/dashboard/DashboardWidget.tsx`

```tsx
/**
 * DashboardWidget.tsx — Individual widget renderer.
 *
 * REQ-DB-008: Charts, KPI cards, data tables, text/markdown.
 * REQ-DB-011: Last-refreshed timestamp and manual refresh.
 * REQ-DB-015: Drill-down on data point click.
 */

import React from 'react';
import { ChartRenderer } from '../charts/ChartRenderer';
import ReactMarkdown from 'react-markdown';

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
        return (
          <div className="kpi-widget">
            <div className="kpi-value-large">
              {widget.cachedData
                ? String(Object.values(widget.cachedData as Record<string, unknown>)[0] ?? '-')
                : '-'}
            </div>
            <div className="kpi-label-small">{widget.title ?? 'KPI'}</div>
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
          {/* REQ-DB-011: Last refreshed timestamp */}
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
```

---

## 4. Dashboard Routes — `apps/api/src/routes/dashboards.routes.ts`

```typescript
/**
 * dashboards.routes.ts — Dashboard management API.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { WidgetType, ChartType } from '@prisma/client';
import { prisma } from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';
import { rbac } from '../middleware/rbac.js';
import {
  createDashboard, addWidget, updateLayout,
  duplicateDashboard, shareDashboard, generatePublicLink,
  archiveDashboard, deleteDashboard,
  updateDashboardFilters, refreshWidget,
} from '../services/dashboard/dashboard.service.js';

const router = Router();
router.use(authMiddleware);

// ─── POST /api/dashboards ──────────────────────────────────────────
router.post('/', async (req: Request, res: Response) => {
  const input = z.object({
    title: z.string().min(1).max(255),
    description: z.string().optional(),
  }).parse(req.body);

  const dashboard = await createDashboard(
    req.user!.userId,
    req.user!.organizationId,
    input,
  );
  res.status(201).json(dashboard);
});

// ─── GET /api/dashboards ───────────────────────────────────────────
router.get('/', async (req: Request, res: Response) => {
  const dashboards = await prisma.dashboard.findMany({
    where: {
      organizationId: req.user!.organizationId,
      isArchived: false,
      OR: [
        { userId: req.user!.userId },
        { shares: { some: { userId: req.user!.userId } } },
      ],
    },
    orderBy: { updatedAt: 'desc' },
    include: {
      user: { select: { firstName: true, lastName: true } },
      _count: { select: { widgets: true } },
    },
  });
  res.json(dashboards);
});

// ─── GET /api/dashboards/:id ───────────────────────────────────────
router.get('/:id', async (req: Request, res: Response) => {
  const dashboard = await prisma.dashboard.findUniqueOrThrow({
    where: { id: req.params.id },
    include: {
      widgets: { orderBy: { createdAt: 'asc' } },
      user: { select: { firstName: true, lastName: true } },
    },
  });
  res.json(dashboard);
});

// ─── POST /api/dashboards/:id/widgets ──────────────────────────────
router.post('/:id/widgets', async (req: Request, res: Response) => {
  const input = z.object({
    type: z.nativeEnum(WidgetType),
    title: z.string().optional(),
    savedQueryId: z.string().optional(),
    naturalQuery: z.string().optional(),
    chartType: z.nativeEnum(ChartType).optional(),
    chartConfig: z.record(z.unknown()).optional(),
    gridPosition: z.object({
      x: z.number(), y: z.number(), w: z.number(), h: z.number(),
    }),
    markdownContent: z.string().optional(),
  }).parse(req.body);

  const widget = await addWidget(req.params.id, input);
  res.status(201).json(widget);
});

// ─── PUT /api/dashboards/:id/layout ────────────────────────────────
router.put('/:id/layout', async (req: Request, res: Response) => {
  const input = z.object({
    widgets: z.array(z.object({
      widgetId: z.string(),
      gridPosition: z.object({
        x: z.number(), y: z.number(), w: z.number(), h: z.number(),
      }),
    })),
  }).parse(req.body);

  await updateLayout(req.params.id, input);
  res.json({ message: 'Layout updated' });
});

// ─── POST /api/dashboards/:id/duplicate ────────────────────────────
router.post('/:id/duplicate', async (req: Request, res: Response) => {
  const dashboard = await duplicateDashboard(
    req.params.id,
    req.user!.userId,
    req.user!.organizationId,
  );
  res.status(201).json(dashboard);
});

// ─── POST /api/dashboards/:id/share ────────────────────────────────
router.post('/:id/share', async (req: Request, res: Response) => {
  const { userId, canEdit } = z.object({
    userId: z.string(),
    canEdit: z.boolean().default(false),
  }).parse(req.body);

  await shareDashboard(req.params.id, userId, canEdit);
  res.json({ message: 'Dashboard shared' });
});

// ─── POST /api/dashboards/:id/public-link ──────────────────────────
router.post('/:id/public-link', rbac('ORG_ADMIN'), async (req: Request, res: Response) => {
  const result = await generatePublicLink(req.params.id);
  res.json({ publicUrl: `/public/dashboards/${result.publicSlug}` });
});

// ─── PUT /api/dashboards/:id/filters ───────────────────────────────
router.put('/:id/filters', async (req: Request, res: Response) => {
  const filters = req.body;
  await updateDashboardFilters(req.params.id, filters);
  res.json({ message: 'Filters updated' });
});

// ─── POST /api/dashboards/:id/widgets/:wid/refresh ─────────────────
router.post('/:id/widgets/:wid/refresh', async (req: Request, res: Response) => {
  await refreshWidget(req.params.wid);
  res.json({ message: 'Widget refreshed' });
});

// ─── DELETE /api/dashboards/:id ────────────────────────────────────
router.delete('/:id', async (req: Request, res: Response) => {
  await deleteDashboard(req.params.id);
  res.json({ message: 'Dashboard deleted' });
});

// ─── POST /api/dashboards/:id/archive ──────────────────────────────
router.post('/:id/archive', async (req: Request, res: Response) => {
  await archiveDashboard(req.params.id);
  res.json({ message: 'Dashboard archived' });
});

export { router as dashboardRoutes };
```

---

## 5. Verification Checklist

| Step | Action | Expected |
|------|--------|----------|
| Create dashboard | `POST /api/dashboards` | 201 + dashboard object |
| Add chart widget | `POST /api/dashboards/:id/widgets` | Widget with grid position |
| Add markdown widget | Widget type TEXT_MARKDOWN | Rendered markdown content |
| Drag & drop | Rearrange widgets | Layout saved via PUT |
| Dashboard filters | Set date range filter | All widgets re-query with filter |
| Cross-filter | Click bar in chart A | Chart B filters by clicked value |
| Duplicate dashboard | `POST /:id/duplicate` | New dashboard with all widgets |
| Share dashboard | `POST /:id/share` | Shared user can view |
| Public link | Generate public slug | Accessible without auth |
| Refresh widget | Click ↻ | Cache cleared, fresh data |
| Archive dashboard | `POST /:id/archive` | Removed from main list |

---

## Next Skill → `09_file_upload_skill.md`
