import React, { useState, useRef } from 'react';
import { Send, Paperclip } from 'lucide-react';
import { useChatStream } from '../hooks/useChatStream';
import { clsx } from 'clsx';
import { useFileUpload } from '../../uploads/hooks/useFileUpload';
import { getFlatAllowedExtensions, isExtensionAllowed } from '@platform/shared';

export const ChatInput = (): React.JSX.Element => {
  const [prompt, setPrompt] = useState('');
  const { sendPrompt } = useChatStream();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile } = useFileUpload();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const files = e.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach((file) => {
        const ext = file.name.substring(file.name.lastIndexOf('.'));
        if (isExtensionAllowed(ext) && file.size <= 500 * 1024 * 1024) {
          void uploadFile(file);
        } else {
          // If a file is too large or unsupported, we could show a toast here.
          // But useFileUpload also has validation and toasts, so we rely on the
          // accepted extensions filter for now.
          if (file.size > 500 * 1024 * 1024) {
            console.error('File too large');
          }
        }
      });
      e.target.value = ''; // Reset input so same file can be selected again
    }
  };

  const handleSend = (e: React.SyntheticEvent): void => {
    e.preventDefault();
    if (!prompt.trim()) return;
    void sendPrompt(prompt);
    setPrompt('');
    if (textareaRef.current) {
      textareaRef.current.style.height = '48px';
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    setPrompt(e.target.value);
    e.target.style.height = '48px';
    e.target.style.height = Math.min(e.target.scrollHeight, 180) + 'px';
  };

  const canSend = prompt.trim().length > 0;

  return (
    <div className="bg-white border-t border-slate-200 px-4 md:px-6 py-4 shrink-0">
      <form onSubmit={handleSend} className="max-w-3xl mx-auto">
        <div
          className={clsx(
            'flex items-end gap-2 bg-white border rounded-xl px-4 py-2 transition-all duration-150',
            canSend
              ? 'border-indigo-400 ring-2 ring-indigo-500/20 shadow-sm'
              : 'border-slate-200 hover:border-slate-300',
          )}
        >
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={handleInput}
            placeholder="Ask a question about your data…"
            className="flex-1 resize-none text-sm text-slate-900 placeholder-slate-400 bg-transparent focus:outline-none min-h-[48px] max-h-[180px] py-2 leading-relaxed"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
          />
          <div className="flex items-center gap-1 pb-1 shrink-0">
            <input
              type="file"
              multiple
              ref={fileInputRef}
              className="hidden"
              accept={getFlatAllowedExtensions().join(',')}
              onChange={handleFileChange}
            />
            <button
              type="button"
              className="p-2 text-slate-300 hover:text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
              title="Attach file"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip size={16} />
            </button>
            <button
              type="submit"
              disabled={!canSend}
              className={clsx(
                'w-9 h-9 flex items-center justify-center rounded-lg transition-all',
                canSend
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-300 cursor-not-allowed',
              )}
            >
              <Send size={16} className="ml-0.5" />
            </button>
          </div>
        </div>
        <p className="text-xs text-slate-400 text-center mt-2">
          Altzor AI can make mistakes. Verify important SQL before running on production.
        </p>
      </form>
    </div>
  );
};
