import { create } from 'zustand';
import axios from 'axios';
import type { ClipboardItem, ChatMsg, RoomSettings } from '../types';
import { copyToClipboard } from '../utils';
import * as api from '../api';

// ---- Types ----
type ToastFn = (message: string, type?: 'success' | 'error' | 'info') => void;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TranslateFn = (key: any) => string;

interface BoardState {
  // Room data
  roomId: string | null;
  items: ClipboardItem[];
  chats: ChatMsg[];
  roomSettings: RoomSettings;
  recentRooms: string[];

  // UI state
  copiedId: string | null;
  isDragging: boolean;
  newNote: string;
  username: string;

  // Modals
  isSettingsOpen: boolean;
  isChatOpen: boolean;
  isQROpen: boolean;
  isCanvasOpen: boolean;
  isPasswordPromptOpen: boolean;
  isAuthModalOpen: boolean;

  // Actions — setters
  setRoomId: (id: string | null) => void;
  setItems: (items: ClipboardItem[]) => void;
  setChats: (chats: ChatMsg[]) => void;
  setRoomSettings: (settings: RoomSettings) => void;
  setRecentRooms: (rooms: string[]) => void;
  setCopiedId: (id: string | null) => void;
  setIsDragging: (dragging: boolean) => void;
  setNewNote: (note: string) => void;
  setUsername: (name: string) => void;
  setIsSettingsOpen: (open: boolean) => void;
  setIsChatOpen: (open: boolean) => void;
  setIsQROpen: (open: boolean) => void;
  setIsCanvasOpen: (open: boolean) => void;
  setIsPasswordPromptOpen: (open: boolean) => void;
  setIsAuthModalOpen: (open: boolean) => void;

  // Actions — business logic
  fetchData: () => Promise<void>;
  addTextNote: (showToast: ToastFn, t: TranslateFn) => Promise<void>;
  handlePasteEvent: (e: ClipboardEvent, showToast: ToastFn, t: TranslateFn) => Promise<void>;
  handleManualPaste: (showToast: ToastFn, t: TranslateFn) => Promise<void>;
  handleVoiceSubmit: (file: File, showToast: ToastFn, t: TranslateFn) => Promise<void>;
  handleCanvasSubmit: (file: File, showToast: ToastFn, t: TranslateFn) => Promise<void>;
  uploadFiles: (files: File[], showToast: ToastFn, t: TranslateFn) => Promise<void>;
  handleDelete: (id: string, showToast: ToastFn, t: TranslateFn) => Promise<void>;
  handleClearAll: (showToast: ToastFn, t: TranslateFn) => Promise<void>;
  handleCopy: (content: string, showToast: ToastFn, t: TranslateFn, id?: string | null) => void;
  handleShare: (item: ClipboardItem, showToast: ToastFn, t: TranslateFn) => Promise<void>;
  handleChatSend: (text: string, showToast: ToastFn, t: TranslateFn) => Promise<void>;
  handleSetUsername: (name: string) => void;
  handleUpdateSettings: (settings: RoomSettings, showToast: ToastFn, t: TranslateFn) => Promise<void>;
  saveRoomToHistory: () => void;
  closeAllModals: () => void;
}

const getDefaultUsername = (): string => {
  const stored = localStorage.getItem('claytablet_username');
  if (stored) return stored;

  const ua = navigator.userAgent;
  let device = 'Device';
  if (/android/i.test(ua)) {
    device = 'Android';
  } else if (/iPad|iPhone|iPod/.test(ua)) {
    device = 'iOS';
  } else if (/macintosh|mac os x/i.test(ua)) {
    device = 'Mac';
  } else if (/windows/i.test(ua)) {
    device = 'Windows';
  } else if (/linux/i.test(ua)) {
    device = 'Linux';
  }

  const rand = Math.floor(1000 + Math.random() * 9000);
  const defaultName = `${device}-${rand}`;
  localStorage.setItem('claytablet_username', defaultName);
  return defaultName;
};

