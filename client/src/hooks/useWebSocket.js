import { useCallback, useEffect, useRef, useState } from 'react';
import { API_BASE } from '../utils/constants';

function getWsBase() {
  return API_BASE.replace(/^http/, 'ws');
}

export function useWebSocket({ sessionId, onMessage }) {
  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const shouldReconnectRef = useRef(true);
  const messageQueueRef = useRef([]);
  const onMessageRef = useRef(onMessage);
  const connectionTokenRef = useRef(0);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const connect = useCallback(() => {
    if (!sessionId) return;

    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
    }

    const token = connectionTokenRef.current + 1;
    connectionTokenRef.current = token;

    const wsUrl = `${getWsBase()}/ws?session=${encodeURIComponent(sessionId)}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      if (token !== connectionTokenRef.current) {
        ws.close();
        return;
      }
      setIsConnected(true);
      if (messageQueueRef.current.length > 0) {
        for (const queued of messageQueueRef.current) {
          ws.send(queued);
        }
        messageQueueRef.current = [];
      }
    };

    ws.onmessage = (event) => {
      if (token !== connectionTokenRef.current) return;
      try {
        const payload = JSON.parse(event.data);
        onMessageRef.current?.(payload);
      } catch {
        // ignore malformed events
      }
    };

    ws.onerror = () => {
      if (token !== connectionTokenRef.current) return;
      setIsConnected(false);
    };

    ws.onclose = () => {
      if (token !== connectionTokenRef.current) return;
      setIsConnected(false);
      if (shouldReconnectRef.current) {
        reconnectTimerRef.current = setTimeout(connect, 1500);
      }
    };
  }, [sessionId]);

  useEffect(() => {
    // Session switch = clean transport slate.
    messageQueueRef.current = [];
    setIsConnected(false);
    shouldReconnectRef.current = true;
    connect();
    return () => {
      shouldReconnectRef.current = false;
      connectionTokenRef.current += 1;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
      wsRef.current = null;
    };
  }, [connect]);

  const send = useCallback((payload) => {
    const msg = JSON.stringify(payload);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(msg);
      return;
    }
    messageQueueRef.current.push(msg);
  }, []);

  return {
    isConnected,
    send,
  };
}
