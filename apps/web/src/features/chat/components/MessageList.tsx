import { useRef, useEffect } from 'react';
import type { JSX } from 'react';
import { useActiveChatStore } from '../stores/activeChatStore';
import { MessageBubble } from './MessageBubble';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export const MessageList = (): JSX.Element => {
  const { messages, isStreaming } = useActiveChatStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 p-8">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-5">
          <Sparkles className="text-indigo-600" size={28} />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Ask anything about your data</h3>
        <p className="text-sm text-slate-500 text-center max-w-sm mb-8">
          I can write SQL queries, explain schemas, and visualize results — just ask in plain
          English.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
          {[
            'Show me total revenue by month this year',
            'Which customers had no orders in the last 90 days?',
            'Compare conversion rates across traffic sources',
            'Top 10 products by units sold this quarter',
          ].map((prompt) => (
            <button
              key={prompt}
              className="text-left px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 hover:border-indigo-300 hover:text-indigo-700 hover:bg-indigo-50 transition-all"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-6 space-y-6 scroll-smooth">
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}

      {isStreaming && messages[messages.length - 1]?.role !== 'assistant' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex gap-3 max-w-3xl"
        >
          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
            <Sparkles size={14} />
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1 shadow-sm">
            <span
              className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce"
              style={{ animationDelay: '0ms' }}
            />
            <span
              className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce"
              style={{ animationDelay: '150ms' }}
            />
            <span
              className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce"
              style={{ animationDelay: '300ms' }}
            />
          </div>
        </motion.div>
      )}
      <div ref={bottomRef} className="h-2" />
    </div>
  );
};
