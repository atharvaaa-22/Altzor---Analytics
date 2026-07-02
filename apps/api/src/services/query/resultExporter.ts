export function exportToCsv(
  rows: Record<string, unknown>[],
  columns: Array<{ name: string }>,
): string {
  if (rows.length === 0) return '';

  const header = columns.map((c) => escapeCsvField(c.name)).join(',');
  const lines = rows.map((row) =>
    columns.map((c) => escapeCsvField(String(row[c.name] ?? ''))).join(','),
  );

  return [header, ...lines].join('\n');
}

function escapeCsvField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

export function exportToJson(rows: Record<string, unknown>[]): string {
  return JSON.stringify(rows, null, 2);
}
