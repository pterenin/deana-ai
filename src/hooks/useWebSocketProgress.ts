
import { useChatStore } from '../store/chatStore';
import { useWebSocket, ProgressUpdate } from './useWebSocket';
import { useAudioPlayback } from './useAudioPlayback';

export const useWebSocketProgress = () => {
  const { addMessage, setLoading, isMuted, updateProgress, resetProgress } = useChatStore();
  const { handleAudioPlayback } = useAudioPlayback();

  const handleProgressUpdate = (update: ProgressUpdate) => {
    console.log('Progress update received in useWebSocketProgress:', update);
    
    switch (update.type) {
      case 'connected':
        console.log('WebSocket connected with ID:', update.connectionId);
        break;
        
      case 'progress':
        console.log('Updating progress:', update.progress, update.message);
        // Handle both string and object message formats
        const messageText = typeof update.message === 'string' 
          ? update.message 
          : update.message?.text || 'Processing...';
        
        updateProgress({
          isVisible: true,
          progress: update.progress || 0,
          message: messageText
        });
        break;
        
      case 'message':
        console.log('Received message update:', update.message);
        const msgText = typeof update.message === 'string' 
          ? update.message 
          : update.message?.text || '';
          
        if (msgText) {
          // Hide progress indicator first, then add message
          resetProgress();
          setLoading(false);
          
          addMessage({
            from: 'bot',
            text: msgText,
          });
          
          // Handle audio if available and not muted
          if (update.data?.audio && !isMuted) {
            handleAudioPlayback(update.data.audio, msgText);
          }
        }
        break;
        
      case 'complete':
        console.log('Workflow completed:', update.message);
        resetProgress();
        setLoading(false);
        const completeText = typeof update.message === 'string' 
          ? update.message 
          : update.message?.text || '';
          
        if (completeText) {
          addMessage({
            from: 'bot',
            text: completeText,
          });
          
          // Handle audio if available and not muted
          if (update.data?.audio && !isMuted) {
            handleAudioPlayback(update.data.audio, completeText);
          }
        }
        break;
        
      case 'error':
        console.log('Workflow error:', update.message);
        resetProgress();
        setLoading(false);
        const errorText = typeof update.message === 'string' 
          ? update.message 
          : update.message?.text || 'An error occurred during processing.';
        addMessage({
          from: 'bot',
          text: errorText,
        });
        break;
    }
  };

  // WebSocket connection for real-time updates
  const { isConnected: wsConnected, sendMessage: wsSendMessage } = useWebSocket(
    '', // URL is handled internally by the hook
    {
      onProgressUpdate: handleProgressUpdate
    }
  );

  return {
    wsConnected,
    wsSendMessage
  };
};
