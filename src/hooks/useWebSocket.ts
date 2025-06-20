
import { useState, useEffect, useRef, useCallback } from 'react';

export interface ProgressUpdate {
  type: 'progress' | 'message' | 'complete' | 'error' | 'connected';
  progress?: number;
  message?: string;
  data?: any;
  connectionId?: string;
}

interface UseWebSocketOptions {
  onProgressUpdate?: (update: ProgressUpdate) => void;
  reconnectAttempts?: number;
  reconnectInterval?: number;
}

export const useWebSocket = (url: string, options: UseWebSocketOptions = {}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [reconnectCount, setReconnectCount] = useState(0);
  const isConnectingRef = useRef(false);

  const { onProgressUpdate, reconnectAttempts = 3, reconnectInterval = 5000 } = options;

  const disconnect = useCallback(() => {
    console.log('Disconnecting WebSocket...');
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }
    setIsConnected(false);
    isConnectingRef.current = false;
  }, []);

  const connect = useCallback(() => {
    // Prevent multiple simultaneous connection attempts
    if (isConnectingRef.current || (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING)) {
      console.log('Connection already in progress, skipping...');
      return;
    }

    // Clean up existing connection
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log('Already connected, skipping...');
      return;
    }

    try {
      isConnectingRef.current = true;
      const wsUrl = 'wss://pqwrhinsjifmaaziyhqj.supabase.co/functions/v1/websocket-progress';
      console.log('Connecting to WebSocket:', wsUrl);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected successfully');
        setIsConnected(true);
        setError(null);
        setReconnectCount(0);
        isConnectingRef.current = false;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket message received:', data);
          if (onProgressUpdate) {
            onProgressUpdate(data);
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        setIsConnected(false);
        isConnectingRef.current = false;
        
        // Only attempt to reconnect if it wasn't a manual disconnect and we haven't exceeded retry attempts
        if (event.code !== 1000 && reconnectCount < reconnectAttempts) {
          console.log(`Attempting to reconnect... (${reconnectCount + 1}/${reconnectAttempts})`);
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectCount(prev => prev + 1);
            connect();
          }, reconnectInterval);
        } else if (reconnectCount >= reconnectAttempts) {
          console.log('Max reconnection attempts reached');
          setError('Connection failed after multiple attempts');
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('WebSocket connection failed');
        isConnectingRef.current = false;
      };

    } catch (err) {
      console.error('Error creating WebSocket:', err);
      setError('Failed to create WebSocket connection');
      isConnectingRef.current = false;
    }
  }, [onProgressUpdate, reconnectAttempts, reconnectInterval, reconnectCount]);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log('Sending WebSocket message:', message);
      wsRef.current.send(JSON.stringify(message));
      return true;
    } else {
      console.log('WebSocket not connected, cannot send message');
      return false;
    }
  }, []);

  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, []);

  return {
    isConnected,
    error,
    sendMessage,
    disconnect,
    reconnect: connect
  };
};