export const useBoardStore = create<BoardState>((set, get) => ({
  // Room data
  roomId: null,
  items: [],
  chats: [],
  roomSettings: { ttl: '24h' },
  recentRooms: [],

  // UI state
  copiedId: null,
  isDragging: false,
  newNote: '',
  username: getDefaultUsername(),

  // Modals
  isSettingsOpen: false,
  isChatOpen: false,
  isQROpen: false,
  isCanvasOpen: false,
  isPasswordPromptOpen: false,
  isAuthModalOpen: false,

  // Setters
  setRoomId: (id) => set({ roomId: id }),
  setItems: (items) => set({ items }),
  setChats: (chats) => set({ chats }),
  setRoomSettings: (settings) => set({ roomSettings: settings }),
  setRecentRooms: (rooms) => set({ recentRooms: rooms }),
  setCopiedId: (id) => set({ copiedId: id }),
  setIsDragging: (dragging) => set({ isDragging: dragging }),
  setNewNote: (note) => set({ newNote: note }),
  setUsername: (name) => set({ username: name }),
  setIsSettingsOpen: (open) => set({ isSettingsOpen: open }),
  setIsChatOpen: (open) => set({ isChatOpen: open }),
  setIsQROpen: (open) => set({ isQROpen: open }),
  setIsCanvasOpen: (open) => set({ isCanvasOpen: open }),
  setIsPasswordPromptOpen: (open) => set({ isPasswordPromptOpen: open }),
  setIsAuthModalOpen: (open) => set({ isAuthModalOpen: open }),

  // Business logic
  fetchData: async () => {
    const { roomId } = get();
    if (!roomId) return;
    try {
      const data = await api.fetchClipboard(roomId);
      set({ items: data.items, chats: data.chats, roomSettings: data.settings });
    } catch (e) {
      console.error(e);
    }
  },

  addTextNote: async (showToast, t) => {
    const { roomId, newNote } = get();
    if (!newNote.trim() || !roomId) return;
    const noteContent = newNote;
    set({ newNote: '' });
    try {
      await api.addText(roomId, noteContent);
      showToast(t('textAdded'), 'success');
    } catch (e) {
      set({ newNote: noteContent });
      if (axios.isAxiosError(e) && e.response?.status === 403) {
        showToast(t('readOnlyError'), 'error');
      } else {
        showToast(t('uploadError'), 'error');
      }
    }
  },

  handlePasteEvent: async (e, showToast, t) => {
    const { roomId } = get();
    if (!roomId) return;
    const target = e.target as HTMLElement;
    const hasImage = e.clipboardData?.files.length && e.clipboardData.files[0].type.startsWith('image/');
    if ((target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') && !hasImage) return;

    if (e.clipboardData?.files.length) {
      const file = e.clipboardData.files[0];
      if (file.type.startsWith('image/')) {
        try {
          await api.addImage(roomId, file);
          showToast(t('imageAdded'), 'success');
        } catch (e) {
          if (axios.isAxiosError(e) && e.response?.status === 403) {
            showToast(t('readOnlyError'), 'error');
          } else {
            showToast(t('uploadError'), 'error');
          }
        }
        return;
      }
    }

    const text = e.clipboardData?.getData('text');
    if (text) {
      try {
        await api.addText(roomId, text);
        showToast(t('textAdded'), 'success');
      } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status === 403) {
          showToast(t('readOnlyError'), 'error');
        } else {
          showToast(t('uploadError'), 'error');
        }
      }
    }
  },

  handleManualPaste: async (showToast, t) => {
    const { roomId } = get();
    if (!roomId) return;
    try {
      if (!navigator.clipboard || !navigator.clipboard.read) {
        if (navigator.clipboard && navigator.clipboard.readText) {
          const text = await navigator.clipboard.readText();
          if (text) {
            await api.addText(roomId, text);
            showToast(t('textAdded'), 'success');
          } else {
            showToast(t('noSupportedDataInClipboard'), 'info');
          }
          return;
        }
        const isHttp = window.location.protocol === 'http:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
        showToast(t(isHttp ? 'clipboardHttpHint' : 'clipboardError'), 'error');
        return;
      }

      const clipboardItems = await navigator.clipboard.read();
      let hasData = false;
      for (const item of clipboardItems) {
        const imageTypes = item.types.filter(type => type.startsWith('image/'));
        if (imageTypes.length > 0) {
          const type = imageTypes[0];
          const blob = await item.getType(type);
          const ext = type.split('/')[1] || 'png';
          const file = new File([blob], `pasted-${Date.now()}.${ext}`, { type });
          await api.addImage(roomId, file);
          showToast(t('imageAdded'), 'success');
          hasData = true;
          break;
        }

        if (item.types.includes('text/plain')) {
          const blob = await item.getType('text/plain');
          const text = await blob.text();
          if (text.trim()) {
            await api.addText(roomId, text);
            showToast(t('textAdded'), 'success');
            hasData = true;
            break;
          }
        }
      }

      if (!hasData) {
        showToast(t('noSupportedDataInClipboard'), 'info');
      }
    } catch (err) {
      console.error('Failed to read clipboard: ', err);
      showToast(t('clipboardError'), 'error');
    }
  },

  handleVoiceSubmit: async (file, showToast, t) => {
    const { roomId } = get();
    if (!roomId) return;
    try {
      await api.addAudio(roomId, file);
      showToast(t('audioAdded'), 'success');
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 403) {
        showToast(t('readOnlyError'), 'error');
      } else {
        showToast(t('uploadError'), 'error');
      }
    }
  },

  handleCanvasSubmit: async (file, showToast, t) => {
    const { roomId } = get();
    if (!roomId) return;
    try {
      await api.addImage(roomId, file);
      showToast(t('imageAdded'), 'success');
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 403) {
        showToast(t('readOnlyError'), 'error');
      } else {
        showToast(t('uploadError'), 'error');
      }
    }
  },

  uploadFiles: async (files, showToast, t) => {
    const { roomId } = get();
    if (!roomId || files.length === 0) return;
    const uploads = files.map(file => {
      if (file.type.startsWith('image/')) return api.addImage(roomId, file);
      if (file.type.startsWith('audio/') || file.type === 'video/webm') return api.addAudio(roomId, file);
      return api.addFile(roomId, file);
    });
    try {
      await Promise.all(uploads);
      showToast(`${t('filesUploaded')} ${uploads.length}`, 'success');
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 403) {
        showToast(t('readOnlyError'), 'error');
      } else {
        showToast(t('uploadError'), 'error');
      }
    }
  },

  handleDelete: async (id, showToast, t) => {
    const { roomId } = get();
    if (!roomId) return;
    try {
      await api.deleteItem(roomId, id);
      showToast(t('deleted'), 'success');
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 403) {
        showToast(t('readOnlyError'), 'error');
      } else {
        showToast(t('deleteError'), 'error');
      }
    }
  },

  handleClearAll: async (showToast, t) => {
    const { roomId } = get();
    if (!roomId) return;
    if (!confirm(t('confirmClear'))) return;
    try {
      await api.clearAll(roomId);
      showToast(t('boardCleared'), 'success');
      set({ isSettingsOpen: false });
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 403) {
        showToast(t('readOnlyError'), 'error');
      } else {
        showToast(t('clearError'), 'error');
      }
    }
  },

  handleCopy: (content, showToast, t, id = null) => {
    copyToClipboard(content);
    if (id) {
      set({ copiedId: id });
      setTimeout(() => set({ copiedId: null }), 2000);
    }
    showToast(t('copied'), 'success');
  },

  handleShare: async (item, showToast, t) => {
    const shareUrl = (item.type === 'image' || item.type === 'audio' || item.type === 'file') ? window.location.origin + item.url! : undefined;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'ClayTablet',
          text: item.type === 'text' ? item.content : undefined,
          url: shareUrl,
        });
      } catch {
        // User cancelled
      }
    } else {
      if (item.type === 'text') {
        get().handleCopy(item.content!, showToast, t, item.id);
      } else if (shareUrl) {
        get().handleCopy(shareUrl, showToast, t, item.id);
        showToast(t('linkCopied'), 'info');
      }
    }
  },

  handleChatSend: async (text, showToast, t) => {
    const { roomId, username } = get();
    if (!roomId || !username.trim()) return;
    try {
      await api.addChat(roomId, username, text);
    } catch {
      showToast(t('chatError'), 'error');
    }
  },

  handleSetUsername: (name) => {
    set({ username: name });
    localStorage.setItem('claytablet_username', name);
  },

  handleUpdateSettings: async (settings, showToast, t) => {
    const { roomId } = get();
    if (!roomId) return;
    try {
      const updated = await api.updateRoomSettings(roomId, settings);
      if (settings.password) {
        sessionStorage.setItem(`room_token_${roomId}`, settings.password);
      } else if (settings.password === "") {
        sessionStorage.removeItem(`room_token_${roomId}`);
      }
      set({ roomSettings: updated });
      showToast(t('settingsUpdated'), 'success');
    } catch {
      showToast(t('settingsUpdateError'), 'error');
    }
  },

  saveRoomToHistory: () => {
    const { roomId } = get();
    if (!roomId) return;
    const historyJson = localStorage.getItem('recentRooms') || '[]';
    let history: string[] = [];
    try { history = JSON.parse(historyJson); } catch { /* ignore */ }
    const newHistory = [roomId, ...history.filter(id => id !== roomId)].slice(0, 8);
    localStorage.setItem('recentRooms', JSON.stringify(newHistory));
    set({ recentRooms: newHistory });
  },

  closeAllModals: () => {
    set({
      isSettingsOpen: false,
      isQROpen: false,
      isCanvasOpen: false,
      isPasswordPromptOpen: false,
      isChatOpen: false,
      isAuthModalOpen: false,
    });
  },
}));
