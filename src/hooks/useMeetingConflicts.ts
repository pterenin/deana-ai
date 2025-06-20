
import { useChatStore } from '../store/chatStore';
import { useAudioPlayback } from './useAudioPlayback';

export const useMeetingConflicts = () => {
  const { addMessage, isMuted } = useChatStore();
  const { handleAudioPlayback, playAudioFromDataUrl } = useAudioPlayback();

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
                await playAudioFromDataUrl(audioDataUrl, messageText);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking meeting conflicts:', error);
    }
  };

  return { checkMeetingConflicts };
};
