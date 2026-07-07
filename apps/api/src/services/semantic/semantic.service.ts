import { prisma } from '../../config/db.js';

const SEMANTIC_CACHE_PREFIX = 'semantic:';
const SEMANTIC_CACHE_TTL_MS = 300 * 1000; // 5 minutes

// In-memory semantic layer cache (replaces Redis)
const semanticCache = new Map<string, { data: SemanticLayer; expiresAt: number }>();

export interface MetricInput {
  name: string;
  description?: string;
  formula: string; // SQL expression, e.g. "SUM(order_total)"
  dataType: string; // number, currency, percentage
  formatPattern?: string; // e.g. "$#,##0.00"
}

export interface DimensionInput {
  name: string;
  description?: string;
  sourceTable: string;
  sourceColumn: string;
  dataType: string;
  synonyms?: string[]; // Alternative names for NLP matching
}

export async function createMetric(
  orgId: string,
  input: MetricInput,
): Promise<{ id: string; version: number }> {
  const metric = await prisma.semanticMetric.create({
    data: {
      name: input.name,
      description: input.description,
      formula: input.formula,
      dataType: input.dataType,
      formatPattern: input.formatPattern,
      version: 1,
      organizationId: orgId,
    },
  });

  invalidateSemanticCache(orgId);
  return { id: metric.id, version: metric.version };
}

export async function updateMetric(
  metricId: string,
  orgId: string,
  input: MetricInput,
): Promise<{ id: string; version: number }> {
  const existing = await prisma.semanticMetric.findUniqueOrThrow({
    where: { id: metricId },
  });

  await prisma.semanticMetric.update({
    where: { id: metricId },
    data: { isActive: false },
  });

  const newMetric = await prisma.semanticMetric.create({
    data: {
      name: input.name,
      description: input.description,
      formula: input.formula,
      dataType: input.dataType,
      formatPattern: input.formatPattern,
      version: existing.version + 1,
      organizationId: orgId,
    },
  });

  invalidateSemanticCache(orgId);
  return { id: newMetric.id, version: newMetric.version };
}

export async function deleteMetric(metricId: string, orgId: string): Promise<void> {
  await prisma.semanticMetric.update({
    where: { id: metricId },
    data: { isActive: false },
  });
  invalidateSemanticCache(orgId);
}

export async function createDimension(
  orgId: string,
  input: DimensionInput,
): Promise<{ id: string; version: number }> {
  const dimension = await prisma.semanticDimension.create({
    data: {
      name: input.name,
      description: input.description,
      sourceTable: input.sourceTable,
      sourceColumn: input.sourceColumn,
      dataType: input.dataType,
      synonyms: JSON.stringify(input.synonyms ?? []),
      version: 1,
      organizationId: orgId,
    },
  });

  invalidateSemanticCache(orgId);
  return { id: dimension.id, version: dimension.version };
}

export async function updateDimension(
  dimensionId: string,
  orgId: string,
  input: DimensionInput,
): Promise<{ id: string; version: number }> {
  const existing = await prisma.semanticDimension.findUniqueOrThrow({
    where: { id: dimensionId },
  });

  await prisma.semanticDimension.update({
    where: { id: dimensionId },
    data: { isActive: false },
  });

  const newDim = await prisma.semanticDimension.create({
    data: {
      name: input.name,
      description: input.description,
      sourceTable: input.sourceTable,
      sourceColumn: input.sourceColumn,
      dataType: input.dataType,
      synonyms: JSON.stringify(input.synonyms ?? []),
      version: existing.version + 1,
      organizationId: orgId,
    },
  });

  invalidateSemanticCache(orgId);
  return { id: newDim.id, version: newDim.version };
}

export interface SemanticLayer {
  metrics: Array<{
    id: string;
    name: string;
    description: string | null;
    formula: string;
    dataType: string;
    formatPattern: string | null;
    version: number;
  }>;
  dimensions: Array<{
    id: string;
    name: string;
    description: string | null;
    sourceTable: string;
    sourceColumn: string;
    dataType: string;
    synonyms: string[];
    version: number;
  }>;
}

export async function getSemanticLayer(orgId: string): Promise<SemanticLayer> {
  const cacheKey = `${SEMANTIC_CACHE_PREFIX}${orgId}`;

  const entry = semanticCache.get(cacheKey);
  if (entry && Date.now() < entry.expiresAt) {
    return entry.data;
  }

  const [metrics, dimensions] = await Promise.all([
    prisma.semanticMetric.findMany({
      where: { organizationId: orgId, isActive: true },
      orderBy: { name: 'asc' },
    }),
    prisma.semanticDimension.findMany({
      where: { organizationId: orgId, isActive: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  const layer: SemanticLayer = {
    metrics: metrics.map((m) => ({
      id: m.id,
      name: m.name,
      description: m.description,
      formula: m.formula,
      dataType: m.dataType,
      formatPattern: m.formatPattern,
      version: m.version,
    })),
    dimensions: dimensions.map((d) => ({
      id: d.id,
      name: d.name,
      description: d.description,
      sourceTable: d.sourceTable,
      sourceColumn: d.sourceColumn,
      dataType: d.dataType,
      synonyms: d.synonyms ? (JSON.parse(d.synonyms) as string[]) : [],
      version: d.version,
    })),
  };

  semanticCache.set(cacheKey, { data: layer, expiresAt: Date.now() + SEMANTIC_CACHE_TTL_MS });

  return layer;
}

export function formatSemanticForPrompt(layer: SemanticLayer): string {
  if (layer.metrics.length === 0 && layer.dimensions.length === 0) {
    return '';
  }

  let prompt = '## Business Semantic Layer\n\n';

  if (layer.metrics.length > 0) {
    prompt += '### Business Metrics\n';
    prompt += 'Use these predefined metrics when the user references these concepts:\n\n';
    for (const m of layer.metrics) {
      prompt += `- **${m.name}**: ${m.description ?? 'No description'}\n`;
      prompt += `  SQL Formula: \`${m.formula}\`\n`;
      prompt += `  Data Type: ${m.dataType}${m.formatPattern ? ` (format: ${m.formatPattern})` : ''}\n\n`;
    }
  }

  if (layer.dimensions.length > 0) {
    prompt += '### Business Dimensions\n';
    prompt += 'Map these business terms to their actual table/column references:\n\n';
    for (const d of layer.dimensions) {
      const synonymStr = d.synonyms.length > 0 ? ` (also known as: ${d.synonyms.join(', ')})` : '';
      prompt += `- **${d.name}**${synonymStr}: ${d.sourceTable}.${d.sourceColumn} (${d.dataType})\n`;
      if (d.description) prompt += `  ${d.description}\n`;
    }
  }

  return prompt;
}

function invalidateSemanticCache(orgId: string): void {
  semanticCache.delete(`${SEMANTIC_CACHE_PREFIX}${orgId}`);
}
