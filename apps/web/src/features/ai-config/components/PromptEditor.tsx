import type React from 'react';
import { useState } from 'react';
import { Play, Sparkles, Terminal, FileCode2 } from 'lucide-react';
import { Panel, Group, Separator } from 'react-resizable-panels';

export function PromptEditor({
  prompt,
  setPrompt,
}: {
  prompt: string;
  setPrompt: (v: string) => void;
}): React.JSX.Element {
  const [testQuery, setTestQuery] = useState('Show me total revenue by month for last year');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const handleTest = (): void => {
    setIsTesting(true);
    setTimeout(() => {
      setTestResult(
        `SELECT\n  DATE_TRUNC('month', order_date) AS order_month,\n  SUM(total_amount) AS revenue\nFROM\n  orders\nWHERE\n  order_date >= CURRENT_DATE - INTERVAL '1 year'\nGROUP BY\n  1\nORDER BY\n  1 DESC;`,
      );
      setIsTesting(false);
    }, 1500);
  };

  const highlightTemplateVariables = (text: string): string => {
    return text.replace(
      /(\{\{[^}]+\}\})/g,
      '<span class="text-amber-400 font-bold bg-amber-400/10 px-1 rounded border border-amber-400/20">$1</span>',
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col h-[500px] shadow-xl">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900 shrink-0">
        <div className="flex items-center gap-3">
          <FileCode2 size={18} className="text-slate-400" />
          <h3 className="text-sm font-semibold text-white">System Prompt Template</h3>
        </div>
      </div>

      <Group orientation="vertical" className="flex-1">
        <Panel defaultSize={50} minSize={30}>
          <div className="h-full relative bg-slate-950 p-4 overflow-hidden">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="absolute inset-4 bg-transparent text-transparent caret-white resize-none outline-none font-mono text-sm leading-relaxed z-10 p-0 m-0 border-none"
              spellCheck={false}
            />
            <div
              className="absolute inset-4 text-slate-300 font-mono text-sm leading-relaxed whitespace-pre-wrap break-words pointer-events-none p-0 m-0"
              dangerouslySetInnerHTML={{ __html: highlightTemplateVariables(prompt) }}
            />
          </div>
        </Panel>

        <Separator className="h-1.5 bg-slate-800 hover:bg-blue-500 transition-colors cursor-row-resize flex items-center justify-center">
          <div className="w-8 h-1 bg-slate-600 rounded-full" />
        </Separator>

        <Panel defaultSize={50} minSize={30}>
          <div className="h-full flex flex-col bg-slate-900 border-t border-slate-800">
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 shrink-0 bg-slate-900">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <Terminal size={16} /> Testing Console
              </div>
              <button
                onClick={handleTest}
                disabled={isTesting}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isTesting ? <Sparkles size={14} className="animate-pulse" /> : <Play size={14} />}
                Test Prompt
              </button>
            </div>

            <div className="flex-1 flex flex-col sm:flex-row min-h-0">
              <div className="flex-1 sm:border-r border-b sm:border-b-0 border-slate-800 p-4 flex flex-col min-h-[150px]">
                <label className="text-xs text-slate-500 mb-2 uppercase tracking-wider font-semibold">
                  User Query Input
                </label>
                <textarea
                  value={testQuery}
                  onChange={(e) => setTestQuery(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-300 outline-none focus:border-blue-500 resize-none"
                />
              </div>
              <div className="flex-1 p-4 flex flex-col bg-slate-950 min-h-[150px]">
                <label className="text-xs text-slate-500 mb-2 uppercase tracking-wider font-semibold flex justify-between">
                  <span>Gemini Output</span>
                  {isTesting && (
                    <span className="text-blue-400 animate-pulse font-normal normal-case">
                      Generating...
                    </span>
                  )}
                </label>
                <div className="flex-1 bg-slate-900 border border-slate-800 rounded-lg p-3 text-sm font-mono text-emerald-400 overflow-auto whitespace-pre scrollbar-thin">
                  {testResult || (
                    <span className="text-slate-600 italic">Click test to generate SQL...</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Panel>
      </Group>
    </div>
  );
}
