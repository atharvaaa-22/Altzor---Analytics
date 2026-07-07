import { create } from 'zustand';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
}

interface ActiveChatState {
  conversationId: string | null;
  messages: Message[];
  isStreaming: boolean;
  setConversationId: (id: string | null) => void;
  addMessage: (msg: Message) => void;
  setStreaming: (status: boolean) => void;
  updateLastMessage: (content: string) => void;
}

export const useActiveChatStore = create<ActiveChatState>((set) => ({
  conversationId: null,
  messages: [
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I am Altzor AI. Ask me anything about your data.',
    },
  ],
  isStreaming: false,
  setConversationId: (id: string | null): void => {
    set({ conversationId: id });
  },
  addMessage: (msg: Message): void => {
    set((state) => ({ messages: [...state.messages, msg] }));
  },
  setStreaming: (status: boolean): void => {
    set({ isStreaming: status });
  },
  updateLastMessage: (content: string): void => {
    set((state) => {
      const newMessages = [...state.messages];
      if (newMessages.length > 0) {
        newMessages[newMessages.length - 1].content = content;
      }
      return { messages: newMessages };
    });
  },
}));
