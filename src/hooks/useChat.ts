import { useState } from 'react';
import { useChatStore } from '../store/chatStore';
import { useTTS } from './useTTS';

export const useChat = () => {
  const { addMessage, setLoading, isMuted } = useChatStore();
  const { playTTS, stop: stopTTS } = useTTS();
  const [error, setError] = useState<string | null>(null);

  const sendMessage = async (text: string) => {
    try {
      setError(null);
      
      // Stop any currently playing audio when sending a new message
      stopTTS();
      
      // Add user message immediately
      addMessage({
        from: 'user',
        text,
      });
      
      console.log('Sending message to webhook');
      
      // Show loading state
      setLoading(true);
      
      // Call the webhook directly
      const encodedMessage = encodeURIComponent(text);
      const response = await fetch(`https://pterenin.app.n8n.cloud/webhook/request-assistence?message=${encodedMessage}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Webhook response:', result);
        
        // Handle the simplified response format: [{ "output": "Hello" }]
        if (Array.isArray(result) && result.length > 0) {
          const responseItem = result[0];
          const messageText = responseItem.output || responseItem.text;
          
          if (messageText) {
            // Add the response as a bot message
            addMessage({
              from: 'bot',
              text: messageText,
            });
            
            // Release the input field immediately after API response
            setLoading(false);
            
            // Use OpenAI TTS for audio playback if not muted (don't wait for it)
            if (!isMuted) {
              console.log('Playing TTS for response');
              playTTS(messageText);
            }
          } else {
            setLoading(false);
          }
        } else {
          setLoading(false);
        }
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
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
      
      // Release the input field after error handling
      setLoading(false);
      
      // Use TTS for error message if not muted (don't wait for it)
      if (!isMuted) {
        playTTS(errorMessage);
      }
    }
  };

  const handleActionClick = async (actionId: string) => {
    try {
      // Simple action handling
      const successMessage = `Action "${actionId}" triggered successfully!`;
      addMessage({
        from: 'bot',
        text: successMessage,
      });
      
      if (!isMuted) {
        await playTTS(successMessage);
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
  };
};
