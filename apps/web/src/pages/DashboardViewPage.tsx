import type React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Edit2, Check, Plus, RefreshCw, Share2 } from 'lucide-react';
import { DashboardGrid, useDashboardStore } from '../features/dashboards';
import { Button } from '../components/ui/Button';

export function DashboardViewPage(): React.JSX.Element {
  const { isEditing, setEditing } = useDashboardStore();

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Top bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link
            to="/dashboards"
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
          >
            <ArrowLeft size={17} />
          </Link>
          <div>
            <h1 className="text-base font-semibold text-slate-900">Executive Overview</h1>
            <p className="text-xs text-slate-400">Last refreshed 2 hours ago</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={<RefreshCw size={14} />}>
            Refresh
          </Button>
          <Button variant="secondary" size="sm" icon={<Share2 size={14} />}>
            Share
          </Button>
          {isEditing && (
            <Button variant="secondary" size="sm" icon={<Plus size={14} />}>
              Add Widget
            </Button>
          )}
          <Button
            variant={isEditing ? 'primary' : 'secondary'}
            size="sm"
            icon={isEditing ? <Check size={14} /> : <Edit2 size={14} />}
            onClick={(): void => setEditing(!isEditing)}
          >
            {isEditing ? 'Save Layout' : 'Edit'}
          </Button>
        </div>
      </div>

      {/* Dashboard content */}
      <div className="flex-1 overflow-auto p-6">
        <DashboardGrid />
      </div>
    </div>
  );
}
