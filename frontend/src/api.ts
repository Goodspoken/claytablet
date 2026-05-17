import axios, { AxiosError } from 'axios';
import type { ClipboardItem, ChatMsg, RoomSettings, PluginInfo } from './types';

// ---- Multi-backend: custom server URL support ----
const CUSTOM_SERVER_KEY = 'dubtab_custom_server';

export function getBaseUrl(): string {
  return localStorage.getItem(CUSTOM_SERVER_KEY) || '';
}

export function setCustomServer(url: string) {
  const clean = url.replace(/\/$/, ''); // remove trailing slash
  localStorage.setItem(CUSTOM_SERVER_KEY, clean);
}

export function clearCustomServer() {
  localStorage.removeItem(CUSTOM_SERVER_KEY);
}

export function isUsingCustomServer(): boolean {
  const val = localStorage.getItem(CUSTOM_SERVER_KEY);
  return !!val && val !== '';
}

// ---- Auth headers ----
const getAuthHeaders = (roomId: string) => {
  const token = sessionStorage.getItem(`room_token_${roomId}`);
  return token ? { 'X-Room-Password': token } : {};
};

// Interceptor fires events only for room endpoints (not /api/auth/*)
axios.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const url = error.config?.url || '';
    if (url.includes('/api/dubtab/') || url.includes('/api/ws/')) {
      if (error.response?.status === 401) {
        window.dispatchEvent(new CustomEvent('password:required'));
      } else if (error.response?.status === 403) {
        window.dispatchEvent(new CustomEvent('auth:required'));
      }
    }
    return Promise.reject(error);
  }
);

// ---- API response types ----
interface ClipboardResponse {
  texts: (Omit<ClipboardItem, 'type'>)[];
  images: (Omit<ClipboardItem, 'type'>)[];
  audios: (Omit<ClipboardItem, 'type'>)[];
  files: (Omit<ClipboardItem, 'type'>)[];
  chats: ChatMsg[];
  settings: RoomSettings;
  layout_order: string[];
}

// ---- API client ----

export async function fetchClipboard(roomId: string): Promise<{
  items: ClipboardItem[];
  chats: ChatMsg[];
  settings: RoomSettings;
  layoutOrder: string[];
}> {
  const res = await axios.get<ClipboardResponse>(`${getBaseUrl()}/api/dubtab/${roomId}`, { headers: getAuthHeaders(roomId) });
  const texts: ClipboardItem[] = res.data.texts.map(t => ({ ...t, type: 'text' as const }));
  const images: ClipboardItem[] = res.data.images.map(i => ({ ...i, type: 'image' as const }));
  const audios: ClipboardItem[] = res.data.audios.map(a => ({ ...a, type: 'audio' as const }));
  const files: ClipboardItem[] = (res.data.files || []).map(f => ({ ...f, type: 'file' as const }));
  const items = [...texts, ...images, ...audios, ...files].sort((a, b) => b.timestamp - a.timestamp);
  return {
    items,
    chats: res.data.chats || [],
    settings: res.data.settings || { ttl: '24h' },
    layoutOrder: res.data.layout_order || [],
  };
}

export async function addText(roomId: string, content: string) {
  return axios.post(`${getBaseUrl()}/api/dubtab/${roomId}/text`, { content }, { headers: getAuthHeaders(roomId) });
}

export async function addImage(roomId: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return axios.post(`${getBaseUrl()}/api/dubtab/${roomId}/image`, formData, { headers: getAuthHeaders(roomId) });
}

export async function addAudio(roomId: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return axios.post(`${getBaseUrl()}/api/dubtab/${roomId}/audio`, formData, { headers: getAuthHeaders(roomId) });
}

export async function addFile(roomId: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return axios.post(`${getBaseUrl()}/api/dubtab/${roomId}/file`, formData, { headers: getAuthHeaders(roomId) });
}

export async function addChat(roomId: string, author: string, text: string) {
  return axios.post(`${getBaseUrl()}/api/dubtab/${roomId}/chat`, { author, text }, { headers: getAuthHeaders(roomId) });
}

export async function deleteItem(roomId: string, itemId: string) {
  return axios.delete(`${getBaseUrl()}/api/dubtab/${roomId}/${itemId}`, { headers: getAuthHeaders(roomId) });
}

export async function clearAll(roomId: string) {
  return axios.delete(`${getBaseUrl()}/api/dubtab/${roomId}/all`, { headers: getAuthHeaders(roomId) });
}

export async function getRoomSettings(roomId: string): Promise<RoomSettings> {
  const res = await axios.get<RoomSettings>(`${getBaseUrl()}/api/dubtab/${roomId}/settings`, { headers: getAuthHeaders(roomId) });
  return res.data;
}

export async function updateRoomSettings(roomId: string, settings: RoomSettings): Promise<RoomSettings> {
  const res = await axios.post<RoomSettings>(`${getBaseUrl()}/api/dubtab/${roomId}/settings`, settings, { headers: getAuthHeaders(roomId) });
  return res.data;
}

export async function updateOrder(roomId: string, order: string[]) {
  return axios.post(`${getBaseUrl()}/api/dubtab/${roomId}/order`, { order }, { headers: getAuthHeaders(roomId) });
}

export async function verifyPassword(roomId: string, password: string): Promise<boolean> {
  try {
    await axios.post(`${getBaseUrl()}/api/dubtab/${roomId}/verify-password`, { password });
    sessionStorage.setItem(`room_token_${roomId}`, password);
    return true;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) return false;
      // 403 = personal room, re-throw so Board can handle it
    }
    throw error;
  }
}

// ---- Auth ----
export async function getMe() {
  const res = await axios.get(`${getBaseUrl()}/api/auth/me`);
  return res.data;
}

export async function getMyRooms() {
  const res = await axios.get(`${getBaseUrl()}/api/auth/me/rooms`);
  return res.data;
}

export async function getPublicRooms() {
  const res = await axios.get(`${getBaseUrl()}/api/dubtab/rooms/public`);
  return res.data;
}

export async function getSystemRooms() {
  const res = await axios.get(`${getBaseUrl()}/api/dubtab/rooms/system`);
  return res.data;
}

export async function logout() {
  await axios.post(`${getBaseUrl()}/api/auth/logout`);
}

export async function getCliToken(): Promise<string | null> {
  try {
    const res = await axios.get(`${getBaseUrl()}/api/auth/token`);
    return res.data.token ?? null;
  } catch {
    return null;
  }
}

// ---- Plugin API ----

export async function getPlugins(): Promise<PluginInfo[]> {
  const res = await axios.get(`${getBaseUrl()}/api/plugins`);
  return res.data;
}

export async function getPluginConfig(pluginId: string): Promise<unknown> {
  const res = await axios.get(`${getBaseUrl()}/api/plugins/${pluginId}/config`);
  return res.data;
}

export async function setPluginConfig(pluginId: string, config: unknown): Promise<void> {
  await axios.post(`${getBaseUrl()}/api/plugins/${pluginId}/config`, config);
}
