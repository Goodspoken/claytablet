// ---- Shared types for Clipboard app ----

export interface ClipboardItem {
  id: string;
  type: 'text' | 'image' | 'audio' | 'file';
  content?: string;
  filename?: string;
  url?: string;
  size?: number;
  timestamp: number;
}

export interface ChatMsg {
  id: string;
  author: string;
  text: string;
  timestamp: number;
}

export interface RoomSettings {
  ttl: string;
  password?: string;
  is_protected?: boolean;
  is_readonly?: boolean;
  is_owner?: boolean;
}

export type ToastType = 'success' | 'error' | 'info';
