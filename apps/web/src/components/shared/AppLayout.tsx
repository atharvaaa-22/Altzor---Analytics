import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../features/auth';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  LayoutDashboard,
  Database,
  Network,
  FileSpreadsheet,
  Settings,
  LogOut,
  ChevronLeft,
  Menu,
  Bell,
  Search,
  BookOpen,
  ShieldCheck,
} from 'lucide-react';
import { AltzorLogo } from './AltzorLogo';
import { clsx } from 'clsx';

const NAV_LINKS = [
  { name: 'Conversations', path: '/conversations', icon: MessageSquare },
  { name: 'Dashboards', path: '/dashboards', icon: LayoutDashboard },
  { name: 'Connections', path: '/connections', icon: Database },
  { name: 'Semantic Layer', path: '/semantic', icon: Network },
  { name: 'Files', path: '/files', icon: FileSpreadsheet },
  { name: 'Saved Queries', path: '/queries', icon: BookOpen },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export function AppLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const user = useAuthStore((s) => s.user);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = (): void => {
    void clearAuth();
    void navigate('/login');
  };

  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : '?';

  const SidebarContent = (): React.JSX.Element => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100">
        <AltzorLogo collapsed={collapsed} />
        <button
          onClick={(): void => setCollapsed(!collapsed)}
          className="hidden md:flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft
            size={16}
            className={clsx('transition-transform duration-300', collapsed && 'rotate-180')}
          />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_LINKS.map((link) => {
          const isActive = location.pathname.startsWith(link.path);
          const Icon = link.icon;
          return (
            <Link
              key={link.path}
              to={link.path}
              onClick={(): void => setMobileOpen(false)}
              title={collapsed ? link.name : undefined}
            >
              <div
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group',
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900',
                )}
              >
                <Icon
                  size={18}
                  className={clsx(
                    'shrink-0',
                    isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600',
                  )}
                />
                {!collapsed && <span className="text-sm font-medium truncate">{link.name}</span>}
                {isActive && !collapsed && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-600" />
                )}
              </div>
            </Link>
          );
        })}

        {/* Admin link (role-gated) */}
        {user?.role === 'SUPER_ADMIN' && (
          <Link
            to="/admin"
            onClick={(): void => setMobileOpen(false)}
            title={collapsed ? 'Admin' : undefined}
          >
            <div
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group',
                location.pathname.startsWith('/admin')
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900',
              )}
            >
              <ShieldCheck
                size={18}
                className={clsx(
                  'shrink-0',
                  location.pathname.startsWith('/admin')
                    ? 'text-indigo-600'
                    : 'text-slate-400 group-hover:text-slate-600',
                )}
              />
              {!collapsed && <span className="text-sm font-medium">Admin</span>}
            </div>
          </Link>
        )}
      </nav>

      {/* User section */}
      <div className="px-3 py-3 border-t border-slate-100">
        <div
          className={clsx(
            'flex items-center gap-3 px-2 py-2 rounded-lg',
            collapsed ? 'justify-center' : '',
          )}
        >
          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">
            {initials}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
          )}
        </div>
        <button
          onClick={handleLogout}
          title={collapsed ? 'Logout' : undefined}
          className={clsx(
            'mt-1 w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors',
            collapsed && 'justify-center',
          )}
        >
          <LogOut size={16} className="shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Logout</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 68 : 240 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className="hidden md:flex flex-col h-full bg-white border-r border-slate-200 overflow-hidden shrink-0 z-20"
      >
        <SidebarContent />
      </motion.aside>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-30 md:hidden"
              onClick={(): void => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 h-full w-60 bg-white border-r border-slate-200 z-40 md:hidden"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 shrink-0 z-10">
          {/* Left: mobile menu + org name */}
          <div className="flex items-center gap-3">
            <button
              className="md:hidden p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
              onClick={(): void => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            <span className="hidden sm:block text-sm font-medium text-slate-500">
              {user?.email?.split('@')[1]?.split('.')[0]
                ? user.email.split('@')[1].split('.')[0].charAt(0).toUpperCase() +
                  user.email.split('@')[1].split('.')[0].slice(1)
                : 'Altzor Analytics'}
            </span>
          </div>

          {/* Right: search + bell */}
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-400 border border-slate-200 rounded-lg bg-slate-50 hover:bg-white hover:border-slate-300 transition-colors w-48 hidden sm:flex">
              <Search size={14} />
              <span className="text-slate-400 text-xs">Search…</span>
              <kbd className="ml-auto text-xs text-slate-300 border border-slate-200 rounded px-1 bg-white">
                ⌘K
              </kbd>
            </button>
            <button className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              <Bell size={18} />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-slate-50">{children}</main>
      </div>
    </div>
  );
}
