import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../features/auth';
import { motion } from 'framer-motion';
import { MessageSquare, LayoutDashboard, Database, Network, FileSpreadsheet, Settings, LogOut } from 'lucide-react';
import { AltzorLogo } from './AltzorLogo';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const clearAuth = useAuthStore(s => s.clearAuth);

  const links = [
    { name: 'Conversations', path: '/conversations', icon: MessageSquare },
    { name: 'Dashboards', path: '/dashboards', icon: LayoutDashboard },
    { name: 'Connections', path: '/connections', icon: Database },
    { name: 'Semantic Layer', path: '/semantic', icon: Network },
    { name: 'Files', path: '/files', icon: FileSpreadsheet },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-slate-950 text-slate-50 overflow-hidden font-sans">
      {/* Sidebar */}
      <motion.aside 
        initial={{ x: -250 }}
        animate={{ x: 0 }}
        className="w-64 bg-slate-900/50 backdrop-blur-xl border-r border-slate-800 flex flex-col"
      >
        <div className="p-6">
          <AltzorLogo className="text-3xl" />
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4">
          {links.map((link) => {
            const isActive = location.pathname.startsWith(link.path);
            const Icon = link.icon;
            return (
              <Link key={link.path} to={link.path}>
                <div className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${isActive ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30 shadow-[0_0_15px_rgba(37,99,235,0.15)]' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'}`}>
                  <Icon size={20} />
                  <span className="font-medium">{link.name}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={clearAuth}
            className="flex items-center space-x-3 w-full px-4 py-3 text-slate-400 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full relative overflow-y-auto bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950">
        {children}
      </main>
    </div>
  );
}
