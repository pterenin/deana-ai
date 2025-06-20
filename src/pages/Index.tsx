
import React from 'react';
import { ChatContainer } from '../components/ChatContainer';
import { ChatInput } from '../components/ChatInput';
import { ChatHeader } from '../components/ChatHeader';
import { useChat } from '../hooks/useChat';
import { useChatStore } from '../store/chatStore';
import { Toaster } from '@/components/ui/toaster';

const Index = () => {
  const { sendMessage, handleActionClick, error, isPolling } = useChat();
  const { isLoading } = useChatStore();

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <ChatHeader />
      
      <ChatContainer onAction={handleActionClick} />
      
      <ChatInput 
        onSendMessage={sendMessage} 
        disabled={isLoading || isPolling}
      />
      
      {error && (
        <div className="bg-red-50 border-t border-red-200 p-2 text-center">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}
      
      {isPolling && (
        <div className="bg-blue-50 border-t border-blue-200 p-2 text-center">
          <p className="text-blue-600 text-sm">Processing your request...</p>
        </div>
      )}
      
      <Toaster />
    </div>
  );
};

export default Index;
