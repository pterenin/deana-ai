import { create } from "zustand";

export interface Message {
  id: string;
  from: "user" | "bot";
  text: string;
  status?: string;
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
  addMessage: (message: Omit<Message, "id" | "timestamp">) => string;
  updateLastMessage: (messageId: string, text: string) => void;
  updateMessageStatus: (messageId: string, status: string) => void;
  setLoading: (loading: boolean) => void;
  toggleMute: () => void;
  clearMessages: () => void;
  updateVoiceSettings: (settings: Partial<VoiceSettings>) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [
    {
      id: "1",
      from: "bot",
      text: "Hello! I'm Deana, your AI assistant. How can I help you today?",
      timestamp: new Date(),
    },
  ],
  isLoading: false,
  isMuted: false,
  voiceSettings: {
    voice: "shimmer",
  },
  addMessage: (message) => {
    console.log("ChatStore: Adding message:", message);
    const newMessage: Message = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date(),
    };
    console.log("ChatStore: Created new message:", newMessage);
    set((state) => {
      const updatedMessages = [...state.messages, newMessage];
      console.log("ChatStore: All messages after adding:", updatedMessages);
      return { messages: updatedMessages };
    });
    return newMessage.id;
  },
  updateLastMessage: (messageId: string, text: string) => {
    console.log("ChatStore: Updating message", messageId, "with text:", text);
    set((state) => {
      const updatedMessages = state.messages.map((msg) =>
        msg.id === messageId && msg.from === "bot" ? { ...msg, text } : msg
      );
      console.log("ChatStore: Updated messages:", updatedMessages);
      return { messages: updatedMessages };
    });
  },
  updateMessageStatus: (messageId: string, status: string) => {
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === messageId ? { ...msg, status } : msg
      ),
    }));
  },
  setLoading: (loading) => set({ isLoading: loading }),
  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
  clearMessages: () => set({ messages: [] }),
  updateVoiceSettings: (settings) =>
    set((state) => ({
      voiceSettings: { ...state.voiceSettings, ...settings },
    })),
}));
