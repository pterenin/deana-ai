
import React from 'react';
import { ChatContainer } from '../components/ChatContainer';
import { ChatInput } from '../components/ChatInput';
import { ChatHeader } from '../components/ChatHeader';
import { useChat } from '../hooks/useChat';
import { useChatStore } from '../store/chatStore';
import { Toaster } from '@/components/ui/toaster';

const Index = () => {
  const { sendMessage, handleActionClick, error } = useChat();
  const { isLoading } = useChatStore();

  return (
    <div className="h-screen flex flex-col bg-white">
      <ChatHeader />
      
      <ChatContainer onAction={handleActionClick} />
      
      <ChatInput 
        onSendMessage={sendMessage} 
        disabled={isLoading}
      />
      
      {error && (
        <div className="bg-red-50 border-t border-red-200 p-2 text-center">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}
      
      <Toaster />
    </div>
  );
};

export default Index;
