import { useState } from 'react';
import { Users, Key, Shield, Settings2, BellRing } from 'lucide-react';
import { clsx } from 'clsx';
import { UserManagementTab, ApiKeysTab, AuditLogsTab } from '.';
import { HistoryLogTable, ReportSchedulerModal, AlertBuilderForm } from '../../automations/components';
import { useAutomations } from '../../automations/hooks/useAutomations';
import { ModelSelector, PromptEditor, TokenUsageGraph } from '../../ai-config/components';

export function SettingsLayout() {
  const [activeTab, setActiveTab] = useState<'TEAM' | 'API' | 'AI' | 'AUDIT' | 'AUTOMATIONS'>('TEAM');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  
  // AI Config state
  const [aiModel, setAiModel] = useState('gemini-1.5-pro');
  const [aiTemperature, setAiTemperature] = useState(0.2);
  const [aiPrompt, setAiPrompt] = useState('You are an expert SQL analyst for Altzor Analytics. Given the following {{SCHEMA}}, translate the {{USER_QUERY}} into valid PostgreSQL. Respond ONLY with the raw SQL code.');

  const { historyLogs, isLoadingLogs } = useAutomations();

  return (
    <div className="p-8 max-w-6xl mx-auto w-full h-full flex flex-col">
      <h1 className="text-3xl font-bold text-white mb-8">Organization Settings</h1>

      <div className="flex flex-col md:flex-row gap-8 flex-1 min-h-0">
        <div className="w-full md:w-64 space-y-1 shrink-0 flex md:flex-col overflow-x-auto md:overflow-visible pb-2 md:pb-0 scrollbar-thin">
          <button 
            onClick={() => setActiveTab('TEAM')}
            className={clsx("flex-1 md:w-full flex items-center gap-3 px-4 py-2.5 rounded-lg font-medium transition-colors border whitespace-nowrap", activeTab === 'TEAM' ? "bg-blue-600/10 text-blue-400 border-blue-500/20" : "text-slate-400 border-transparent hover:bg-slate-800/50")}
          >
            <Users size={18} /> Team Members
          </button>
          <button 
            onClick={() => setActiveTab('AUTOMATIONS')}
            className={clsx("flex-1 md:w-full flex items-center gap-3 px-4 py-2.5 rounded-lg font-medium transition-colors border whitespace-nowrap", activeTab === 'AUTOMATIONS' ? "bg-blue-600/10 text-blue-400 border-blue-500/20" : "text-slate-400 border-transparent hover:bg-slate-800/50")}
          >
            <BellRing size={18} /> Automations
          </button>
          <button 
            onClick={() => setActiveTab('API')}
            className={clsx("flex-1 md:w-full flex items-center gap-3 px-4 py-2.5 rounded-lg font-medium transition-colors border whitespace-nowrap", activeTab === 'API' ? "bg-blue-600/10 text-blue-400 border-blue-500/20" : "text-slate-400 border-transparent hover:bg-slate-800/50")}
          >
            <Key size={18} /> API Keys
          </button>
          <button 
            onClick={() => setActiveTab('AUDIT')}
            className={clsx("flex-1 md:w-full flex items-center gap-3 px-4 py-2.5 rounded-lg font-medium transition-colors border whitespace-nowrap", activeTab === 'AUDIT' ? "bg-blue-600/10 text-blue-400 border-blue-500/20" : "text-slate-400 border-transparent hover:bg-slate-800/50")}
          >
            <Shield size={18} /> Audit Logs
          </button>
          <button 
            onClick={() => setActiveTab('AI')}
            className={clsx("flex-1 md:w-full flex items-center gap-3 px-4 py-2.5 rounded-lg font-medium transition-colors border whitespace-nowrap", activeTab === 'AI' ? "bg-blue-600/10 text-blue-400 border-blue-500/20" : "text-slate-400 border-transparent hover:bg-slate-800/50")}
          >
            <Settings2 size={18} /> AI Config
          </button>
        </div>

        <div className="flex-1 bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl flex flex-col overflow-hidden min-h-[400px]">
          {activeTab === 'TEAM' && <UserManagementTab />}
          {activeTab === 'API' && <ApiKeysTab />}
          {activeTab === 'AUDIT' && <AuditLogsTab />}

          {activeTab === 'AUTOMATIONS' && (
            <div className="p-8 flex flex-col h-full overflow-hidden">
              <div className="flex justify-between items-start mb-6 shrink-0">
                <div>
                  <h2 className="text-xl font-semibold text-white mb-1">Reports & Alerts</h2>
                  <p className="text-sm text-slate-400">Configure automated data delivery and threshold alerts.</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setIsReportModalOpen(true)} className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-lg font-medium transition-colors text-sm border border-slate-700">
                    Schedule Report
                  </button>
                  <button onClick={() => setIsAlertModalOpen(true)} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm shadow-lg shadow-blue-500/20">
                    Create Alert
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin">
                <h3 className="text-sm font-medium text-slate-400 mb-4">Execution History</h3>
                <HistoryLogTable logs={historyLogs} isLoading={isLoadingLogs} />
              </div>
            </div>
          )}
          
          {activeTab === 'AI' && (
            <div className="p-8 flex flex-col h-full overflow-hidden">
              <div className="mb-6 shrink-0">
                <h2 className="text-xl font-semibold text-white mb-1">AI Engine Settings</h2>
                <p className="text-sm text-slate-400">Configure and tune the Google Gemini NL2SQL engine.</p>
              </div>
              <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin space-y-6 pb-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <ModelSelector 
                    model={aiModel} 
                    setModel={setAiModel} 
                    temperature={aiTemperature} 
                    setTemperature={setAiTemperature} 
                  />
                  <TokenUsageGraph />
                </div>
                <PromptEditor 
                  prompt={aiPrompt} 
                  setPrompt={setAiPrompt} 
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <ReportSchedulerModal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} dashboardId="demo-dash" />
      <AlertBuilderForm isOpen={isAlertModalOpen} onClose={() => setIsAlertModalOpen(false)} queryId="demo-query" />
    </div>
  );
}
