export const chartColors = [
  '#3b82f6', // blue-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
];

export const formatValue = (
  value: number | string,
  format?: 'number' | 'currency' | 'percent',
): string | number => {
  if (typeof value !== 'number') return value;

  if (format === 'currency') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  }
  if (format === 'percent') {
    return new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 1 }).format(
      value,
    );
  }
  return new Intl.NumberFormat('en-US').format(value);
};
