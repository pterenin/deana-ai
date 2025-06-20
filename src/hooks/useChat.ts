
import { useState } from 'react';
import { useChatStore } from '../store/chatStore';

export const useChat = () => {
  const { addMessage, setLoading, isMuted } = useChatStore();
  const [error, setError] = useState<string | null>(null);

  const handleAudioPlayback = async (audioBase64: string, messageText: string) => {
    try {
      const audioBytes = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0));
      const audioBlob = new Blob([audioBytes], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        console.log('Audio playback completed');
        URL.revokeObjectURL(audioUrl);
      };
      
      audio.onerror = (error) => {
        console.error('Audio playback error:', error);
        URL.revokeObjectURL(audioUrl);
        // Fallback to browser speech synthesis
        const utterance = new SpeechSynthesisUtterance(messageText);
        speechSynthesis.speak(utterance);
      };
      
      await audio.play();
    } catch (audioError) {
      console.error('Error playing audio:', audioError);
      // Fallback to browser speech synthesis
      const utterance = new SpeechSynthesisUtterance(messageText);
      speechSynthesis.speak(utterance);
    }
  };

  const sendMessage = async (text: string) => {
    try {
      setError(null);
      
      // Add user message immediately
      addMessage({
        from: 'user',
        text,
      });
      
      console.log('Sending message directly to webhook');
      
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
        
        // Parse the response array
        if (Array.isArray(result) && result.length > 0) {
          const responseItem = result[0];
          
          // Handle nested notification structure
          const notification = responseItem.notification;
          if (notification) {
            const messageText = notification.text;
            const audioBase64 = notification.audio;
            
            if (messageText) {
              // Add the response as a bot message
              addMessage({
                from: 'bot',
                text: messageText,
              });
              
              // Handle audio if available and not muted
              if (audioBase64 && !isMuted) {
                handleAudioPlayback(audioBase64, messageText);
              }
            }
          } else {
            // Fallback to old format if notification structure not found
            const messageText = responseItem.text || responseItem.output;
            const audioDataUrl = responseItem.audioDataUrl;
            
            if (messageText) {
              addMessage({
                from: 'bot',
                text: messageText,
              });
              
              if (audioDataUrl && !isMuted) {
                try {
                  const audio = new Audio(audioDataUrl);
                  audio.onended = () => console.log('Audio playback completed');
                  audio.onerror = (error) => {
                    console.error('Audio playback error:', error);
                    const utterance = new SpeechSynthesisUtterance(messageText);
                    speechSynthesis.speak(utterance);
                  };
                  await audio.play();
                } catch (audioError) {
                  console.error('Error playing audio:', audioError);
                  const utterance = new SpeechSynthesisUtterance(messageText);
                  speechSynthesis.speak(utterance);
                }
              }
            }
          }
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
      
      if (!isMuted) {
        const utterance = new SpeechSynthesisUtterance(errorMessage);
        speechSynthesis.speak(utterance);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleActionClick = (actionId: string) => {
    try {
      // Simple action handling
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
  };
};
