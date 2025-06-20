
import { useState, useEffect } from 'react';
import { useChatStore } from '../store/chatStore';
import { sendMessageToDeana, handleActionClick as handleAction } from '../utils/api';
import { useVoice } from './useVoice';

export const useChat = () => {
  const { addMessage, setLoading, isMuted } = useChatStore();
  const [error, setError] = useState<string | null>(null);
  const voice = useVoice({ voice: 'nova' });

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
        
        // Parse the response array
        if (Array.isArray(result) && result.length > 0) {
          const responseItem = result[0];
          
          // Handle both "text" and "output" properties
          const messageText = responseItem.text || responseItem.output;
          
          if (messageText) {
            // Add the response as a bot message
            addMessage({
              from: 'bot',
              text: messageText,
            });
            
            // Handle audio if available and not muted
            if (responseItem.audioDataUrl && !isMuted) {
              try {
                // Create audio from data URL
                const audio = new Audio(responseItem.audioDataUrl);
                
                audio.onended = () => {
                  console.log('Audio playback completed');
                };
                
                audio.onerror = (error) => {
                  console.error('Audio playback error:', error);
                  // Fallback to text-to-speech if audio fails
                  voice.speak(messageText);
                };
                
                await audio.play();
              } catch (audioError) {
                console.error('Error playing audio:', audioError);
                // Fallback to text-to-speech if audio file fails
                voice.speak(messageText);
              }
            } else if (!isMuted && messageText) {
              // If no audio file, use text-to-speech
              voice.speak(messageText);
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
      
      // Wait for the API response instead of sending to mock backend
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
        voice.speak(errorMessage);
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
        voice.speak(successMessage);
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
    voiceError: voice.error,
    isVoicePlaying: voice.isPlaying,
  };
};
