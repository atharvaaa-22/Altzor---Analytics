import React from 'react';
import { Sparkles, Settings2 } from 'lucide-react';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';

export const ChatInterface = () => {
  return (
    <div className="flex flex-col h-full relative">
      <header className="h-16 border-b border-slate-800/60 bg-slate-900/50 backdrop-blur-xl flex items-center justify-between px-6 sticky top-0 z-10">
        <h2 className="text-lg font-medium text-white flex items-center gap-2">
          <Sparkles className="text-orange-400" size={18} />
          Data Exploration
        </h2>
        <button className="text-slate-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-slate-800">
          <Settings2 size={18} />
        </button>
      </header>

      <MessageList />
      <ChatInput />
    </div>
  );
};
