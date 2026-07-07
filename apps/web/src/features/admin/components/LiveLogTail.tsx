import type React from 'react';
import { useState, useEffect, useRef } from 'react';
import { Terminal, StopCircle, PlayCircle, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import type { AppLog } from '../types';

const LOG_LEVELS: readonly AppLog['level'][] = ['info', 'info', 'info', 'debug', 'warn', 'error'];

const getRandomLogLevel = (): AppLog['level'] => {
  const index = Math.floor(Math.random() * LOG_LEVELS.length);
  return LOG_LEVELS[index] ?? 'info';
};

export function LiveLogTail(): React.JSX.Element {
  const [logs, setLogs] = useState<AppLog[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      const newLog: AppLog = {
        id: Math.random().toString(36).substring(2, 9),
        timestamp: new Date().toISOString(),
        level: getRandomLogLevel(),
        message: 'System processing batch job #' + Math.floor(Math.random() * 1000),
      };
      setLogs((prev) => [...prev.slice(-99), newLog]);
    }, 1500);
    return (): void => {
      clearInterval(interval);
    };
  }, [isPaused]);

  useEffect(() => {
    if (!isPaused) endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, isPaused]);

  const levelColor = (level: AppLog['level']): string => {
    switch (level) {
      case 'info':
        return 'text-sky-600';
      case 'warn':
        return 'text-amber-600';
      case 'error':
        return 'text-red-600';
      case 'debug':
        return 'text-slate-400';
      default:
        return 'text-slate-500';
    }
  };

  const msgColor = (level: AppLog['level']): string => {
    switch (level) {
      case 'warn':
        return 'text-amber-700';
      case 'error':
        return 'text-red-700';
      default:
        return 'text-slate-600';
    }
  };

  return (
    <div
      className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col"
      style={{ height: 400 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50 shrink-0">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <Terminal size={15} className="text-indigo-600" />
          Live Logs
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setLogs([])}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded transition-colors"
            title="Clear"
          >
            <Trash2 size={14} />
          </button>
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={clsx(
              'p-1.5 rounded transition-colors flex items-center gap-1 text-xs font-medium',
              isPaused
                ? 'text-amber-600 hover:bg-amber-50'
                : 'text-emerald-600 hover:bg-emerald-50',
            )}
          >
            {isPaused ? (
              <>
                <PlayCircle size={14} /> Resume
              </>
            ) : (
              <>
                <StopCircle size={14} /> Tailing
              </>
            )}
          </button>
        </div>
      </div>

      {/* Log area */}
      <div className="flex-1 overflow-y-auto p-3 font-mono text-xs leading-relaxed bg-slate-50">
        {logs.length === 0 ? (
          <div className="text-slate-400 italic">Waiting for incoming logs…</div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="flex gap-3 hover:bg-white px-1 py-0.5 rounded transition-colors"
            >
              <span className="text-slate-400 shrink-0 select-none">
                {new Date(log.timestamp).toISOString().split('T')[1].slice(0, -1)}
              </span>
              <span className={clsx('shrink-0 w-10 font-bold uppercase', levelColor(log.level))}>
                {log.level}
              </span>
              <span className={clsx('break-all', msgColor(log.level))}>{log.message}</span>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}
