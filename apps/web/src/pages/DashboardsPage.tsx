import React from 'react';
import { Plus, BarChart2 } from 'lucide-react';
import { motion } from 'framer-motion';

export function DashboardsPage() {
  const dashboards = [
    { id: 1, title: 'Executive Overview', widgets: 5, lastUpdated: '2 hours ago' },
    { id: 2, title: 'Marketing Analytics', widgets: 8, lastUpdated: '1 day ago' },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">Dashboards</h1>
        <button className="flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-orange-500/20">
          <Plus size={20} />
          New Dashboard
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dashboards.map((board, i) => (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            key={board.id} 
            className="bg-slate-900/50 backdrop-blur-md border border-slate-800 p-6 rounded-2xl hover:border-slate-600 transition-all cursor-pointer group hover:shadow-xl hover:-translate-y-1"
          >
            <div className="w-12 h-12 bg-orange-900/30 text-orange-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <BarChart2 size={24} />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">{board.title}</h3>
            <p className="text-slate-400 text-sm">{board.widgets} widgets • Updated {board.lastUpdated}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
