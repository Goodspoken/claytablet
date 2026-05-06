import { LazyStore } from '@tauri-apps/plugin-store';
import type { ClipboardItem, RoomSettings } from '../types';

// Single store instance for the whole app
const store = new LazyStore('settings.json');

// ─── Server URL ──────────────────────────────────────────────────────────────

export async function getBaseUrl(): Promise<string> {
  const url = await store.get<string>('serverUrl');
  return url ?? 'https://claytablet.online';
}

export async function setBaseUrl(url: string): Promise<void> {
  await store.set('serverUrl', url.replace(/\/$/, ''));
  await store.save();
}

export { store as _store };

// ─── Room password (used as X-Room-Password header) ──────────────────────────

export async function getRoomPassword(roomId: string): Promise<string | null> {
  return (await store.get<string>(`room_token_${roomId}`)) ?? null;
}

export async function setRoomPassword(roomId: string, password: string): Promise<void> {
  await store.set(`room_token_${roomId}`, password);
  await store.save();
}

// ─── Auth headers builder ────────────────────────────────────────────────────

async function authHeaders(roomId: string): Promise<Record<string, string>> {
  const password = await getRoomPassword(roomId);
  const token = await store.get<string>('token');
  const headers: Record<string, string> = {};
  if (password) headers['X-Room-Password'] = password;
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

// ─── API response shapes ──────────────────────────────────────────────────────

interface ClipboardResponse {
  texts: Omit<ClipboardItem, 'type'>[];
  images: Omit<ClipboardItem, 'type'>[];
  audios: Omit<ClipboardItem, 'type'>[];
  files: Omit<ClipboardItem, 'type'>[];
  settings: RoomSettings;
  layout_order: string[];
}

// ─── API functions ────────────────────────────────────────────────────────────

export async function fetchClipboard(roomId: string): Promise<{
  items: ClipboardItem[];
  settings: RoomSettings;
  layoutOrder: string[];
}> {
  const base = await getBaseUrl();
  const headers = await authHeaders(roomId);
  const res = await fetch(`${base}/api/claytablet/${roomId}`, { headers });
  if (!res.ok) throw new Error(`fetchClipboard: ${res.status}`);
  const data: ClipboardResponse = await res.json();

  const texts: ClipboardItem[] = (data.texts || []).map(t => ({ ...t, type: 'text' as const }));
  const images: ClipboardItem[] = (data.images || []).map(i => ({ ...i, type: 'image' as const }));
  const audios: ClipboardItem[] = (data.audios || []).map(a => ({ ...a, type: 'audio' as const }));
  const files: ClipboardItem[] = (data.files || []).map(f => ({ ...f, type: 'file' as const }));
  const items = [...texts, ...images, ...audios, ...files].sort((a, b) => b.timestamp - a.timestamp);

  return {
    items,
    settings: data.settings ?? { ttl: '24h' },
    layoutOrder: data.layout_order ?? [],
  };
}

export async function addText(roomId: string, content: string): Promise<void> {
  const base = await getBaseUrl();
  const headers = { ...(await authHeaders(roomId)), 'Content-Type': 'application/json' };
  const res = await fetch(`${base}/api/claytablet/${roomId}/text`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error(`addText: ${res.status}`);
}

export async function addImage(roomId: string, file: File): Promise<void> {
  const base = await getBaseUrl();
  const headers = await authHeaders(roomId);
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${base}/api/claytablet/${roomId}/image`, {
    method: 'POST',
    headers,
    body: form,
  });
  if (!res.ok) throw new Error(`addImage: ${res.status}`);
}

export async function addAudio(roomId: string, file: File): Promise<void> {
  const base = await getBaseUrl();
  const headers = await authHeaders(roomId);
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${base}/api/claytablet/${roomId}/audio`, {
    method: 'POST',
    headers,
    body: form,
  });
  if (!res.ok) throw new Error(`addAudio: ${res.status}`);
}

export async function addFile(roomId: string, file: File): Promise<void> {
  const base = await getBaseUrl();
  const headers = await authHeaders(roomId);
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${base}/api/claytablet/${roomId}/file`, {
    method: 'POST',
    headers,
    body: form,
  });
  if (!res.ok) throw new Error(`addFile: ${res.status}`);
}

export async function deleteItem(roomId: string, itemId: string): Promise<void> {
  const base = await getBaseUrl();
  const headers = await authHeaders(roomId);
  const res = await fetch(`${base}/api/claytablet/${roomId}/${itemId}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) throw new Error(`deleteItem: ${res.status}`);
}

export async function clearAll(roomId: string): Promise<void> {
  const base = await getBaseUrl();
  const headers = await authHeaders(roomId);
  const res = await fetch(`${base}/api/claytablet/${roomId}/all`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) throw new Error(`clearAll: ${res.status}`);
}

export async function getRoomSettings(roomId: string): Promise<RoomSettings> {
  const base = await getBaseUrl();
  const headers = await authHeaders(roomId);
  const res = await fetch(`${base}/api/claytablet/${roomId}/settings`, { headers });
  if (!res.ok) throw new Error(`getRoomSettings: ${res.status}`);
  return res.json();
}

export async function verifyPassword(roomId: string, password: string): Promise<boolean> {
  const base = await getBaseUrl();
  const res = await fetch(`${base}/api/claytablet/${roomId}/verify-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (res.ok) {
    await setRoomPassword(roomId, password);
    return true;
  }
  if (res.status === 401) return false;
  throw new Error(`verifyPassword: ${res.status}`);
}
