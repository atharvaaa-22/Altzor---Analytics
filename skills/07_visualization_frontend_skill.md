# Skill File 07 — Data Visualization & Conversational Frontend

## Overview
Build the React frontend for the conversational query interface and data visualization layer. Includes the chat UI with SSE streaming, Recharts-based chart rendering, the data lineage panel, confidence scoring badges, and result export controls.

**BRD References:** REQ-CQI-001–011, REQ-DVI-001–006, REQ-QER-006, Section 5.1 (Frontend Tier)

---

## 1. SSE Client Hook — `apps/web/src/hooks/useSSEQuery.ts`

```typescript
/**
 * useSSEQuery.ts — SSE streaming hook for conversational queries.
 *
 * REQ-CQI-001: Chat-style UI with SSE streaming.
 * Streams events: status → sql → results → chart → narrative → complete.
 */

import { useState, useCallback, useRef } from 'react';

export interface QueryStreamState {
  stage: 'idle' | 'fetching_schema' | 'generating_sql' | 'executing' | 'complete' | 'error';
  statusMessage: string;
  sql: string | null;
  explanation: string | null;
  results: Record<string, unknown>[] | null;
  columns: Array<{ name: string; dataType: string }> | null;
  rowCount: number;
  executionTimeMs: number;
  costEstimate: number;
  cached: boolean;
  chartType: string | null;
  narrative: { summary: string; confidence: number; keyFindings: string[] } | null;
  lineage: Record<string, unknown> | null;
  warnings: string[];
  error: string | null;
  messageId: string | null;
}

const initialState: QueryStreamState = {
  stage: 'idle',
  statusMessage: '',
  sql: null,
  explanation: null,
  results: null,
  columns: null,
  rowCount: 0,
  executionTimeMs: 0,
  costEstimate: 0,
  cached: false,
  chartType: null,
  narrative: null,
  lineage: null,
  warnings: [],
  error: null,
  messageId: null,
};

export function useSSEQuery() {
  const [state, setState] = useState<QueryStreamState>(initialState);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const sendQuestion = useCallback(
    async (conversationId: string, question: string, connectionId: string) => {
      // Reset state
      setState({ ...initialState, stage: 'fetching_schema', statusMessage: 'Connecting...' });
      setIsStreaming(true);

      abortRef.current = new AbortController();

      try {
        const response = await fetch(
          `/api/conversations/${conversationId}/messages`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
            },
            body: JSON.stringify({ question, connectionId }),
            signal: abortRef.current.signal,
          },
        );

        if (!response.ok || !response.body) {
          throw new Error(`Request failed: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split('\n\n');
          buffer = events.pop() ?? '';

          for (const eventBlock of events) {
            const lines = eventBlock.split('\n');
            let eventType = '';
            let eventData = '';

            for (const line of lines) {
              if (line.startsWith('event: ')) eventType = line.slice(7);
              if (line.startsWith('data: ')) eventData = line.slice(6);
            }

            if (!eventType || !eventData) continue;
            const data = JSON.parse(eventData);

            switch (eventType) {
              case 'status':
                setState((prev) => ({
                  ...prev,
                  stage: data.stage,
                  statusMessage: data.message,
                }));
                break;
              case 'sql':
                setState((prev) => ({
                  ...prev,
                  sql: data.sql,
                  explanation: data.explanation,
                }));
                break;
              case 'results':
                setState((prev) => ({
                  ...prev,
                  results: data.rows,
                  columns: data.columns,
                  rowCount: data.rowCount,
                  executionTimeMs: data.executionTimeMs,
                  costEstimate: data.costEstimate,
                  cached: data.cached,
                }));
                break;
              case 'chart':
                setState((prev) => ({ ...prev, chartType: data.chartType }));
                break;
              case 'narrative':
                setState((prev) => ({ ...prev, narrative: data }));
                break;
              case 'lineage':
                setState((prev) => ({ ...prev, lineage: data }));
                break;
              case 'warnings':
                setState((prev) => ({ ...prev, warnings: data.warnings }));
                break;
              case 'complete':
                setState((prev) => ({
                  ...prev,
                  stage: 'complete',
                  messageId: data.messageId,
                }));
                break;
              case 'error':
                setState((prev) => ({
                  ...prev,
                  stage: 'error',
                  error: data.error,
                }));
                break;
            }
          }
        }
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          setState((prev) => ({
            ...prev,
            stage: 'error',
            error: (error as Error).message,
          }));
        }
      } finally {
        setIsStreaming(false);
      }
    },
    [],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  return { state, isStreaming, sendQuestion, cancel };
}
```

---

## 2. Chat Interface Component — `apps/web/src/components/chat/ChatInterface.tsx`

```tsx
/**
 * ChatInterface.tsx — Main conversational query UI.
 *
 * REQ-CQI-001: Chat-style interface with streaming responses.
 * REQ-CQI-003: Conversation sidebar with search.
 * REQ-CQI-008: SQL displayed with copy button and expandable view.
 * REQ-CQI-010: Thumbs up/down feedback buttons.
 */

