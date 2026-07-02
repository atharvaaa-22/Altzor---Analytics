import React from 'react';
import { Widget, useDashboardStore } from '../stores/dashboardStore';
import { MoreVertical, Trash2 } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const mockData = [
  { name: 'Jan', value: 400 },
  { name: 'Feb', value: 300 },
  { name: 'Mar', value: 600 },
  { name: 'Apr', value: 800 },
];

export const WidgetContainer = ({ widget }: { widget: Widget }) => {
  const { isEditing, removeWidget } = useDashboardStore();

  const renderChart = () => {
    switch(widget.type) {
      case 'metric':
        return (
          <div className="flex flex-col items-center justify-center h-full">
            <span className="text-4xl font-bold text-white">$24,500</span>
            <span className="text-emerald-400 text-sm mt-2">+14% vs last month</span>
          </div>
        );
      case 'line':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={mockData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }} />
              <Line type="monotone" dataKey="value" stroke="#ff6600" strokeWidth={3} dot={{ r: 4, fill: '#ff6600', strokeWidth: 2, stroke: '#0f172a' }} />
            </LineChart>
          </ResponsiveContainer>
        );
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={mockData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }} cursor={{ fill: '#1e293b' }} />
              <Bar dataKey="value" fill="#ff6600" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
      default:
        return <div className="text-slate-500 flex items-center justify-center h-full">Unsupported Widget</div>;
    }
  };

  return (
    <div className="w-full h-full bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl flex flex-col shadow-xl overflow-hidden group">
      <div className="px-4 py-3 border-b border-slate-800/50 flex justify-between items-center bg-slate-900/30">
        <h3 className="font-medium text-slate-200 text-sm truncate pr-2">{widget.title}</h3>
        {isEditing && (
          <button 
            onMouseDown={(e) => e.stopPropagation()} 
            onClick={() => removeWidget(widget.id)}
            className="text-slate-500 hover:text-red-400 transition-colors p-1 rounded-md hover:bg-red-500/10 cursor-pointer"
          >
            <Trash2 size={16} />
          </button>
        )}
        {!isEditing && (
          <button className="text-slate-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100">
            <MoreVertical size={16} />
          </button>
        )}
      </div>
      <div className="flex-1 p-4 min-h-0">
        {renderChart()}
      </div>
    </div>
  );
};
