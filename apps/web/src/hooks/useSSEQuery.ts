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

export function useSSEQuery(): {
  state: QueryStreamState;
  isStreaming: boolean;
  sendQuestion: (conversationId: string, question: string, connectionId: string) => Promise<void>;
  cancel: () => void;
} {
  const [state, setState] = useState<QueryStreamState>(initialState);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const sendQuestion = useCallback(
    async (conversationId: string, question: string, connectionId: string) => {
      setState({ ...initialState, stage: 'fetching_schema', statusMessage: 'Connecting...' });
      setIsStreaming(true);

      abortRef.current = new AbortController();

      try {
        const response = await fetch(`/api/conversations/${conversationId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          },
          body: JSON.stringify({ question, connectionId }),
          signal: abortRef.current.signal,
        });

        if (!response.ok || !response.body) {
          throw new Error(`Request failed: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        let isDone = false;
        while (!isDone) {
          const { done, value } = await reader.read();
          isDone = done;
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
            const data = JSON.parse(eventData) as Record<string, unknown>;

            switch (eventType) {
              case 'status':
                setState((prev) => ({
                  ...prev,
                  stage: data.stage as QueryStreamState['stage'],
                  statusMessage: data.message as string,
                }));
                break;
              case 'sql':
                setState((prev) => ({
                  ...prev,
                  sql: data.sql as string,
                  explanation: data.explanation as string,
                }));
                break;
              case 'results':
                setState((prev) => ({
                  ...prev,
                  results: data.rows as Record<string, unknown>[],
                  columns: data.columns as Array<{ name: string; dataType: string }>,
                  rowCount: data.rowCount as number,
                  executionTimeMs: data.executionTimeMs as number,
                  costEstimate: data.costEstimate as number,
                  cached: data.cached as boolean,
                }));
                break;
              case 'chart':
                setState((prev) => ({ ...prev, chartType: data.chartType as string }));
                break;
              case 'narrative':
                setState((prev) => ({
                  ...prev,
                  narrative: data as unknown as QueryStreamState['narrative'],
                }));
                break;
              case 'lineage':
                setState((prev) => ({
                  ...prev,
                  lineage: data as unknown as QueryStreamState['lineage'],
                }));
                break;
              case 'warnings':
                setState((prev) => ({ ...prev, warnings: data.warnings as string[] }));
                break;
              case 'complete':
                setState((prev) => ({
                  ...prev,
                  stage: 'complete',
                  messageId: data.messageId as string,
                }));
                break;
              case 'error':
                setState((prev) => ({
                  ...prev,
                  stage: 'error',
                  error: data.error as string,
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
