
import { useState } from 'react';
import { useChatStore } from '../store/chatStore';
import { handleActionClick as handleAction } from '../utils/api';
import { useMeetingConflicts } from './useMeetingConflicts';
import { useWebSocketProgress } from './useWebSocketProgress';

export const useChat = () => {
  const { addMessage, setLoading, isMuted, resetProgress } = useChatStore();
  const [error, setError] = useState<string | null>(null);
  
  const { checkMeetingConflicts } = useMeetingConflicts();
  const { wsConnected, wsSendMessage } = useWebSocketProgress();

  const sendMessage = async (text: string) => {
    try {
      setError(null);
      
      // Add user message immediately
      addMessage({
        from: 'user',
        text,
      });
      
      console.log('Sending message. WebSocket connected:', wsConnected);
      
      // Show loading state and reset progress
      setLoading(true);
      resetProgress();
      
      // Try WebSocket first, fallback to HTTP
      if (wsConnected) {
        console.log('Sending message via WebSocket');
        const sent = wsSendMessage({
          type: 'message',
          message: text,
          timestamp: new Date().toISOString()
        });
        
        if (!sent) {
          console.log('WebSocket send failed, falling back to HTTP');
          await checkMeetingConflicts(text);
          setLoading(false);
        }
      } else {
        console.log('WebSocket not connected, using HTTP');
        await checkMeetingConflicts(text);
        setLoading(false);
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      console.error('Chat error:', err);
      
      // Add error message as bot response
      const errorMessage = 'Sorry, I encountered an error. Please try again.';
      addMessage({
        from: 'bot',
        text: errorMessage,
      });
      
      if (!isMuted) {
        const utterance = new SpeechSynthesisUtterance(errorMessage);
        speechSynthesis.speak(utterance);
      }
      
      resetProgress();
      setLoading(false);
    }
  };

  const handleActionClick = (actionId: string) => {
    try {
      handleAction(actionId);
      
      // Optionally add a message showing the action was taken
      const successMessage = `Action "${actionId}" triggered successfully!`;
      addMessage({
        from: 'bot',
        text: successMessage,
      });
      
      if (!isMuted) {
        const utterance = new SpeechSynthesisUtterance(successMessage);
        speechSynthesis.speak(utterance);
      }
    } catch (err) {
      console.error('Action error:', err);
      setError('Failed to execute action');
    }
  };

  return {
    sendMessage,
    handleActionClick,
    error,
    wsConnected,
  };
};
