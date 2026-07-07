import type React from 'react';
import { useState } from 'react';
import { Bell, Hash, Mail, MessageSquare, Webhook, CheckCircle2, Loader2, X } from 'lucide-react';
import { clsx } from 'clsx';
import { useAutomations } from '../hooks/useAutomations';
import type { AlertCondition, Channel } from '../types';

export function AlertBuilderForm({
  isOpen,
  onClose,
  queryId,
}: {
  isOpen: boolean;
  onClose: () => void;
  queryId: string;
}): React.JSX.Element | null {
  const { createAlert } = useAutomations();
  const [condition, setCondition] = useState<AlertCondition>('GREATER_THAN');
  const [threshold, setThreshold] = useState('');

  const [channels, setChannels] = useState<Set<Channel>>(new Set(['EMAIL']));
  const [emailAddresses, setEmailAddresses] = useState('');
  const [slackChannel, setSlackChannel] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');

  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle');

  const toggleChannel = (channel: Channel): void => {
    const newChannels = new Set(channels);
    if (newChannels.has(channel)) newChannels.delete(channel);
    else newChannels.add(channel);
    setChannels(newChannels);
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setStatus('submitting');
    try {
      await createAlert.mutateAsync({
        queryId,
        condition,
        threshold: Number(threshold),
        channels: Array.from(channels),
        webhookUrl: channels.has('WEBHOOK') ? webhookUrl : undefined,
        slackChannel: channels.has('SLACK') ? slackChannel : undefined,
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
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/10 text-amber-400 rounded-xl flex items-center justify-center">
              <Bell size={20} />
            </div>
            <h2 className="text-xl font-bold text-white">Data Anomaly Alert</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <form
            id="alert-form"
            onSubmit={(e): void => {
              void handleSubmit(e);
            }}
            className="space-y-8"
          >
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
                1. Trigger Condition
              </h3>
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 flex flex-col sm:flex-row gap-4 items-center">
                <span className="text-slate-400 whitespace-nowrap">If query result is</span>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as AlertCondition)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 appearance-none w-full sm:w-auto"
                >
                  <option value="GREATER_THAN">Greater Than (&gt;)</option>
                  <option value="LESS_THAN">Less Than (&lt;)</option>
                  <option value="EQUALS">Equal To (=)</option>
                  <option value="NOT_EQUALS">Not Equal To (!=)</option>
                </select>
                <div className="relative w-full sm:w-auto flex-1">
                  <Hash
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                    size={16}
                  />
                  <input
                    required
                    type="number"
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="1000"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
                2. Notification Channels
              </h3>

              <div className="space-y-3">
                <div
                  className={clsx(
                    'p-4 rounded-xl border transition-colors',
                    channels.has('EMAIL')
                      ? 'bg-slate-800/50 border-blue-500/50'
                      : 'bg-slate-900/30 border-slate-800',
                  )}
                >
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={channels.has('EMAIL')}
                      onChange={() => toggleChannel('EMAIL')}
                      className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-blue-500 focus:ring-blue-500"
                    />
                    <Mail
                      size={20}
                      className={channels.has('EMAIL') ? 'text-blue-400' : 'text-slate-500'}
                    />
                    <span
                      className={clsx(
                        'font-medium',
                        channels.has('EMAIL') ? 'text-white' : 'text-slate-400',
                      )}
                    >
                      Email
                    </span>
                  </label>
                  {channels.has('EMAIL') && (
                    <div className="mt-3 ml-8">
                      <input
                        type="text"
                        placeholder="team@example.com"
                        value={emailAddresses}
                        onChange={(e) => setEmailAddresses(e.target.value)}
                        required
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500"
                      />
                    </div>
                  )}
                </div>

                <div
                  className={clsx(
                    'p-4 rounded-xl border transition-colors',
                    channels.has('SLACK')
                      ? 'bg-slate-800/50 border-blue-500/50'
                      : 'bg-slate-900/30 border-slate-800',
                  )}
                >
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={channels.has('SLACK')}
                      onChange={() => toggleChannel('SLACK')}
                      className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-blue-500 focus:ring-blue-500"
                    />
                    <MessageSquare
                      size={20}
                      className={channels.has('SLACK') ? 'text-pink-400' : 'text-slate-500'}
                    />
                    <span
                      className={clsx(
                        'font-medium',
                        channels.has('SLACK') ? 'text-white' : 'text-slate-400',
                      )}
                    >
                      Slack
                    </span>
                  </label>
                  {channels.has('SLACK') && (
                    <div className="mt-3 ml-8">
                      <input
                        type="text"
                        placeholder="#data-alerts"
                        value={slackChannel}
                        onChange={(e) => setSlackChannel(e.target.value)}
                        required
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500"
                      />
                    </div>
                  )}
                </div>

                <div
                  className={clsx(
                    'p-4 rounded-xl border transition-colors',
                    channels.has('WEBHOOK')
                      ? 'bg-slate-800/50 border-blue-500/50'
                      : 'bg-slate-900/30 border-slate-800',
                  )}
                >
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={channels.has('WEBHOOK')}
                      onChange={() => toggleChannel('WEBHOOK')}
                      className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-blue-500 focus:ring-blue-500"
                    />
                    <Webhook
                      size={20}
                      className={channels.has('WEBHOOK') ? 'text-emerald-400' : 'text-slate-500'}
                    />
                    <span
                      className={clsx(
                        'font-medium',
                        channels.has('WEBHOOK') ? 'text-white' : 'text-slate-400',
                      )}
                    >
                      Webhook
                    </span>
                  </label>
                  {channels.has('WEBHOOK') && (
                    <div className="mt-3 ml-8">
                      <input
                        type="url"
                        placeholder="https://api.example.com/webhook"
                        value={webhookUrl}
                        onChange={(e) => setWebhookUrl(e.target.value)}
                        required
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-slate-800 shrink-0 bg-slate-900">
          <button
            form="alert-form"
            type="submit"
            disabled={status !== 'idle' || channels.size === 0}
            className={clsx(
              'w-full py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2',
              status === 'success'
                ? 'bg-emerald-500 text-white'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 disabled:opacity-50',
            )}
          >
            {status === 'submitting' ? (
              <Loader2 className="animate-spin" size={20} />
            ) : status === 'success' ? (
              <CheckCircle2 size={20} />
            ) : (
              <Bell size={20} />
            )}
            {status === 'submitting'
              ? 'Creating...'
              : status === 'success'
                ? 'Alert Configured!'
                : 'Create Alert'}
          </button>
        </div>
      </div>
    </div>
  );
}
