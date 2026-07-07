import type React from 'react';
import { useState } from 'react';
import { Users, Key, Shield, Settings2, BellRing } from 'lucide-react';
import { clsx } from 'clsx';
import { UserManagementTab } from './UserManagementTab';
import { ApiKeysTab } from './ApiKeysTab';
import { AuditLogsTab } from './AuditLogsTab';
import {
  HistoryLogTable,
  ReportSchedulerModal,
  AlertBuilderForm,
} from '../../automations/components';
import { useAutomations } from '../../automations/hooks/useAutomations';
import { ModelSelector, PromptEditor, TokenUsageGraph } from '../../ai-config/components';
import { Button } from '../../../components/ui/Button';

const TABS = [
  { key: 'TEAM', label: 'Team Members', icon: Users },
  { key: 'AUTOMATIONS', label: 'Automations', icon: BellRing },
  { key: 'API', label: 'API Keys', icon: Key },
  { key: 'AUDIT', label: 'Audit Logs', icon: Shield },
  { key: 'AI', label: 'AI Config', icon: Settings2 },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export function SettingsLayout(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<TabKey>('TEAM');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);

  const [aiModel, setAiModel] = useState('gemini-1.5-pro');
  const [aiTemperature, setAiTemperature] = useState(0.2);
  const [aiPrompt, setAiPrompt] = useState(
    'You are an expert SQL analyst for Altzor Analytics. Given the following {{SCHEMA}}, translate the {{USER_QUERY}} into valid PostgreSQL. Respond ONLY with the raw SQL code.',
  );

  const { historyLogs, isLoadingLogs } = useAutomations();

  return (
    <div className="h-full flex flex-col">
      {/* Page header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0">
        <h1 className="text-xl font-bold text-slate-900">Organization Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Manage your workspace configuration and members.
        </p>
      </div>

      <div className="flex-1 flex overflow-hidden bg-slate-50 p-6 gap-6 min-h-0">
        {/* Left nav */}
        <div className="w-52 shrink-0 flex flex-col space-y-0.5">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left',
                activeTab === key
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm',
              )}
            >
              <Icon
                size={16}
                className={clsx(
                  'shrink-0',
                  activeTab === key ? 'text-indigo-600' : 'text-slate-400',
                )}
              />
              {label}
            </button>
          ))}
        </div>

        {/* Content panel */}
        <div className="flex-1 bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden min-h-[400px]">
          {activeTab === 'TEAM' && <UserManagementTab />}
          {activeTab === 'API' && <ApiKeysTab />}
          {activeTab === 'AUDIT' && <AuditLogsTab />}

          {activeTab === 'AUTOMATIONS' && (
            <div className="p-6 flex flex-col h-full overflow-hidden">
              <div className="flex justify-between items-start mb-6 shrink-0">
                <div>
                  <h2 className="text-base font-semibold text-slate-900 mb-0.5">
                    Reports & Alerts
                  </h2>
                  <p className="text-sm text-slate-500">
                    Configure automated data delivery and threshold alerts.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setIsReportModalOpen(true)}>
                    Schedule Report
                  </Button>
                  <Button variant="primary" size="sm" onClick={() => setIsAlertModalOpen(true)}>
                    Create Alert
                  </Button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                  Execution History
                </h3>
                <HistoryLogTable logs={historyLogs} isLoading={isLoadingLogs} />
              </div>
            </div>
          )}

          {activeTab === 'AI' && (
            <div className="p-6 flex flex-col h-full overflow-hidden">
              <div className="mb-6 shrink-0">
                <h2 className="text-base font-semibold text-slate-900 mb-0.5">
                  AI Engine Settings
                </h2>
                <p className="text-sm text-slate-500">
                  Configure and tune the Google Gemini NL2SQL engine.
                </p>
              </div>
              <div className="flex-1 overflow-y-auto space-y-6 pb-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <ModelSelector
                    model={aiModel}
                    setModel={setAiModel}
                    temperature={aiTemperature}
                    setTemperature={setAiTemperature}
                  />
                  <TokenUsageGraph />
                </div>
                <PromptEditor prompt={aiPrompt} setPrompt={setAiPrompt} />
              </div>
            </div>
          )}
        </div>
      </div>

      <ReportSchedulerModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        dashboardId="demo-dash"
      />
      <AlertBuilderForm
        isOpen={isAlertModalOpen}
        onClose={() => setIsAlertModalOpen(false)}
        queryId="demo-query"
      />
    </div>
  );
}
