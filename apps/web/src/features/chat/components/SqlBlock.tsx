import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Play, Copy, Check } from 'lucide-react';
import { useState } from 'react';

export const SqlBlock = ({ code }: { code: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRun = () => {
    alert('Executing SQL placeholder');
  };

  return (
    <div className="rounded-xl overflow-hidden my-4 border border-slate-700 bg-slate-900 shadow-xl">
      <div className="flex justify-between items-center bg-slate-800/80 px-4 py-2.5 border-b border-slate-700">
        <span className="text-xs font-mono text-slate-400">SQL</span>
        <div className="flex gap-2">
          <button onClick={handleCopy} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors" title="Copy SQL">
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
          </button>
          <button onClick={handleRun} className="flex items-center gap-1.5 bg-orange-500/20 text-orange-400 hover:bg-orange-500/40 px-3 py-1 rounded-md transition-colors text-xs font-medium border border-orange-500/20">
            <Play size={12} /> Run Query
          </button>
        </div>
      </div>
      <SyntaxHighlighter 
        language="sql" 
        style={vscDarkPlus}
        customStyle={{ margin: 0, padding: '1rem', background: 'transparent' }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
};
