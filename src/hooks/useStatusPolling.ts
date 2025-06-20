
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
  const lastProcessedTime = useRef<string>('');
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
      case 'complete':
        console.log('Received message/complete update:', update.message);
        
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
          
          // Stop polling after receiving a complete message
          if (update.type === 'complete') {
            console.log('Message complete, stopping polling');
            stopPolling();
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
        
        stopPolling();
        break;
    }
  };
  
  const pollStatus = async () => {
    if (!sessionId) return;
    
    try {
      console.log('Polling for updates, session:', sessionId);
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
        console.log('Polling response:', data);
        
        // Process new updates (those created after our last processed time)
        const newUpdates = data.updates.filter(update => {
          return update.created_at > lastProcessedTime.current;
        });
        
        console.log('New updates found:', newUpdates.length);
        
        if (newUpdates.length > 0) {
          // Sort by created_at to process in chronological order
          newUpdates.sort((a, b) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
          
          // Process each new update
          newUpdates.forEach((update, index) => {
            console.log(`Processing update ${index + 1}/${newUpdates.length}:`, update);
            processStatusUpdate(update);
          });
          
          // Update the last processed timestamp
          lastProcessedTime.current = newUpdates[newUpdates.length - 1].created_at;
          console.log('Updated last processed time to:', lastProcessedTime.current);
        }
      } else {
        console.error('Polling failed:', response.status, response.statusText);
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
    
    // Reset timestamp to start fresh
    lastProcessedTime.current = new Date().toISOString();
    console.log('Set initial timestamp to:', lastProcessedTime.current);
    
    // Start polling every 1 second for faster response
    pollingInterval.current = setInterval(pollStatus, 1000);
    
    // Do an immediate poll after a short delay to catch immediate responses
    setTimeout(() => {
      console.log('Doing initial poll');
      pollStatus();
    }, 200);
  };
  
  const stopPolling = () => {
    console.log('Stopping status polling');
    
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
    
    setIsPolling(false);
    setSessionId('');
    lastProcessedTime.current = '';
  };
  
  // Trigger n8n workflow via HTTP
  const triggerWorkflow = async (message: string) => {
    try {
      const timestamp = Date.now();
      const newSessionId = `session_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log('Triggering workflow with session:', newSessionId);
      console.log('Using timestamp for n8n:', timestamp);
      
      // Start polling before triggering the workflow
      startPolling(newSessionId);
      
      // Trigger the n8n workflow
      const encodedMessage = encodeURIComponent(message);
      const n8nUrl = `https://pterenin.app.n8n.cloud/webhook/request-assistence?message=${encodedMessage}&session_id=${timestamp}`;
      
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
      
      // Get the response from n8n
      const responseData = await response.json();
      console.log('N8N direct response:', responseData);
      
      // Immediately process the response by posting it to our status endpoint
      console.log('Processing immediate n8n response via status endpoint');
      
      try {
        const statusResponse = await fetch(
          'https://pqwrhinsjifmaaziyhqj.supabase.co/functions/v1/workflow-status',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxd3JoaW5zamlmbWFheml5aHFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg5MDkxMzYsImV4cCI6MjA2NDQ4NTEzNn0.58ZzeBUIuWl2DVGpPj1B7EqWpI_GbGyzplNoMCL66ik`
            },
            body: JSON.stringify(responseData)
          }
        );
        
        if (statusResponse.ok) {
          console.log('Successfully posted immediate response to status endpoint');
          // Give a short delay for the database insert to complete, then poll
          setTimeout(() => {
            pollStatus();
          }, 500);
        } else {
          console.error('Failed to post to status endpoint:', await statusResponse.text());
        }
      } catch (statusError) {
        console.error('Error posting to status endpoint:', statusError);
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
