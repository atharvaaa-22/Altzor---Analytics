import { ReactNode } from 'react';
import { Ghost } from 'lucide-react';
import { ResponsiveContainer } from 'recharts';

interface ChartWrapperProps {
  data?: Record<string, unknown>[];
  children: ReactNode;
  height?: number | string;
}

export function ChartWrapper({
  data,
  children,
  height = '100%',
}: ChartWrapperProps): React.JSX.Element {
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 bg-slate-900/20 rounded-xl border border-dashed border-slate-700/50 p-6 min-h-[200px]">
        <Ghost className="w-12 h-12 mb-3 text-slate-600 opacity-50" />
        <p className="text-sm font-medium">No data available for this range</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height }} className="min-h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        {children as React.ReactElement}
      </ResponsiveContainer>
    </div>
  );
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ color: string; name: string; value: unknown }>;
  label?: string;
  formatter?: (val: unknown) => ReactNode;
}

export const CustomTooltip = ({
  active,
  payload,
  label,
  formatter,
}: CustomTooltipProps): React.JSX.Element | null => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 border border-slate-700 shadow-xl rounded-lg p-3 text-sm">
        <p className="font-medium text-slate-200 mb-2">{label}</p>
        {payload.map((entry, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4 mt-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-slate-400 capitalize">{entry.name}:</span>
            </div>
            <span className="font-semibold text-white">
              {formatter ? formatter(entry.value) : (entry.value as React.ReactNode)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};
