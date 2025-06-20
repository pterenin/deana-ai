
import { useState, useEffect } from 'react';
import { useChatStore } from '../store/chatStore';
import { sendMessageToDeana, handleActionClick as handleAction } from '../utils/api';

export const useChat = () => {
  const { addMessage, setLoading, isMuted } = useChatStore();
  const [error, setError] = useState<string | null>(null);

  const checkMeetingConflicts = async (message: string) => {
    try {
      // Encode the message as a query parameter for GET request
      const encodedMessage = encodeURIComponent(message);
      const response = await fetch(`https://pterenin.app.n8n.cloud/webhook/request-assistence?message=${encodedMessage}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Meeting conflicts check result:', result);
        
        // Parse the response array - updated for new format
        if (Array.isArray(result) && result.length > 0) {
          const responseItem = result[0];
          
          // Handle new nested notification structure
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
                try {
                  // Convert base64 to audio blob and play
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
      }
    } catch (error) {
      console.error('Error checking meeting conflicts:', error);
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
      
      // Show loading state
      setLoading(true);
      
      // Wait for the API response
      await checkMeetingConflicts(text);
      
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
  };
};
