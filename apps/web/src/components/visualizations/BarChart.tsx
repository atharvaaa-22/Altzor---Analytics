import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { ChartWrapper, CustomTooltip } from './ChartWrapper';
import { chartColors, formatValue } from './utils/colors';

interface BarChartProps {
  data: any[];
  xAxisKey: string;
  seriesKeys: string[];
  height?: number | string;
  onCrossFilter?: (key: string, value: any) => void;
  valueFormat?: 'number' | 'currency' | 'percent';
}

export function BarChart({ data, xAxisKey, seriesKeys, height, onCrossFilter, valueFormat }: BarChartProps) {
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
          tickFormatter={(val) => formatValue(val, valueFormat) as string}
        />
        <Tooltip 
          content={<CustomTooltip formatter={(val: any) => formatValue(val, valueFormat)} />} 
          cursor={{ fill: '#1e293b' }} 
        />
        <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
        {seriesKeys.map((key, index) => (
          <Bar 
            key={key} 
            dataKey={key} 
            fill={chartColors[index % chartColors.length]} 
            radius={[4, 4, 0, 0]}
            onClick={(barData) => onCrossFilter && onCrossFilter(xAxisKey, barData[xAxisKey])}
            cursor={onCrossFilter ? 'pointer' : 'default'}
            activeBar={{ stroke: '#fff', strokeWidth: 1 }}
          />
        ))}
      </RechartsBarChart>
    </ChartWrapper>
  );
}
