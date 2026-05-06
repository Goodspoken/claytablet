import { useState, useEffect, useRef, useCallback } from 'react';
import { getBaseUrl } from '../api';

interface UseWebSocketOptions {
  roomId: string | undefined;
  onSync: () => void;
}

export function useWebSocket({ roomId, onSync }: UseWebSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const reconnectDelayRef = useRef(1000);

  // Store onSync in a ref so it doesn't trigger reconnects when the callback changes
  const onSyncRef = useRef(onSync);
  onSyncRef.current = onSync;

  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const debouncedSync = useCallback(() => {
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => {
      onSyncRef.current();
    }, 300);
  }, []);

  const connect = useCallback(function doConnect() {
    if (!roomId) return;

    const token = sessionStorage.getItem(`room_token_${roomId}`);
    const tokenQuery = token ? `?password=${encodeURIComponent(token)}` : '';

    // Build WS URL: use custom server if set, otherwise current origin
    const base = getBaseUrl();
    let wsUrl: string;
    if (base) {
      // Custom server: replace http/https with ws/wss
      const wsBase = base.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:');
      wsUrl = `${wsBase}/api/ws/rooms/${roomId}${tokenQuery}`;
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${protocol}//${window.location.host}/api/ws/rooms/${roomId}${tokenQuery}`;
    }

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setIsConnected(true);
      reconnectDelayRef.current = 1000; // Reset backoff on success
      
      // Start ping heartbeat
      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send('ping');
        }
      }, 30000);
    };

    ws.onmessage = (event) => {
      if (event.data === 'sync') {
        debouncedSync();
      } else if (event.data === 'pong') {
        // server responded to ping
      }
    };

    ws.onerror = () => {
      // onclose will handle reconnect
    };

    ws.onclose = (event) => {
      setIsConnected(false);
      wsRef.current = null;
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);

      // 1008 = auth rejected (personal room or password wrong) — don't reconnect
      if (event.code === 1008) return;

      // Exponential backoff reconnect: 1s → 2s → 4s → 8s → max 30s
      const delay = reconnectDelayRef.current;
      reconnectTimerRef.current = setTimeout(() => {
        reconnectDelayRef.current = Math.min(delay * 2, 30000);
        doConnect();
      }, delay);
    };

    wsRef.current = ws;
  }, [roomId, debouncedSync]); // debouncedSync is stable (useCallback with no deps)

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimerRef.current);
      clearTimeout(syncTimeoutRef.current);
      clearInterval(pingIntervalRef.current);
      if (wsRef.current) {
        // Prevent reconnect on intentional cleanup
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  return { isConnected };
}
