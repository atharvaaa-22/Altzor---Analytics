import type { JSX } from 'react';
import { Plus, BarChart2, Clock, Layers } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';

export function DashboardsPage(): JSX.Element {
  const dashboards = [
    {
      id: 1,
      title: 'Executive Overview',
      widgets: 5,
      lastUpdated: '2 hours ago',
      category: 'Finance',
    },
    {
      id: 2,
      title: 'Marketing Analytics',
      widgets: 8,
      lastUpdated: '1 day ago',
      category: 'Marketing',
    },
    { id: 3, title: 'Sales Pipeline', widgets: 6, lastUpdated: '3 hours ago', category: 'Sales' },
  ];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboards</h1>
          <p className="text-sm text-slate-500 mt-1">
            Build and share data visualizations across your team.
          </p>
        </div>
        <Button variant="primary" icon={<Plus size={16} />}>
          New Dashboard
        </Button>
      </div>

      {dashboards.length === 0 ? (
        <EmptyState
          icon={<BarChart2 size={28} />}
          title="No dashboards yet"
          description="Create your first dashboard to start visualizing your data in charts and tables."
          action={{ label: 'Create Dashboard', onClick: () => {} }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {dashboards.map((board, i) => (
            <motion.div
              key={board.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07, duration: 0.25 }}
            >
              <Link to={`/dashboards/${board.id}`}>
                <div className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-md hover:border-slate-300 transition-all duration-200 group cursor-pointer">
                  {/* Chart preview placeholder */}
                  <div className="w-full h-28 bg-slate-50 rounded-lg border border-slate-100 mb-4 overflow-hidden flex items-center justify-center">
                    <div className="flex items-end gap-1.5 h-16">
                      {[40, 65, 45, 80, 55, 90, 70].map((h, j) => (
                        <div
                          key={j}
                          className="w-4 bg-indigo-200 group-hover:bg-indigo-400 rounded-sm transition-colors duration-300"
                          style={{ height: `${h}%` }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <span className="text-xs font-medium text-indigo-600 mb-1 inline-block">
                        {board.category}
                      </span>
                      <h3 className="text-sm font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors truncate">
                        {board.title}
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Layers size={12} />
                      {board.widgets} widgets
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {board.lastUpdated}
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
