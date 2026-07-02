import { PieChart as RechartsPieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { ChartWrapper, CustomTooltip } from './ChartWrapper';
import { chartColors, formatValue } from './utils/colors';

interface PieChartProps {
  data: any[];
  nameKey: string;
  dataKey: string;
  height?: number | string;
  onCrossFilter?: (key: string, value: any) => void;
  valueFormat?: 'number' | 'currency' | 'percent';
}

export function PieChart({ data, nameKey, dataKey, height, onCrossFilter, valueFormat }: PieChartProps) {
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
          onClick={(entry) => onCrossFilter && onCrossFilter(nameKey, entry[nameKey])}
          cursor={onCrossFilter ? 'pointer' : 'default'}
          stroke="#0f172a"
          strokeWidth={2}
        >
          {data?.map((_, index) => (
            <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
          ))}
        </Pie>
        <Tooltip 
          content={<CustomTooltip formatter={(val: any) => formatValue(val, valueFormat)} />} 
        />
        <Legend wrapperStyle={{ fontSize: '12px' }} />
      </RechartsPieChart>
    </ChartWrapper>
  );
}
