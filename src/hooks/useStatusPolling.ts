
import { useEffect, useRef, useState } from 'react';
import { useChatStore } from '../store/chatStore';
import { useAudioPlayback } from './useAudioPlayback';

interface StatusUpdate {
  id: string;
  session_id: string;
  type: 'progress' | 'message' | 'complete' | 'error';
  progress?: number;
  message?: string;
  data?: any;
  created_at: string;
}

interface StatusResponse {
  updates: StatusUpdate[];
}

export const useStatusPolling = () => {
  const { addMessage, setLoading, isMuted, updateProgress, resetProgress } = useChatStore();
  const { handleAudioPlayback } = useAudioPlayback();
  
  const [sessionId, setSessionId] = useState<string>('');
  const [isPolling, setIsPolling] = useState(false);
  const lastProcessedId = useRef<string>('');
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);
  
  const processStatusUpdate = (update: StatusUpdate) => {
    console.log('Processing status update:', update);
    
    switch (update.type) {
      case 'progress':
        console.log('Updating progress:', update.progress, update.message);
        updateProgress({
          isVisible: true,
          progress: update.progress || 0,
          message: update.message || 'Processing...'
        });
        break;
        
      case 'message':
        console.log('Received message update:', update.message);
        
        if (update.message) {
          console.log('Hiding progress and adding message to chat');
          resetProgress();
          setLoading(false);
          
          const newMessage = {
            from: 'bot' as const,
            text: update.message,
          };
          
          console.log('Adding message to chat store:', newMessage);
          addMessage(newMessage);
          
          // Handle audio if available and not muted
          if (update.data?.audio && !isMuted) {
            console.log('Playing audio for message');
            handleAudioPlayback(update.data.audio, update.message);
          }
        }
        break;
        
      case 'complete':
        console.log('Workflow completed:', update.message);
        resetProgress();
        setLoading(false);
        
        if (update.message) {
          addMessage({
            from: 'bot',
            text: update.message,
          });
          
          if (update.data?.audio && !isMuted) {
            handleAudioPlayback(update.data.audio, update.message);
          }
        }
        break;
        
      case 'error':
        console.log('Workflow error:', update.message);
        resetProgress();
        setLoading(false);
        
        addMessage({
          from: 'bot',
          text: update.message || 'An error occurred during processing.',
        });
        break;
    }
  };
  
  const pollStatus = async () => {
    if (!sessionId) return;
    
    try {
      const response = await fetch(
        `https://pqwrhinsjifmaaziyhqj.supabase.co/functions/v1/workflow-status?session_id=${sessionId}`,
        {
          headers: {
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxd3JoaW5zamlmbWFheml5aHFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg5MDkxMzYsImV4cCI6MjA2NDQ4NTEzNn0.58ZzeBUIuWl2DVGpPj1B7EqWpI_GbGyzplNoMCL66ik`
          }
        }
      );
      
      if (response.ok) {
        const data: StatusResponse = await response.json();
        
        // Process new updates (those we haven't seen before)
        const newUpdates = data.updates.filter(update => {
          return update.created_at > (lastProcessedId.current || '');
        });
        
        if (newUpdates.length > 0) {
          // Sort by created_at to process in chronological order
          newUpdates.sort((a, b) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
          
          // Process each new update
          newUpdates.forEach(processStatusUpdate);
          
          // Update the last processed timestamp
          lastProcessedId.current = newUpdates[newUpdates.length - 1].created_at;
        }
      }
    } catch (error) {
      console.error('Error polling status:', error);
    }
  };
  
  const startPolling = (newSessionId: string) => {
    console.log('Starting status polling for session:', newSessionId);
    
    // Stop any existing polling
    stopPolling();
    
    setSessionId(newSessionId);
    setIsPolling(true);
    lastProcessedId.current = new Date().toISOString(); // Start from now
    
    // Start polling every 2 seconds
    pollingInterval.current = setInterval(pollStatus, 2000);
    
    // Do an immediate poll
    setTimeout(() => pollStatus(), 100);
  };
  
  const stopPolling = () => {
    console.log('Stopping status polling');
    
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
    
    setIsPolling(false);
    setSessionId('');
    lastProcessedId.current = '';
  };
  
  // Trigger n8n workflow via HTTP
  const triggerWorkflow = async (message: string) => {
    try {
      const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log('Triggering workflow with session:', newSessionId);
      
      // Start polling before triggering the workflow
      startPolling(newSessionId);
      
      // Trigger the n8n workflow with session_id
      const encodedMessage = encodeURIComponent(message);
      const n8nUrl = `https://pterenin.app.n8n.cloud/webhook/request-assistence?message=${encodedMessage}&session_id=${newSessionId}`;
      
      console.log('Calling n8n webhook:', n8nUrl);
      
      const response = await fetch(n8nUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      return true;
    } catch (error) {
      console.error('Error triggering workflow:', error);
      stopPolling();
      throw error;
    }
  };
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);
  
  return {
    isPolling,
    triggerWorkflow,
    stopPolling
  };
};
