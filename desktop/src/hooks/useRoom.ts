import { useState, useEffect, useCallback } from 'react';
import { fetchClipboard } from '../services/api';
import { getCurrentRoom, setCurrentRoom, addRecentRoom, getRecentRooms } from '../services/store';
import type { ClipboardItem, RoomSettings } from '../types';

export interface RoomState {
  roomId: string;
  items: ClipboardItem[];
  settings: RoomSettings;
  recentRooms: string[];
  loading: boolean;
  fetchData: () => Promise<void>;
  changeRoom: (id: string) => Promise<void>;
}

export function useRoom(): RoomState {
  const [roomId, setRoomId] = useState<string>('');
  const [items, setItems] = useState<ClipboardItem[]>([]);
  const [settings, setSettings] = useState<RoomSettings>({ ttl: '24h' });
  const [recentRooms, setRecentRooms] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Load current room and history from store on mount
  useEffect(() => {
    Promise.all([getCurrentRoom(), getRecentRooms()]).then(([room, history]) => {
      setRoomId(room);
      setRecentRooms(history);
    });
  }, []);

  const fetchData = useCallback(async () => {
    if (!roomId) return;
    setLoading(true);
    try {
      const data = await fetchClipboard(roomId);
      setItems(data.items);
      setSettings(data.settings);
    } catch (err) {
      console.error('[useRoom] fetchData error:', err);
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  // Fetch whenever roomId changes
  useEffect(() => {
    if (roomId) fetchData();
  }, [roomId, fetchData]);

  const changeRoom = useCallback(async (id: string) => {
    const clean = id.trim();
    if (!clean || clean === roomId) return;
    await setCurrentRoom(clean);
    await addRecentRoom(clean);
    const history = await getRecentRooms();
    setRecentRooms(history);
    setItems([]);
    setRoomId(clean);
  }, [roomId]);

  return { roomId, items, settings, recentRooms, loading, fetchData, changeRoom };
}
