import type React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatValue } from './utils/colors';

interface MetricCardProps {
  title: string;
  value: number | string;
  trend?: number; // percentage change
  valueFormat?: 'number' | 'currency' | 'percent';
}

export function MetricCard({
  title,
  value,
  trend,
  valueFormat,
}: MetricCardProps): React.JSX.Element {
  const isPositive = trend !== undefined && trend > 0;
  const isNegative = trend !== undefined && trend < 0;

  return (
    <div className="flex flex-col justify-center h-full p-2">
      <h3 className="text-sm font-medium text-slate-400 mb-2 truncate" title={title}>
        {title}
      </h3>
      <div className="flex items-end gap-3 flex-wrap">
        <span className="text-4xl font-bold text-white tracking-tight">
          {formatValue(value, valueFormat)}
        </span>

        {trend !== undefined && (
          <div
            className={`flex items-center gap-1 text-sm font-medium mb-1 shrink-0 ${
              isPositive ? 'text-emerald-400' : isNegative ? 'text-rose-400' : 'text-slate-400'
            }`}
          >
            {isPositive ? (
              <TrendingUp size={16} />
            ) : isNegative ? (
              <TrendingDown size={16} />
            ) : (
              <Minus size={16} />
            )}
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
