import { useState } from 'react';
import { useActiveChatStore } from '../stores/activeChatStore';

export const useChatStream = () => {
  const { addMessage, updateLastMessage, setStreaming } = useActiveChatStore();

  const sendPrompt = async (text: string) => {
    addMessage({ id: Date.now().toString(), role: 'user', content: text });
    setStreaming(true);
    
    // Add empty assistant message
    const msgId = (Date.now() + 1).toString();
    addMessage({ id: msgId, role: 'assistant', content: '' });

    // Mock streaming response
    const mockResponse = `Here is the data you requested:\n\n\`\`\`sql\nSELECT \n  date_trunc('month', created_at) AS month, \n  SUM(amount) AS revenue\nFROM \n  orders\nWHERE \n  status = 'completed'\nGROUP BY \n  month\nORDER BY \n  month DESC;\n\`\`\`\n\nI can also visualize this for you if you'd like!`;
    
    let currentText = '';
    for (let i = 0; i < mockResponse.length; i++) {
      currentText += mockResponse[i];
      updateLastMessage(currentText);
      await new Promise(r => setTimeout(r, 15)); // 15ms per char
    }
    
    setStreaming(false);
  };

  return { sendPrompt };
};
