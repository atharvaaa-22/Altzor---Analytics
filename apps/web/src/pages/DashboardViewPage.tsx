import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Edit2, Check, Plus } from 'lucide-react';
import { DashboardGrid, useDashboardStore } from '../features/dashboards';

export function DashboardViewPage() {
  const { id } = useParams();
  const { isEditing, setEditing } = useDashboardStore();

  return (
    <div className="h-full flex flex-col p-8 max-w-[1600px] mx-auto w-full">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <Link to="/dashboards" className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Executive Overview</h1>
            <p className="text-sm text-slate-400">Last refreshed 2 hours ago</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          {isEditing && (
            <button className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-medium transition-colors border border-slate-700">
              <Plus size={18} /> Add Widget
            </button>
          )}
          <button 
            onClick={() => setEditing(!isEditing)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors shadow-lg ${isEditing ? 'bg-emerald-500 text-white hover:bg-emerald-400 shadow-emerald-500/20' : 'bg-orange-500 hover:bg-orange-400 text-white shadow-orange-500/20'}`}
          >
            {isEditing ? <Check size={18} /> : <Edit2 size={18} />}
            {isEditing ? 'Save Layout' : 'Edit Dashboard'}
          </button>
        </div>
      </div>

      <div className="flex-1 -mx-6">
        <DashboardGrid />
      </div>
    </div>
  );
}
