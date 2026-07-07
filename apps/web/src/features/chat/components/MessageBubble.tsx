import type React from 'react';
import { User, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { SqlBlock } from './SqlBlock';
import { Message } from '../stores/activeChatStore';

export const MessageBubble = ({ message }: { message: Message }): React.JSX.Element => {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex gap-3 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : ''}`}
    >
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
          isUser
            ? 'bg-indigo-600 text-white'
            : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
        }`}
      >
        {isUser ? <User size={15} /> : <Sparkles size={14} />}
      </div>

      {/* Bubble */}
      <div
        className={`px-4 py-3 rounded-2xl max-w-[85%] text-sm leading-relaxed shadow-sm ${
          isUser
            ? 'bg-indigo-600 text-white rounded-tr-sm'
            : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm'
        }`}
      >
        <div
          className={`prose max-w-none prose-sm ${
            isUser
              ? 'prose-invert prose-p:text-white prose-strong:text-white'
              : 'prose-slate prose-p:text-slate-800 prose-strong:text-slate-900 prose-code:text-indigo-700 prose-code:bg-indigo-50 prose-code:px-1 prose-code:rounded'
          } prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent`}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                const language = match ? match[1] : '';
                const codeString = String(children).replace(/\n$/, '');

                if (language === 'sql') {
                  return <SqlBlock code={codeString} />;
                }

                return match ? (
                  <code className={className} {...props}>
                    {children}
                  </code>
                ) : (
                  <code
                    className={
                      isUser
                        ? 'bg-indigo-500 text-indigo-100 px-1.5 py-0.5 rounded text-xs'
                        : 'bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded text-xs'
                    }
                    {...props}
                  >
                    {children}
                  </code>
                );
              },
              // Style tables in assistant responses
              table({ children }) {
                return (
                  <div className="overflow-x-auto my-2 rounded-lg border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-200 text-xs">
                      {children}
                    </table>
                  </div>
                );
              },
              th({ children }) {
                return (
                  <th className="px-3 py-2 text-left font-medium text-slate-700 bg-slate-50 uppercase tracking-wide text-xs">
                    {children}
                  </th>
                );
              },
              td({ children }) {
                return (
                  <td className="px-3 py-2 text-slate-600 border-t border-slate-100">{children}</td>
                );
              },
            }}
          >
            {message.content || '...'}
          </ReactMarkdown>
        </div>

        {/* Timestamp */}
        {message.createdAt && (
          <p className={`text-xs mt-1.5 ${isUser ? 'text-indigo-300' : 'text-slate-400'}`}>
            {new Date(message.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        )}
      </div>
    </motion.div>
  );
};
