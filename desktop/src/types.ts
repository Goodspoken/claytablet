// ---- Shared types for ClayTablet desktop app ----

export interface ClipboardItem {
  id: string;
  type: 'text' | 'image' | 'audio' | 'file';
  content?: string;
  filename?: string;
  url?: string;
  size?: number;
  created_at: string;
}

export interface RoomSettings {
  ttl: string;
  password?: string;
  is_protected?: boolean;
  is_readonly?: boolean;
  is_owner?: boolean;
}

export type ToastType = 'success' | 'error' | 'info';
