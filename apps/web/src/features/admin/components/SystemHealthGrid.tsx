import type React from 'react';
import { useAdmin } from '../hooks/useAdmin';
import { Activity, Database, Server, Clock } from 'lucide-react';
import { clsx } from 'clsx';
import { Badge } from '../../../components/ui/Badge';

export function SystemHealthGrid(): React.JSX.Element {
  const { health, isLoadingHealth } = useAdmin();

  if (isLoadingHealth) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-20 bg-white border border-slate-200 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const formatUptime = (seconds?: number): string => {
    if (!seconds) return '-';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  const getStatusVariant = (status?: string): 'success' | 'warning' | 'error' | 'neutral' => {
    if (status === 'ok' || status === 'connected') return 'success';
    if (status === 'degraded') return 'warning';
    if (status === 'down' || status === 'disconnected') return 'error';
    return 'neutral';
  };

  const cards = [
    {
      icon: <Activity size={18} />,
      label: 'API Status',
      value: health?.status || 'Unknown',
      iconBg: 'bg-blue-50 text-blue-600',
      badge: getStatusVariant(health?.status),
    },
    {
      icon: <Database size={18} />,
      label: 'PostgreSQL',
      value: health?.db || 'Unknown',
      iconBg: 'bg-purple-50 text-purple-600',
      badge: getStatusVariant(health?.db),
    },
    {
      icon: <Server size={18} />,
      label: 'Redis Cache',
      value: health?.redis || 'Unknown',
      iconBg: 'bg-red-50 text-red-600',
      badge: getStatusVariant(health?.redis),
    },
    {
      icon: <Clock size={18} />,
      label: 'Uptime',
      value: formatUptime(health?.uptime),
      iconBg: 'bg-amber-50 text-amber-600',
      badge: null,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex items-center justify-between hover:shadow-sm transition-shadow"
        >
          <div className="flex items-center gap-3">
            <div
              className={clsx('w-9 h-9 rounded-lg flex items-center justify-center', card.iconBg)}
            >
              {card.icon}
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">{card.label}</p>
              <p className="text-sm font-semibold text-slate-900 capitalize">{card.value}</p>
            </div>
          </div>
          {card.badge && <Badge variant={card.badge} dot pulse={card.badge === 'success'} />}
        </div>
      ))}
    </div>
  );
}