import React, { useState, useRef, useEffect } from 'react';
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

export function ChatInterface({ conversationId, connectionId }: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const { state, isStreaming, sendQuestion } = useSSEQuery();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, state]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const question = input.trim();
    setInput('');

    // Add user message
    setMessages((prev) => [...prev, { role: 'user', content: question }]);

    // Send to backend via SSE
    await sendQuestion(conversationId, question, connectionId);

    // Add assistant message from completed state
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
      {/* Message List */}
      <div className="chat-messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message message-${msg.role}`}>
            {msg.role === 'user' ? (
              <div className="user-message">{msg.content}</div>
            ) : (
              <div className="assistant-message">
                {/* Confidence Badge — REQ-DVI-006 */}
                {msg.confidence != null && (
                  <ConfidenceBadge score={msg.confidence} />
                )}

                {/* SQL Display — REQ-CQI-008 */}
                {msg.sql && <SqlDisplay sql={msg.sql} />}

                {/* Results Metadata */}
                {msg.rowCount != null && (
                  <div className="result-meta">
                    {msg.rowCount} rows · {msg.executionTimeMs}ms
                    {msg.cached && <span className="cache-badge">Cached</span>}
                  </div>
                )}

                {/* Chart Visualization — REQ-DVI-001–003 */}
                {msg.results && msg.columns && msg.chartType && (
                  <ChartRenderer
                    data={msg.results}
                    columns={msg.columns}
                    chartType={msg.chartType}
                    messageId={msg.messageId}
                  />
                )}

                {/* Results Table */}
                {msg.results && msg.columns && (
                  <ResultsTable
                    data={msg.results}
                    columns={msg.columns}
                  />
                )}

                {/* Narrative Summary — REQ-DVI-004 */}
                {msg.narrative && <NarrativeCard narrative={msg.narrative} />}

                {/* Data Lineage — REQ-DVI-005 */}
                {msg.lineage && <LineagePanel lineage={msg.lineage} />}

                {/* Feedback — REQ-CQI-010 */}
                {msg.messageId && (
                  <FeedbackButtons
                    conversationId={conversationId}
                    messageId={msg.messageId}
                  />
                )}
              </div>
            )}
          </div>
        ))}

        {/* Streaming indicator */}
        {isStreaming && (
          <div className="streaming-indicator">
            <div className="dot-pulse" />
            <span>{state.statusMessage}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form className="chat-input-form" onSubmit={handleSubmit}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
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
```

---

## 3. Chart Renderer — `apps/web/src/components/charts/ChartRenderer.tsx`

```tsx
/**
 * ChartRenderer.tsx — Recharts-based visualization rendering.
 *
 * REQ-DVI-001: Auto-detected chart types.
 * REQ-DVI-002: Recharts, responsive, accessible, drill-down.
 * REQ-DVI-003: User-overrideable visualization type.
 */

import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const CHART_COLORS = [
  '#6366F1', '#8B5CF6', '#EC4899', '#F59E0B',
  '#10B981', '#3B82F6', '#EF4444', '#14B8A6',
];

interface ChartRendererProps {
  data: Record<string, unknown>[];
  columns: Array<{ name: string; dataType: string }>;
  chartType: string;
  messageId?: string | null;
  onDrillDown?: (dataPoint: Record<string, unknown>) => void;
}

export function ChartRenderer({
  data,
  columns,
  chartType: initialChartType,
  onDrillDown,
}: ChartRendererProps) {
  const [chartType, setChartType] = useState(initialChartType);

  const numericColumns = useMemo(
    () => columns.filter((c) =>
      ['integer', 'bigint', 'decimal', 'numeric', 'float', 'double', 'number']
        .some((t) => c.dataType.toLowerCase().includes(t)),
    ),
    [columns],
  );

  const categoryColumns = useMemo(
    () => columns.filter((c) => !numericColumns.includes(c)),
    [columns, numericColumns],
  );

  const categoryKey = categoryColumns[0]?.name ?? columns[0]?.name ?? 'name';

  // ─── Chart Type Picker (REQ-DVI-003) ─────────────────────────────
  const availableTypes = ['BAR', 'LINE', 'PIE', 'SCATTER', 'TABLE', 'KPI'];

  const renderChart = () => {
    switch (chartType) {
      case 'BAR':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data} onClick={(e) => onDrillDown?.(e.activePayload?.[0]?.payload)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey={categoryKey} stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip contentStyle={{ background: '#1F2937', border: 'none', borderRadius: 8 }} />
              <Legend />
              {numericColumns.map((col, i) => (
                <Bar key={col.name} dataKey={col.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'LINE':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey={categoryKey} stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip contentStyle={{ background: '#1F2937', border: 'none', borderRadius: 8 }} />
              <Legend />
              {numericColumns.map((col, i) => (
                <Line
                  key={col.name}
                  type="monotone"
                  dataKey={col.name}
                  stroke={CHART_COLORS[i % CHART_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'PIE':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={data}
                dataKey={numericColumns[0]?.name ?? ''}
                nameKey={categoryKey}
                cx="50%"
                cy="50%"
                outerRadius={150}
                label
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'SCATTER':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey={numericColumns[0]?.name} stroke="#9CA3AF" />
              <YAxis dataKey={numericColumns[1]?.name} stroke="#9CA3AF" />
              <Tooltip />
              <Scatter data={data} fill="#6366F1" />
            </ScatterChart>
          </ResponsiveContainer>
        );

      case 'KPI':
        return (
          <div className="kpi-grid">
            {columns.map((col) => (
              <div key={col.name} className="kpi-card">
                <div className="kpi-label">{col.name}</div>
                <div className="kpi-value">
                  {String(data[0]?.[col.name] ?? '-')}
                </div>
              </div>
            ))}
          </div>
        );

      default:
        return null; // TABLE handled separately
    }
  };

  return (
    <div className="chart-container">
      {/* Chart Type Picker */}
      <div className="chart-type-picker">
        {availableTypes.map((type) => (
          <button
            key={type}
            className={`chart-type-btn ${chartType === type ? 'active' : ''}`}
            onClick={() => setChartType(type)}
          >
            {type}
          </button>
        ))}
      </div>

      {renderChart()}
    </div>
  );
}
```

---

## 4. Confidence Badge — `apps/web/src/components/chat/ConfidenceBadge.tsx`

```tsx
/**
 * ConfidenceBadge.tsx — Visual indicator for LLM confidence.
 *
 * REQ-DVI-006: Confidence score with warning badge for low values.
 */

import React from 'react';

interface ConfidenceBadgeProps {
  score: number;
}

export function ConfidenceBadge({ score }: ConfidenceBadgeProps) {
  const percentage = Math.round(score * 100);

  let color = '#10B981'; // green
  let label = 'High Confidence';

  if (score < 0.5) {
    color = '#EF4444'; // red
    label = '⚠ Low Confidence';
  } else if (score < 0.75) {
    color = '#F59E0B'; // amber
    label = 'Medium Confidence';
  }

  return (
    <div className="confidence-badge" style={{ borderColor: color }}>
      <div className="confidence-bar" style={{ width: `${percentage}%`, backgroundColor: color }} />
      <span className="confidence-text" style={{ color }}>
        {label} ({percentage}%)
      </span>
    </div>
  );
}
```

---

## 5. SQL Display with Copy — `apps/web/src/components/chat/SqlDisplay.tsx`

```tsx
/**
 * SqlDisplay.tsx — Expandable SQL view with copy button.
 *
 * REQ-CQI-008: SQL always displayed with copy + expandable view.
 */

import React, { useState } from 'react';

interface SqlDisplayProps {
  sql: string;
}

export function SqlDisplay({ sql }: SqlDisplayProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const isLong = sql.length > 200;
  const displaySql = expanded || !isLong ? sql : sql.slice(0, 200) + '...';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="sql-display">
      <div className="sql-header">
        <span className="sql-label">Generated SQL</span>
        <div className="sql-actions">
          <button className="sql-copy-btn" onClick={handleCopy}>
            {copied ? '✓ Copied' : 'Copy'}
          </button>
          {isLong && (
            <button className="sql-expand-btn" onClick={() => setExpanded(!expanded)}>
              {expanded ? 'Collapse' : 'Expand'}
            </button>
          )}
        </div>
      </div>
      <pre className="sql-code">
        <code>{displaySql}</code>
      </pre>
    </div>
  );
}
```

---

## 6. Narrative Summary Card — `apps/web/src/components/chat/NarrativeCard.tsx`

```tsx
/**
 * NarrativeCard.tsx — AI-generated narrative summary display.
 *
 * REQ-DVI-004: 1–3 sentence summary with key findings.
 */

import React from 'react';

interface NarrativeCardProps {
  narrative: {
    summary: string;
    confidence: number;
    keyFindings: string[];
  };
}

export function NarrativeCard({ narrative }: NarrativeCardProps) {
  return (
    <div className="narrative-card">
      <div className="narrative-icon">💡</div>
      <div className="narrative-content">
        <p className="narrative-summary">{narrative.summary}</p>
        {narrative.keyFindings.length > 0 && (
          <ul className="narrative-findings">
            {narrative.keyFindings.map((finding, i) => (
              <li key={i}>{finding}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
```

---

## 7. Data Lineage Panel — `apps/web/src/components/chat/LineagePanel.tsx`

```tsx
/**
 * LineagePanel.tsx — Collapsible data lineage panel.
 *
 * REQ-DVI-005: Source tables, columns, filters, aggregations, rows scanned.
 */

import React, { useState } from 'react';

interface LineagePanelProps {
  lineage: {
    tablesUsed?: string[];
    columnsUsed?: string[];
    filters?: string[];
    aggregations?: string[];
    rowsScanned?: number;
    rowsReturned?: number;
  };
}

export function LineagePanel({ lineage }: LineagePanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="lineage-panel">
      <button className="lineage-toggle" onClick={() => setOpen(!open)}>
        {open ? '▼' : '▶'} Data Lineage
      </button>
      {open && (
        <div className="lineage-details">
          {lineage.tablesUsed && lineage.tablesUsed.length > 0 && (
            <div className="lineage-section">
              <strong>Tables:</strong> {lineage.tablesUsed.join(', ')}
            </div>
          )}
          {lineage.columnsUsed && lineage.columnsUsed.length > 0 && (
            <div className="lineage-section">
              <strong>Columns:</strong> {lineage.columnsUsed.join(', ')}
            </div>
          )}
          {lineage.filters && lineage.filters.length > 0 && (
            <div className="lineage-section">
              <strong>Filters:</strong> {lineage.filters.join(' AND ')}
            </div>
          )}
          {lineage.aggregations && lineage.aggregations.length > 0 && (
            <div className="lineage-section">
              <strong>Aggregations:</strong> {lineage.aggregations.join(', ')}
            </div>
          )}
          <div className="lineage-section">
            <strong>Rows:</strong> {lineage.rowsScanned ?? '?'} scanned → {lineage.rowsReturned ?? '?'} returned
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## 8. Verification Checklist

| Step | Action | Expected |
|------|--------|----------|
| Chat renders | Open conversation page | Input area + message list |
| Question streams | Ask "Show total sales" | SSE stages animate in order |
| SQL displayed | Complete response | SQL block with copy + expand buttons |
| Chart renders | Query returns data | Recharts bar/line/pie based on shape |
| Chart override | Click different chart type | Visualization switches (REQ-DVI-003) |
| KPI card | Single-value result | Large number display |
| Confidence badge | Low confidence result | Amber/red warning badge |
| Narrative shows | Complete response | 💡 card with summary + findings |
| Lineage expands | Click "Data Lineage" | Tables, columns, filters shown |
| Feedback buttons | Click thumbs up | Feedback saved to DB |
| Copy SQL | Click "Copy" | SQL copied to clipboard |

---

## Next Skill → `08_dashboard_builder_skill.md`
