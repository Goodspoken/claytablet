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
  is_public?: boolean;
  is_system?: boolean;
  is_owner?: boolean;
}

export interface PublicRoom {
  id: string;
  is_protected: boolean;
  last_activity: number;
}

export interface SystemRoom {
  id: string;
  emoji: string;
  title_ru: string;
  title_en: string;
  description_ru: string;
  description_en: string;
}

export type ToastType = 'success' | 'error' | 'info';
