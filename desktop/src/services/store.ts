import { LazyStore } from '@tauri-apps/plugin-store';

const store = new LazyStore('settings.json');

// ─── Recent rooms (max 8) ─────────────────────────────────────────────────────

export async function getRecentRooms(): Promise<string[]> {
  return (await store.get<string[]>('recentRooms')) ?? [];
}

export async function addRecentRoom(roomId: string): Promise<void> {
  const rooms = await getRecentRooms();
  const updated = [roomId, ...rooms.filter(r => r !== roomId)].slice(0, 8);
  await store.set('recentRooms', updated);
  await store.save();
}

// ─── Current room ─────────────────────────────────────────────────────────────

export async function getCurrentRoom(): Promise<string> {
  return (await store.get<string>('currentRoom')) ?? 'default';
}

export async function setCurrentRoom(roomId: string): Promise<void> {
  await store.set('currentRoom', roomId);
  await store.save();
}

// ─── Auth token ───────────────────────────────────────────────────────────────

export async function getToken(): Promise<string | null> {
  return (await store.get<string>('token')) ?? null;
}

export async function setToken(token: string): Promise<void> {
  await store.set('token', token);
  await store.save();
}

export async function clearToken(): Promise<void> {
  await store.delete('token');
  await store.save();
}

// ─── Generic settings ─────────────────────────────────────────────────────────

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  return (await store.get<T>(key)) ?? fallback;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await store.set(key, value);
  await store.save();
}
