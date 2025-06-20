
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

interface ProgressState {
  isVisible: boolean;
  progress: number;
  message: string;
}

interface ChatState {
  messages: Message[];
  isLoading: boolean;
  isMuted: boolean;
  voiceSettings: VoiceSettings;
  progressState: ProgressState;
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  setLoading: (loading: boolean) => void;
  toggleMute: () => void;
  clearMessages: () => void;
  updateVoiceSettings: (settings: Partial<VoiceSettings>) => void;
  updateProgress: (progress: Partial<ProgressState>) => void;
  resetProgress: () => void;
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
    voice: 'nova',
  },
  progressState: {
    isVisible: false,
    progress: 0,
    message: 'Processing...'
  },
  addMessage: (message) => {
    const newMessage: Message = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date(),
    };
    console.log('ChatStore: Adding message:', newMessage);
    set((state) => ({
      messages: [...state.messages, newMessage]
    }));
    console.log('ChatStore: Messages after adding:', get().messages);
  },
  setLoading: (loading) => {
    console.log('ChatStore: Setting loading to:', loading);
    set({ isLoading: loading });
  },
  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
  clearMessages: () => set({ messages: [] }),
  updateVoiceSettings: (settings) => set((state) => ({
    voiceSettings: { ...state.voiceSettings, ...settings }
  })),
  updateProgress: (progress) => {
    console.log('ChatStore: Updating progress:', progress);
    set((state) => ({
      progressState: { ...state.progressState, ...progress }
    }));
  },
  resetProgress: () => {
    console.log('ChatStore: Resetting progress');
    set({
      progressState: {
        isVisible: false,
        progress: 0,
        message: 'Processing...'
      }
    });
  }
}));
