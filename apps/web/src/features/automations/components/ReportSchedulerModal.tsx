import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Mail, FileText, CheckCircle2, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { useAutomations } from '../hooks/useAutomations';
import type { ReportFormat } from '../types';

export function ReportSchedulerModal({ isOpen, onClose, dashboardId }: { isOpen: boolean; onClose: () => void; dashboardId: string }) {
  const { createReport } = useAutomations();
  const [format, setFormat] = useState<ReportFormat>('PDF');
  const [schedule, setSchedule] = useState('0 9 * * 1');
  const [emails, setEmails] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle');

  const SCHEDULE_OPTIONS = [
    { label: 'Every Day at 9:00 AM', value: '0 9 * * *' },
    { label: 'Every Monday at 9:00 AM', value: '0 9 * * 1' },
    { label: 'Every Friday at 5:00 PM', value: '0 17 * * 5' },
    { label: 'First day of the month at 9:00 AM', value: '0 9 1 * *' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    try {
      await createReport.mutateAsync({
        dashboardId,
        format,
        cron: schedule,
        emails: emails.split(',').map(e => e.trim()).filter(Boolean),
      });
      setStatus('success');
      setTimeout(() => {
        setStatus('idle');
        onClose();
      }, 1500);
    } catch (err) {
      setStatus('idle');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center">
              <Calendar size={20} />
            </div>
            <h2 className="text-xl font-bold text-white">Schedule Report</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Export Format</label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setFormat('PDF')}
                className={clsx(
                  "flex-1 py-3 px-4 rounded-xl border flex items-center justify-center gap-2 font-medium transition-colors",
                  format === 'PDF' ? "bg-blue-500/10 border-blue-500/50 text-blue-400" : "bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800"
                )}
              >
                <FileText size={18} /> PDF Document
              </button>
              <button
                type="button"
                onClick={() => setFormat('CSV')}
                className={clsx(
                  "flex-1 py-3 px-4 rounded-xl border flex items-center justify-center gap-2 font-medium transition-colors",
                  format === 'CSV' ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400" : "bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800"
                )}
              >
                <FileText size={18} /> Raw CSV Data
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Schedule</label>
            <select
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 appearance-none"
            >
              {SCHEDULE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Recipient Emails (comma-separated)</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                required
                type="text"
                value={emails}
                onChange={(e) => setEmails(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder-slate-600"
                placeholder="team@example.com, boss@example.com"
              />
            </div>
          </div>

          <div className="pt-4 mt-6 border-t border-slate-800">
            <button
              type="submit"
              disabled={status !== 'idle'}
              className={clsx(
                "w-full py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2",
                status === 'success' ? "bg-emerald-500 text-white" : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 disabled:opacity-50"
              )}
            >
              {status === 'submitting' ? <Loader2 className="animate-spin" size={20} /> : status === 'success' ? <CheckCircle2 size={20} /> : <Calendar size={20} />}
              {status === 'submitting' ? 'Scheduling...' : status === 'success' ? 'Scheduled Successfully!' : 'Schedule Report'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
