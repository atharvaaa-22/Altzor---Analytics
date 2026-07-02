import { useState, useEffect, useRef } from 'react';
import { Terminal, StopCircle, PlayCircle, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import type { AppLog } from '../types';

export function LiveLogTail() {
  const [logs, setLogs] = useState<AppLog[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Mocking SSE for demo
    if (isPaused) return;
    
    const interval = setInterval(() => {
      const newLog: AppLog = {
        id: Math.random().toString(36).substring(2, 9),
        timestamp: new Date().toISOString(),
        level: ['info', 'info', 'info', 'debug', 'warn', 'error'][Math.floor(Math.random() * 6)] as any,
        message: 'System processing batch job #' + Math.floor(Math.random() * 1000),
      };
      
      setLogs(prev => [...prev.slice(-99), newLog]);
    }, 1500);

    return () => clearInterval(interval);
  }, [isPaused]);

  useEffect(() => {
    if (!isPaused) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isPaused]);

  return (
    <div className="bg-black border border-slate-800 rounded-2xl overflow-hidden flex flex-col h-[500px] shadow-xl">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-900 shrink-0">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
          <Terminal size={16} /> Live Application Logs
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setLogs([])}
            className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors rounded hover:bg-slate-800"
            title="Clear Logs"
          >
            <Trash2 size={16} />
          </button>
          <button 
            onClick={() => setIsPaused(!isPaused)}
            className={clsx("p-1.5 transition-colors rounded hover:bg-slate-800 flex items-center gap-1 text-xs font-medium", isPaused ? "text-amber-400" : "text-emerald-400")}
          >
            {isPaused ? <><PlayCircle size={16} /> Paused</> : <><StopCircle size={16} /> Tailing</>}
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed scrollbar-thin">
        {logs.length === 0 ? (
          <div className="text-slate-600 italic">Waiting for incoming logs...</div>
        ) : (
          logs.map(log => (
            <div key={log.id} className="flex gap-3 hover:bg-white/5 px-2 py-0.5 rounded transition-colors break-all">
              <span className="text-slate-500 shrink-0 select-none">
                {new Date(log.timestamp).toISOString().split('T')[1].slice(0, -1)}
              </span>
              <span className={clsx("shrink-0 uppercase font-bold w-12", {
                'text-emerald-400': log.level === 'info',
                'text-amber-400': log.level === 'warn',
                'text-rose-400': log.level === 'error',
                'text-slate-400': log.level === 'debug',
              })}>
                {log.level}
              </span>
              <span className={clsx({
                'text-emerald-400/80': log.level === 'info',
                'text-amber-400/80': log.level === 'warn',
                'text-rose-400/80': log.level === 'error',
                'text-slate-400/80': log.level === 'debug',
              })}>
                {log.message}
              </span>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}
