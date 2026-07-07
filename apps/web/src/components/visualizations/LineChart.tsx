import type React from 'react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { ChartWrapper, CustomTooltip } from './ChartWrapper';
import { chartColors, formatValue } from './utils/colors';

interface LineChartProps {
  data: Record<string, unknown>[];
  xAxisKey: string;
  seriesKeys: string[];
  height?: number | string;
  onCrossFilter?: (key: string, value: unknown) => void;
  valueFormat?: 'number' | 'currency' | 'percent';
}

export function LineChart({
  data,
  xAxisKey,
  seriesKeys,
  height,
  onCrossFilter,
  valueFormat,
}: LineChartProps): React.JSX.Element {
  return (
    <ChartWrapper data={data} height={height}>
      <RechartsLineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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
          tickFormatter={(val: string | number): string => formatValue(val, valueFormat) as string}
        />
        <Tooltip
          content={
            <CustomTooltip
              formatter={(val: unknown): React.ReactNode => formatValue(val as number, valueFormat)}
            />
          }
          cursor={{ stroke: '#334155', strokeWidth: 1, strokeDasharray: '3 3' }}
        />
        <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
        {seriesKeys.map((key, index) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={chartColors[index % chartColors.length]}
            strokeWidth={2}
            dot={{ r: 4, strokeWidth: 2 }}
            activeDot={{
              r: 6,
              onClick: (e: unknown): void => {
                const payload = (e as Record<string, unknown>).payload as Record<string, unknown>;
                if (onCrossFilter && payload) onCrossFilter(xAxisKey, payload[xAxisKey]);
              },
              cursor: onCrossFilter ? 'pointer' : 'default',
            }}
          />
        ))}
      </RechartsLineChart>
    </ChartWrapper>
  );
}
