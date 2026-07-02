export const ChartType = {
  TABLE: 'TABLE',
  KPI: 'KPI',
  LINE: 'LINE',
  BAR: 'BAR',
  PIE: 'PIE',
  SCATTER: 'SCATTER',
  HEATMAP: 'HEATMAP',
} as const;

export type ChartType = (typeof ChartType)[keyof typeof ChartType];

interface ColumnInfo {
  name: string;
  dataType: string;
}

export function detectChartType(
  columns: ColumnInfo[],
  rowCount: number,
): ChartType {
  if (rowCount === 1 && columns.length === 1) {
    return ChartType.KPI;
  }

  if (rowCount === 1 && columns.length <= 5) {
    return ChartType.KPI;
  }

  const numericCols = columns.filter((c) =>
    ['integer', 'bigint', 'decimal', 'numeric', 'float', 'double', 'real', 'money', 'number']
      .some((t) => c.dataType.toLowerCase().includes(t)),
  );

  const dateCols = columns.filter((c) =>
    ['date', 'timestamp', 'datetime', 'time']
      .some((t) => c.dataType.toLowerCase().includes(t)),
  );

  const categoryCols = columns.filter((c) =>
    !numericCols.includes(c) && !dateCols.includes(c),
  );

  if (dateCols.length >= 1 && numericCols.length >= 1) {
    return ChartType.LINE;
  }

  if (categoryCols.length === 1 && numericCols.length === 1) {
    if (rowCount <= 8) return ChartType.PIE;
    return ChartType.BAR;
  }

  if (categoryCols.length >= 1 && numericCols.length >= 2) {
    return ChartType.BAR;
  }

  if (numericCols.length === 2 && categoryCols.length === 0) {
    return ChartType.SCATTER;
  }

  if (categoryCols.length === 2 && numericCols.length === 1) {
    return ChartType.HEATMAP;
  }

  if (columns.length > 6 || rowCount > 100) {
    return ChartType.TABLE;
  }

  return ChartType.TABLE;
}
