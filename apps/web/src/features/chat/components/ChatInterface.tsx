import { Sparkles, Settings2 } from 'lucide-react';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';

export const ChatInterface = (): React.JSX.Element => {
  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-6 shrink-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
            <Sparkles className="text-indigo-600" size={15} />
          </div>
          <h2 className="text-sm font-semibold text-slate-900">AI Data Assistant</h2>
          <span className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </span>
        </div>
        <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
          <Settings2 size={17} />
        </button>
      </header>

      <MessageList />
      <ChatInput />
    </div>
  );
};
