import type React from 'react';
import { useState, useRef, useEffect } from 'react';
import { useSSEQuery } from '../../hooks/useSSEQuery';
import { SqlDisplay } from './SqlDisplay';
import { ResultsTable } from './ResultsTable';
import { ChartRenderer } from '../charts/ChartRenderer';
import { NarrativeCard } from './NarrativeCard';
import { LineagePanel } from './LineagePanel';
import { FeedbackButtons } from './FeedbackButtons';
import { ConfidenceBadge } from './ConfidenceBadge';

interface ChatInterfaceProps {
  conversationId: string;
  connectionId: string;
}

export function ChatInterface({
  conversationId,
  connectionId,
}: ChatInterfaceProps): React.JSX.Element {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const { state, isStreaming, sendQuestion } = useSSEQuery();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, state]);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const question = input.trim();
    setInput('');

    setMessages((prev) => [...prev, { role: 'user', content: question }]);

    await sendQuestion(conversationId, question, connectionId);

    if (state.stage === 'complete') {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: state.explanation ?? '',
          sql: state.sql,
          results: state.results,
          columns: state.columns,
          chartType: state.chartType,
          narrative: state.narrative,
          lineage: state.lineage,
          confidence: state.narrative?.confidence,
          messageId: state.messageId,
          executionTimeMs: state.executionTimeMs,
          rowCount: state.rowCount,
          cached: state.cached,
        },
      ]);
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message message-${msg.role}`}>
            {msg.role === 'user' ? (
              <div className="user-message">{msg.content}</div>
            ) : (
              <div className="assistant-message">
                {msg.confidence != null && <ConfidenceBadge score={msg.confidence} />}

                {msg.sql && <SqlDisplay sql={msg.sql} />}

                {msg.rowCount != null && (
                  <div className="result-meta">
                    {msg.rowCount} rows · {msg.executionTimeMs}ms
                    {msg.cached && <span className="cache-badge">Cached</span>}
                  </div>
                )}

                {msg.results && msg.columns && msg.chartType && (
                  <ChartRenderer
                    data={msg.results}
                    columns={msg.columns}
                    chartType={msg.chartType}
                    messageId={msg.messageId}
                  />
                )}

                {msg.results && msg.columns && (
                  <ResultsTable data={msg.results} columns={msg.columns} />
                )}

                {msg.narrative && <NarrativeCard narrative={msg.narrative} />}

                {msg.lineage && <LineagePanel lineage={msg.lineage} />}

                {msg.messageId && (
                  <FeedbackButtons conversationId={conversationId} messageId={msg.messageId} />
                )}
              </div>
            )}
          </div>
        ))}

        {isStreaming && (
          <div className="streaming-indicator">
            <div className="dot-pulse" />
            <span>{state.statusMessage}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-form" onSubmit={(e) => void handleSubmit(e)}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void handleSubmit(e);
            }
          }}
          placeholder="Ask a question about your data..."
          disabled={isStreaming}
          rows={1}
        />
        <button type="submit" disabled={isStreaming || !input.trim()}>
          {isStreaming ? 'Generating...' : 'Ask'}
        </button>
      </form>
    </div>
  );
}

interface MessageItem {
  role: 'user' | 'assistant';
  content: string;
  sql?: string | null;
  results?: Record<string, unknown>[] | null;
  columns?: Array<{ name: string; dataType: string }> | null;
  chartType?: string | null;
  narrative?: { summary: string; confidence: number; keyFindings: string[] } | null;
  lineage?: Record<string, unknown> | null;
  confidence?: number;
  messageId?: string | null;
  executionTimeMs?: number;
  rowCount?: number;
  cached?: boolean;
}
