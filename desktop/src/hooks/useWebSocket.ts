import { useState, useEffect, useRef, useCallback } from 'react';
import { emit } from '@tauri-apps/api/event';
import { getBaseUrl } from '../services/api';

interface UseWebSocketOptions {
  roomId: string | undefined;
  onSync: () => void;
}

export function useWebSocket({ roomId, onSync }: UseWebSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const reconnectDelayRef = useRef(1000);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Keep onSync stable across re-renders
  const onSyncRef = useRef(onSync);
  onSyncRef.current = onSync;

  const debouncedSync = useCallback(() => {
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => {
      onSyncRef.current();
      // Notify Rust side — triggers tray notification for new content
      emit('ws:sync', { roomId }).catch(() => {});
    }, 300);
  }, [roomId]);

  const connect = useCallback(async function doConnect() {
    if (!roomId) return;

    const base = await getBaseUrl();
    let wsUrl: string;
    if (base) {
      const wsBase = base.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:');
      wsUrl = `${wsBase}/api/ws/rooms/${roomId}`;
    } else {
      wsUrl = `wss://claytablet.online/api/ws/rooms/${roomId}`;
    }

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setIsConnected(true);
      reconnectDelayRef.current = 1000; // reset backoff

      // Heartbeat ping every 30s
      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send('ping');
      }, 30_000);
    };

    ws.onmessage = (event) => {
      if (event.data === 'sync') {
        debouncedSync();
      }
      // 'pong' from server — no action needed
    };

    ws.onclose = (event) => {
      setIsConnected(false);
      wsRef.current = null;
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);

      // 1008 = auth rejected — don't reconnect
      if (event.code === 1008) return;

      // Exponential backoff: 1s → 2s → 4s → … → max 30s
      const delay = reconnectDelayRef.current;
      reconnectTimerRef.current = setTimeout(() => {
        reconnectDelayRef.current = Math.min(delay * 2, 30_000);
        doConnect();
      }, delay);
    };

    wsRef.current = ws;
  }, [roomId, debouncedSync]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimerRef.current);
      clearTimeout(syncTimeoutRef.current);
      clearInterval(pingIntervalRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null; // prevent reconnect on unmount
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  return { isConnected };
}
