import React from 'react';
import { Bot, User } from 'lucide-react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { SqlBlock } from './SqlBlock';
import { Message } from '../stores/activeChatStore';

export const MessageBubble = ({ message }: { message: Message }) => {
  const isUser = message.role === 'user';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-4 max-w-4xl mx-auto ${isUser ? 'flex-row-reverse' : ''}`}
    >
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isUser ? 'bg-orange-500' : 'bg-orange-600 shadow-[0_0_15px_rgba(79,70,229,0.3)]'}`}>
        {isUser ? <User size={20} className="text-white"/> : <Bot size={20} className="text-white"/>}
      </div>
      <div className={`px-6 py-4 rounded-2xl max-w-[85%] ${
        isUser 
          ? 'bg-orange-500/20 border border-orange-500/30 text-orange-50 rounded-tr-none' 
          : 'bg-slate-800/40 border border-slate-700/50 text-slate-200 rounded-tl-none backdrop-blur-sm'
      }`}>
        <div className="prose prose-invert max-w-none prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({node, className, children, ...props}) {
                const match = /language-(\w+)/.exec(className || '');
                const language = match ? match[1] : '';
                const codeString = String(children).replace(/\n$/, '');
                
                if (language === 'sql') {
                  return <SqlBlock code={codeString} />;
                }
                
                return match ? (
                  <code className={className} {...props}>{children}</code>
                ) : (
                  <code className="bg-slate-800 px-1.5 py-0.5 rounded text-orange-300" {...props}>
                    {children}
                  </code>
                );
              }
            }}
          >
            {message.content || '...'}
          </ReactMarkdown>
        </div>
      </div>
    </motion.div>
  );
};
