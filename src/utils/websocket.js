import { useState, useEffect, useRef } from 'react';

export function useWebSocket() {
  const [ws, setWs] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef(null);

  useEffect(() => {
    connect();
    
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (ws) {
        ws.close();
      }
    };
  }, []);

  const connect = async () => {
    try {
      console.log('🔌 Starting WebSocket connection process...');
      
      // Get authentication token (optional for development mode)
      const token = localStorage.getItem('auth-token');
      if (!token) {
        console.warn('⚠️ No authentication token found, using anonymous connection');
      } else {
        console.log('✅ Authentication token found');
      }
      
      // Fetch server configuration to get the correct WebSocket URL
      let wsBaseUrl;
      try {
        console.log('🔄 Fetching server configuration...');
        const configResponse = await fetch('/api/config');
        
        if (!configResponse.ok) {
          throw new Error(`Config request failed: ${configResponse.status} ${configResponse.statusText}`);
        }
        
        const config = await configResponse.json();
        console.log('📋 Server config received:', config);
        wsBaseUrl = config.wsUrl;
        
        // If the config returns localhost but we're not on localhost, use current host but with API server port
        if (wsBaseUrl.includes('localhost') && !window.location.hostname.includes('localhost')) {
          console.warn('Config returned localhost, using current host with API server port instead');
          const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          // For development, API server is typically on port 3001 when Vite is on 5173
          const apiPort = window.location.port === '5173' ? '3001' : window.location.port;
          wsBaseUrl = `${protocol}//${window.location.hostname}:${apiPort}`;
        }
      } catch (error) {
        console.warn('Could not fetch server config, falling back to current host with API server port');
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // For development, API server is typically on port 3001 when Vite is on 5173
        const apiPort = window.location.port === '5173' ? '3001' : window.location.port;
        wsBaseUrl = `${protocol}//${window.location.hostname}:${apiPort}`;
      }
      
      // Include token in WebSocket URL as query parameter (if available)
      const wsUrl = token 
        ? `${wsBaseUrl}/ws?token=${encodeURIComponent(token)}`
        : `${wsBaseUrl}/ws`;
      console.log('🔌 Attempting WebSocket connection to:', wsUrl);
      const websocket = new WebSocket(wsUrl);

      websocket.onopen = () => {
        console.log('✅ WebSocket connected successfully');
        setIsConnected(true);
        setWs(websocket);
      };

      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setMessages(prev => [...prev, data]);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      websocket.onclose = (event) => {
        console.log(`❌ WebSocket disconnected (code: ${event.code}, reason: ${event.reason})`);
        setIsConnected(false);
        setWs(null);
        
        // Attempt to reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('🔄 Attempting to reconnect WebSocket...');
          connect();
        }, 3000);
      };

      websocket.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
      };

    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
    }
  };

  const sendMessage = (message) => {
    if (ws && isConnected) {
      console.log('📤 Sending WebSocket message:', message.type || 'unknown');
      ws.send(JSON.stringify(message));
    } else {
      console.warn('❌ WebSocket not connected:', {
        hasWs: !!ws,
        isConnected: isConnected,
        wsState: ws ? ws.readyState : 'null'
      });
    }
  };

  return {
    ws,
    sendMessage,
    messages,
    isConnected
  };
}