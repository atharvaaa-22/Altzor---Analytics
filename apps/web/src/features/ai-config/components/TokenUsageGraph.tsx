import type React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Mon', input: 4000, output: 2400 },
  { name: 'Tue', input: 3000, output: 1398 },
  { name: 'Wed', input: 2000, output: 9800 },
  { name: 'Thu', input: 2780, output: 3908 },
  { name: 'Fri', input: 1890, output: 4800 },
  { name: 'Sat', input: 2390, output: 3800 },
  { name: 'Sun', input: 3490, output: 4300 },
];

export function TokenUsageGraph(): React.JSX.Element {
  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
            Token Usage Preview
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Estimated token consumption for current billing cycle.
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-white tracking-tight">43.2k</div>
          <div className="text-xs font-medium text-emerald-400 mt-0.5">Total Tokens</div>
        </div>
      </div>

      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
            <XAxis
              dataKey="name"
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              dy={10}
            />
            <YAxis
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => `${(val as number) / 1000}k`}
            />
            <Tooltip
              cursor={{ fill: '#1e293b' }}
              contentStyle={{
                background: '#0f172a',
                border: '1px solid #1e293b',
                borderRadius: '8px',
              }}
              itemStyle={{ fontSize: '12px' }}
              labelStyle={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}
            />
            <Bar dataKey="input" name="Input Tokens" stackId="a" fill="#3b82f6" />
            <Bar
              dataKey="output"
              name="Output Tokens"
              stackId="a"
              fill="#10b981"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
