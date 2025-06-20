
import React, { useEffect, useRef } from 'react';
import { Bubble } from './Bubble';
import { ProgressIndicator } from './ProgressIndicator';
import { useChatStore } from '../store/chatStore';

interface ChatContainerProps {
  onAction: (actionId: string) => void;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({ onAction }) => {
  const { messages, isLoading, progressState } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, progressState.isVisible]);

  return (
    <div 
      ref={containerRef}
      className="flex-1 overflow-y-auto bg-gray-50 p-4"
      role="log"
      aria-live="polite"
      aria-label="Chat messages"
    >
      <div className="max-w-4xl mx-auto">
        {messages.map((message) => (
          <Bubble
            key={message.id}
            message={message}
            onAction={onAction}
          />
        ))}
        
        {/* WebSocket Progress Indicator */}
        <ProgressIndicator
          progress={progressState.progress}
          message={progressState.message}
          isVisible={progressState.isVisible}
        />
        
        {/* Fallback loading indicator for HTTP requests */}
        {isLoading && !progressState.isVisible && (
          <div className="flex gap-3 mb-4 justify-start">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
            <div className="bg-white border border-gray-200 shadow-sm px-4 py-3 rounded-2xl">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};
