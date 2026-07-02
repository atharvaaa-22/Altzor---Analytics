import crypto from 'crypto';
import { prisma } from '../../config/db.js';
import { ChartType } from '../ai/chartDetector.js';

export const WidgetType = {
  CHART: 'CHART',
  KPI_CARD: 'KPI_CARD',
  DATA_TABLE: 'DATA_TABLE',
  TEXT_MARKDOWN: 'TEXT_MARKDOWN',
} as const;
export type WidgetType = (typeof WidgetType)[keyof typeof WidgetType];

export interface CreateDashboardInput {
  title: string;
  description?: string;
}

export interface CreateWidgetInput {
  type: WidgetType;
  title?: string;
  savedQueryId?: string;
  naturalQuery?: string;
  chartType?: ChartType | string;
  chartConfig?: Record<string, unknown>;
  gridPosition: { x: number; y: number; w: number; h: number };
  markdownContent?: string;
}

export interface UpdateLayoutInput {
  widgets: Array<{
    widgetId: string;
    gridPosition: { x: number; y: number; w: number; h: number };
  }>;
}

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
      chartConfig: input.chartConfig ? JSON.stringify(input.chartConfig) : undefined,
      gridPosition: JSON.stringify(input.gridPosition),
      markdownContent: input.markdownContent,
    },
  });
}

export async function updateLayout(
  dashboardId: string,
  input: UpdateLayoutInput,
) {
  const updates = input.widgets.map((w) =>
    prisma.dashboardWidget.update({
      where: { id: w.widgetId },
      data: { gridPosition: JSON.stringify(w.gridPosition) },
    }),
  );

  await prisma.$transaction(updates);
}

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

export async function generatePublicLink(dashboardId: string) {
  const slug = crypto.randomBytes(16).toString('hex');
  return prisma.dashboard.update({
    where: { id: dashboardId },
    data: { isPublic: true, publicSlug: slug },
  });
}

export async function archiveDashboard(dashboardId: string) {
  return prisma.dashboard.update({
    where: { id: dashboardId },
    data: { isArchived: true },
  });
}

export async function deleteDashboard(dashboardId: string) {
  return prisma.dashboard.delete({ where: { id: dashboardId } });
}

export async function updateDashboardFilters(
  dashboardId: string,
  filters: Record<string, unknown>,
) {
  return prisma.dashboard.update({
    where: { id: dashboardId },
    data: { filters: JSON.stringify(filters) },
  });
}

export async function refreshWidget(widgetId: string) {
  return prisma.dashboardWidget.update({
    where: { id: widgetId },
    data: { lastRefreshedAt: new Date(), cachedData: null },
  });
}
