import type { JSX } from 'react';
import { PieChart as RechartsPieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { ChartWrapper, CustomTooltip } from './ChartWrapper';
import { chartColors, formatValue } from './utils/colors';

type ChartValue = string | number;
type ChartDataRow = Record<string, unknown>;

interface PieChartProps {
  data: ChartDataRow[];
  nameKey: string;
  dataKey: string;
  height?: number | string;
  onCrossFilter?: (key: string, value: ChartValue) => void;
  valueFormat?: 'number' | 'currency' | 'percent';
}

function isChartValue(value: unknown): value is ChartValue {
  return typeof value === 'string' || typeof value === 'number';
}

export function PieChart({
  data,
  nameKey,
  dataKey,
  height,
  onCrossFilter,
  valueFormat,
}: PieChartProps): JSX.Element {
  return (
    <ChartWrapper data={data} height={height}>
      <RechartsPieChart margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
        <Pie
          data={data}
          nameKey={nameKey}
          dataKey={dataKey}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={80}
          paddingAngle={2}
          onClick={(entry) => {
            if (!onCrossFilter) {
              return;
            }

            const payload: unknown = entry.payload;

            if (typeof payload !== 'object' || payload === null) {
              return;
            }

            const value = (payload as ChartDataRow)[nameKey];

            if (isChartValue(value)) {
              onCrossFilter(nameKey, value);
            }
          }}
          cursor={onCrossFilter ? 'pointer' : 'default'}
          stroke="#0f172a"
          strokeWidth={2}
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
          ))}
        </Pie>

        <Tooltip
          content={
            <CustomTooltip
              formatter={(value: string | number) => formatValue(value, valueFormat)}
            />
          }
        />

        <Legend wrapperStyle={{ fontSize: '12px' }} />
      </RechartsPieChart>
    </ChartWrapper>
  );
}
