import type { JSX } from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { ChartWrapper, CustomTooltip } from './ChartWrapper';
import { chartColors, formatValue } from './utils/colors';

type ChartValue = string | number;
type ChartDataRow = Record<string, unknown>;

interface BarChartProps {
  data: ChartDataRow[];
  xAxisKey: string;
  seriesKeys: string[];
  height?: number | string;
  onCrossFilter?: (key: string, value: ChartValue) => void;
  valueFormat?: 'number' | 'currency' | 'percent';
}

function isChartValue(value: unknown): value is ChartValue {
  return typeof value === 'string' || typeof value === 'number';
}

export function BarChart({
  data,
  xAxisKey,
  seriesKeys,
  height,
  onCrossFilter,
  valueFormat,
}: BarChartProps): JSX.Element {
  return (
    <ChartWrapper data={data} height={height}>
      <RechartsBarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />

        <XAxis
          dataKey={xAxisKey}
          stroke="#94a3b8"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          dy={10}
        />

        <YAxis
          stroke="#94a3b8"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value: string | number) => formatValue(value, valueFormat)}
        />

        <Tooltip
          content={
            <CustomTooltip
              formatter={(value: string | number) => formatValue(value, valueFormat)}
            />
          }
          cursor={{ fill: '#1e293b' }}
        />

        <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />

        {seriesKeys.map((key, index) => (
          <Bar
            key={key}
            dataKey={key}
            fill={chartColors[index % chartColors.length]}
            radius={[4, 4, 0, 0]}
            onClick={(barData) => {
              if (!onCrossFilter) {
                return;
              }

              const payload: unknown = barData.payload;

              if (typeof payload !== 'object' || payload === null) {
                return;
              }

              const value = (payload as ChartDataRow)[xAxisKey];

              if (isChartValue(value)) {
                onCrossFilter(xAxisKey, value);
              }
            }}
            cursor={onCrossFilter ? 'pointer' : 'default'}
            activeBar={{ stroke: '#fff', strokeWidth: 1 }}
          />
        ))}
      </RechartsBarChart>
    </ChartWrapper>
  );
}
