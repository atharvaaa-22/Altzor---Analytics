import React, { useRef, useEffect } from 'react';
import { useActiveChatStore } from '../stores/activeChatStore';
import { MessageBubble } from './MessageBubble';
import { motion } from 'framer-motion';

export const MessageList = () => {
  const { messages, isStreaming } = useActiveChatStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth">
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      {isStreaming && messages[messages.length - 1]?.role !== 'assistant' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4 max-w-4xl mx-auto">
           <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-orange-600 shadow-[0_0_15px_rgba(79,70,229,0.3)]">
             <div className="flex gap-1">
               <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce"></span>
               <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
               <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
             </div>
           </div>
        </motion.div>
      )}
      <div ref={bottomRef} className="h-4" />
    </div>
  );
};
