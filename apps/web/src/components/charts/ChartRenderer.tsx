import { useState, useMemo } from 'react';
import { BarChart, LineChart, PieChart, MetricCard } from '../visualizations';

interface ChartRendererProps {
  data: Record<string, unknown>[];
  columns: Array<{ name: string; dataType: string }>;
  chartType: string;
  messageId?: string | null;
  onDrillDown?: (dataPoint: Record<string, unknown>) => void;
}

export function ChartRenderer({
  data,
  columns,
  chartType: initialChartType,
  onDrillDown,
}: ChartRendererProps) {
  const [chartType, setChartType] = useState(initialChartType);

  const numericColumns = useMemo(
    () => columns.filter((c) =>
      ['integer', 'bigint', 'decimal', 'numeric', 'float', 'double', 'number']
        .some((t) => c.dataType.toLowerCase().includes(t)),
    ),
    [columns],
  );

  const categoryColumns = useMemo(
    () => columns.filter((c) => !numericColumns.includes(c)),
    [columns, numericColumns],
  );

  const categoryKey = categoryColumns[0]?.name ?? columns[0]?.name ?? 'name';
  const numericKeys = numericColumns.map(c => c.name);

  const availableTypes = ['BAR', 'LINE', 'PIE', 'KPI'];

  const renderChart = () => {
    switch (chartType) {
      case 'BAR':
        return (
          <BarChart 
            data={data} 
            xAxisKey={categoryKey} 
            seriesKeys={numericKeys} 
            height="100%" 
            onCrossFilter={onDrillDown ? (key, value) => onDrillDown({ [key]: value }) : undefined}
          />
        );

      case 'LINE':
        return (
          <LineChart 
            data={data} 
            xAxisKey={categoryKey} 
            seriesKeys={numericKeys} 
            height="100%" 
            onCrossFilter={onDrillDown ? (key, value) => onDrillDown({ [key]: value }) : undefined}
          />
        );

      case 'PIE':
        return (
          <PieChart 
            data={data} 
            nameKey={categoryKey} 
            dataKey={numericKeys[0] ?? ''} 
            height="100%" 
            onCrossFilter={onDrillDown ? (key, value) => onDrillDown({ [key]: value }) : undefined}
          />
        );

      case 'KPI':
        return (
          <div className="grid grid-cols-2 gap-4 h-full p-4 items-center">
            {numericKeys.length > 0 ? numericKeys.map((col) => (
              <MetricCard 
                key={col} 
                title={col} 
                value={Number(data[0]?.[col] ?? 0)} 
              />
            )) : (
              <div className="col-span-2 text-center text-slate-500">No numeric metrics to display</div>
            )}
          </div>
        );

      default:
        return (
          <div className="flex items-center justify-center h-full text-slate-500 bg-slate-900/20 rounded-xl border border-dashed border-slate-700/50">
            Visualization not supported.
          </div>
        );
    }
  };

  return (
    <div className="w-full h-full flex flex-col min-h-[300px]">
      <div className="flex items-center gap-2 mb-2 shrink-0 overflow-x-auto pb-1 scrollbar-thin">
        {availableTypes.map((type) => (
          <button
            key={type}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors border ${
              chartType === type 
                ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_10px_rgba(37,99,235,0.3)]' 
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
            onClick={() => setChartType(type)}
          >
            {type}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-[250px] overflow-hidden">
        {renderChart()}
      </div>
    </div>
  );
}
