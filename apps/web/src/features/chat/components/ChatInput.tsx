import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { useChatStream } from '../hooks/useChatStream';

export const ChatInput = () => {
  const [prompt, setPrompt] = useState('');
  const { sendPrompt } = useChatStream();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    
    sendPrompt(prompt);
    setPrompt('');
    if (textareaRef.current) {
      textareaRef.current.style.height = '56px';
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
    // Auto-resize
    e.target.style.height = '56px';
    e.target.style.height = Math.min(e.target.scrollHeight, 192) + 'px';
  };

  return (
    <div className="p-6 pt-0 bg-gradient-to-t from-slate-950 via-slate-950 to-transparent sticky bottom-0">
      <form onSubmit={handleSend} className="max-w-4xl mx-auto relative group">
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={handleInput}
          placeholder="Ask a question about your revenue..."
          className="w-full bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl pl-6 pr-16 py-4 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all shadow-2xl resize-none h-14 min-h-[56px] max-h-48 overflow-y-auto font-sans"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend(e);
            }
          }}
        />
        <button 
          type="submit"
          disabled={!prompt.trim()}
          className="absolute right-2 top-2 w-10 h-10 flex items-center justify-center bg-orange-500 hover:bg-orange-400 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl transition-colors shadow-lg"
        >
          <Send size={18} className="ml-0.5" />
        </button>
      </form>
      <div className="max-w-4xl mx-auto mt-2 text-center">
        <p className="text-xs text-slate-500">Altzor AI can make mistakes. Consider verifying important SQL queries.</p>
      </div>
    </div>
  );
};
