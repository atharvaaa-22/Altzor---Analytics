import { useActiveChatStore } from '../stores/activeChatStore';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../auth';

export interface UseChatStreamResult {
  sendPrompt: (text: string) => Promise<void>;
}

export const useChatStream = (): UseChatStreamResult => {
  const { conversationId, setConversationId, addMessage, updateLastMessage, setStreaming } =
    useActiveChatStore();

  const sendPrompt = async (text: string): Promise<void> => {
    addMessage({ id: Date.now().toString(), role: 'user', content: text });
    setStreaming(true);

    // Add empty assistant message
    const msgId = (Date.now() + 1).toString();
    addMessage({ id: msgId, role: 'assistant', content: '' });

    try {
      let activeConversationId = conversationId;

      // 1. If conversationId is null, create a new conversation first
      if (!activeConversationId) {
        const connRes = await api.post<{ id: string }>('/conversations', {
          connectionId: 'default',
        });
        activeConversationId = connRes.id;
        setConversationId(activeConversationId);
      }

      // 2. Fetch the stream response from the backend
      const accessToken = useAuthStore.getState().accessToken;
      const response = await fetch(`/api/conversations/${activeConversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ question: text, connectionId: 'default' }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Request failed: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      let isDone = false;
      let currentSql = '';
      let currentExplanation = '';
      let tableMarkdown = '';
      let narrativeMarkdown = '';

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
            case 'status': {
              const statusMsg = data.message as string;
              updateLastMessage(`_*Status: ${statusMsg}...*_`);
              break;
            }
            case 'sql': {
              currentSql = data.sql as string;
              currentExplanation = data.explanation as string;
              updateLastMessage(
                `### AI Generated SQL\n\n\`\`\`sql\n${currentSql}\n\`\`\`\n\n*Explanation:* ${currentExplanation}\n\n_*Status: Running query...*_`,
              );
              break;
            }
            case 'results': {
              const rows = data.rows as Record<string, unknown>[];
              const columns = data.columns as Array<{ name: string; dataType: string }>;
              if (rows && rows.length > 0 && columns) {
                const colHeaders = columns.map((c) => c.name).join(' | ');
                const colSeparators = columns.map(() => '---').join(' | ');
                const tableRows = rows
                  .slice(0, 15)
                  .map((row) =>
                    columns
                      .map((c) => {
                        const val = row[c.name];
                        return val === null || val === undefined ? 'null' : String(val);
                      })
                      .join(' | '),
                  )
                  .join('\n');
                tableMarkdown = `### Query Results (${String(data.rowCount)} rows)\n\n| ${colHeaders} |\n| ${colSeparators} |\n| ${tableRows} |\n\n${
                  rows.length > 15 ? '*Showing first 15 rows.*\n\n' : ''
                }`;
              } else {
                tableMarkdown = `### Query Results\n\nNo rows returned.\n\n`;
              }
              updateLastMessage(
                `### AI Generated SQL\n\n\`\`\`sql\n${currentSql}\n\`\`\`\n\n*Explanation:* ${currentExplanation}\n\n${tableMarkdown}_*Status: Analyzing results...*_`,
              );
              break;
            }
            case 'narrative': {
              const summary = data.summary as string;
              const keyFindings = (data.keyFindings as string[]) || [];
              let findingsMarkdown = '';
              if (keyFindings.length > 0) {
                findingsMarkdown =
                  `\n\n**Key Findings:**\n` + keyFindings.map((f) => `- ${f}`).join('\n');
              }
              narrativeMarkdown = `### Analysis Summary\n${summary}${findingsMarkdown}`;
              updateLastMessage(
                `### AI Generated SQL\n\n\`\`\`sql\n${currentSql}\n\`\`\`\n\n*Explanation:* ${currentExplanation}\n\n${tableMarkdown}\n\n${narrativeMarkdown}`,
              );
              break;
            }
            case 'complete': {
              updateLastMessage(
                `### AI Generated SQL\n\n\`\`\`sql\n${currentSql}\n\`\`\`\n\n*Explanation:* ${currentExplanation}\n\n${tableMarkdown}\n\n${narrativeMarkdown}`,
              );
              break;
            }
            case 'error': {
              updateLastMessage(`Error: ${String(data.error)}`);
              break;
            }
          }
        }
      }
    } catch (error) {
      updateLastMessage(`Error: ${(error as Error).message}`);
    } finally {
      setStreaming(false);
    }
  };

  return { sendPrompt };
};
