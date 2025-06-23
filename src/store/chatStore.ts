
import { create } from 'zustand';

export interface Message {
  id: string;
  from: 'user' | 'bot';
  text: string;
  actions?: { id: string; label: string }[];
  timestamp?: Date;
}

interface VoiceSettings {
  voice?: string;
  apiKey?: string;
  voiceId?: string;
}

interface ChatState {
  messages: Message[];
  isLoading: boolean;
  isMuted: boolean;
  voiceSettings: VoiceSettings;
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  setLoading: (loading: boolean) => void;
  toggleMute: () => void;
  clearMessages: () => void;
  updateVoiceSettings: (settings: Partial<VoiceSettings>) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [
    {
      id: '1',
      from: 'bot',
      text: 'Hello! I\'m Deana, your AI assistant. How can I help you today?',
      timestamp: new Date(),
    }
  ],
  isLoading: false,
  isMuted: false,
  voiceSettings: {
    voice: 'alloy',
  },
  addMessage: (message) => {
    const newMessage: Message = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date(),
    };
    set((state) => ({
      messages: [...state.messages, newMessage]
    }));
  },
  setLoading: (loading) => set({ isLoading: loading }),
  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
  clearMessages: () => set({ messages: [] }),
  updateVoiceSettings: (settings) => set((state) => ({
    voiceSettings: { ...state.voiceSettings, ...settings }
  })),
}));
