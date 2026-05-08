import { useEffect, useState, useCallback, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { writeText, readText } from '@tauri-apps/plugin-clipboard-manager';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { readFile } from '@tauri-apps/plugin-fs';
import { sendNotification } from '@tauri-apps/plugin-notification';
import { Settings, RefreshCw, ChevronDown, Clock, Plus, Send, Clipboard, Paperclip } from 'lucide-react';

import { useRoom } from '../hooks/useRoom';
import { useWebSocket } from '../hooks/useWebSocket';
import { useI18n } from '../hooks/useI18n';
import { useTheme } from '../hooks/useTheme';
import { addText, addImage, addAudio, addFile, deleteItem, getBaseUrl } from '../services/api';
import { TextCard } from '../components/TextCard';
import { ImageCard } from '../components/ImageCard';
import { AudioCard } from '../components/AudioCard';
import { FileCard } from '../components/FileCard';
import { ConnectionStatus } from '../components/ConnectionStatus';
import SettingsPage from './Settings';
import type { ClipboardItem } from '../types';

function getMimeFromExt(ext: string): string {
  const img = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
  const audio = ['mp3', 'ogg', 'wav', 'webm', 'opus', 'm4a'];
  if (img.includes(ext)) return `image/${ext === 'jpg' ? 'jpeg' : ext}`;
  if (audio.includes(ext)) return `audio/${ext}`;
  return 'application/octet-stream';
}

export default function Board() {
  const { roomId, items, recentRooms, loading, fetchData, changeRoom } = useRoom();
  const { isConnected } = useWebSocket({ roomId, onSync: fetchData });
  const { t } = useI18n();
  useTheme(); // ensure theme is applied/synced on this page
  const [baseUrl, setBaseUrl] = useState('https://claytablet.online');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showRoomMenu, setShowRoomMenu] = useState(false);
  const [roomInput, setRoomInput] = useState('');
  const [lastItemCount, setLastItemCount] = useState(0);
  const [noteText, setNoteText] = useState('');
  const [sendingNote, setSendingNote] = useState(false);
  const [attachLoading, setAttachLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Load base URL
  useEffect(() => {
    getBaseUrl().then(setBaseUrl);
  }, []);

  // Close room menu when clicking outside
  useEffect(() => {
    if (!showRoomMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowRoomMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showRoomMenu]);

  // Track item count for notifications
  useEffect(() => {
    if (items.length > lastItemCount && lastItemCount > 0) {
      const newest = items[0];
      const preview = newest.type === 'text'
        ? (newest.content ?? '').slice(0, 80)
        : `Новый ${newest.type === 'image' ? 'файл изображения' : newest.type}`;
      void sendNotification({ title: `ClayTablet — ${roomId}`, body: preview });
    }
    setLastItemCount(items.length);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  // Tray: copy room link
  useEffect(() => {
    const unlisten = listen('tray:copy-link', () => {
      writeText(`${baseUrl}/${roomId}`).catch(() => {});
    });
    return () => { unlisten.then(fn => fn()); };
  }, [baseUrl, roomId]);

  // Shortcut: Ctrl+Shift+V → Quick Paste window
  useEffect(() => {
    const unlisten = listen('shortcut:quick-paste', () => {
      invoke('open_quick_paste').catch(console.error);
    });
    return () => { unlisten.then(fn => fn()); };
  }, []);

  // Shortcut: Ctrl+Shift+C → send clipboard text to room
  useEffect(() => {
    const unlisten = listen('shortcut:send-clipboard', async () => {
      try {
        const txt = await readText();
        if (txt?.trim()) {
          await addText(roomId, txt.trim());
          fetchData();
        }
      } catch (err) {
        console.error('send-clipboard error:', err);
      }
    });
    return () => { unlisten.then(fn => fn()); };
  }, [roomId, fetchData]);

  const handleCopy = useCallback(async (content: string, id: string) => {
    await writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const handleShare = useCallback((_item: ClipboardItem) => {
    writeText(`${baseUrl}/${roomId}`).catch(() => {});
  }, [baseUrl, roomId]);

  const handleDelete = useCallback(async (id: string) => {
    await deleteItem(roomId, id);
    fetchData();
  }, [roomId, fetchData]);

  const handleRoomSwitch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (roomInput.trim()) {
      await changeRoom(roomInput.trim());
      setRoomInput('');
      setShowRoomMenu(false);
    }
  };

  const handleSendNote = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = noteText.trim();
    if (!trimmed || sendingNote) return;
    setSendingNote(true);
    try {
      await addText(roomId, trimmed);
      setNoteText('');
      fetchData();
    } catch (err) {
      console.error('addText error:', err);
    } finally {
      setSendingNote(false);
    }
  };

  const handlePasteClipboard = async () => {
    try {
      const txt = await readText();
      if (txt?.trim()) {
        await addText(roomId, txt.trim());
        fetchData();
      }
    } catch (err) {
      console.error('paste error:', err);
    }
  };

  const handleAttach = async () => {
    const selected = await openDialog({
      multiple: true,
      filters: [
        { name: 'Изображения', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] },
        { name: 'Аудио', extensions: ['mp3', 'ogg', 'wav', 'webm', 'opus', 'm4a'] },
        { name: 'Все файлы', extensions: ['*'] },
      ],
    });
    if (!selected) return;
    const paths = Array.isArray(selected) ? selected : [selected];
    setAttachLoading(true);
    try {
      for (const path of paths) {
        const ext = path.split('.').pop()?.toLowerCase() ?? 'bin';
        const mime = getMimeFromExt(ext);
        const data = await readFile(path);
        const blob = new Blob([data], { type: mime });
        const filename = path.split('/').pop() ?? path.split('\\').pop() ?? 'file';
        const file = new File([blob], filename, { type: mime });
        if (mime.startsWith('image/')) await addImage(roomId, file);
        else if (mime.startsWith('audio/')) await addAudio(roomId, file);
        else await addFile(roomId, file);
      }
      fetchData();
    } catch (err) {
      console.error('attach error:', err);
    } finally {
      setAttachLoading(false);
    }
  };

  if (showSettings) {
    return <SettingsPage onClose={() => setShowSettings(false)} />;
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-900 font-sans">
      {/* Header */}
      <header className="flex-shrink-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        {/* Row 1: Logo + Room ID + Actions */}
        <div className="px-4 py-2.5 flex items-center gap-2">
          {/* Logo + room pill */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-indigo-200 dark:shadow-indigo-900/20 rotate-3">
              <span className="text-white text-sm font-bold">C</span>
            </div>
            <h1 className="text-base font-black tracking-tight text-slate-800 dark:text-white hidden sm:block">
              Clay<span className="text-indigo-600 dark:text-indigo-400">Tablet</span>
            </h1>
            <span className="text-slate-300 dark:text-slate-600 hidden sm:block">/</span>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-700 rounded-full border border-slate-200 dark:border-slate-600 text-sm font-mono text-slate-700 dark:text-slate-300 min-w-0">
              <span className="text-slate-400 dark:text-slate-500 select-none text-xs hidden sm:inline">ID:</span>
              <span className="truncate max-w-[100px]">{roomId || '...'}</span>
            </div>
            <ConnectionStatus isConnected={isConnected} />
          </div>

          {/* Room menu button */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowRoomMenu(v => !v)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-sm font-medium transition-colors ${showRoomMenu ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700 text-amber-600 dark:text-amber-400' : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-amber-300 hover:text-amber-600 dark:hover:text-amber-400'}`}
            >
              <span className="hidden sm:inline">{t('room')}</span>
              <ChevronDown size={13} className={`opacity-60 transition-transform ${showRoomMenu ? 'rotate-180' : ''}`} />
            </button>

            {showRoomMenu && (
              <div className="absolute top-10 right-0 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-2xl overflow-hidden z-50 py-2 animate-in slide-in-from-top-2 duration-150">
                {/* Room input */}
                <div className="px-3 pb-2 pt-1">
                  <form onSubmit={handleRoomSwitch} className="flex gap-1.5">
                    <input
                      autoFocus
                      value={roomInput}
                      onChange={e => setRoomInput(e.target.value)}
                      placeholder="Введите room ID..."
                      className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-indigo-400/50"
                    />
                    <button type="submit" className="px-2.5 py-1.5 bg-indigo-500 text-white rounded-lg text-sm hover:bg-indigo-600 transition-colors">
                      <Plus size={14} />
                    </button>
                  </form>
                </div>

                {/* Recent rooms */}
                {recentRooms.length > 0 && (
                  <>
                    <div className="px-4 pb-1 text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock size={11} /> {t('historyTitle')}
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {recentRooms.map(r => (
                        <button
                          key={r}
                          onClick={() => { changeRoom(r); setShowRoomMenu(false); }}
                          className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between group transition-colors ${
                            r === roomId
                              ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-medium'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600'
                          }`}
                        >
                          <span className="truncate pr-2">{r}</span>
                          {r === roomId && <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/50 px-1.5 py-0.5 rounded shrink-0">{t('current')}</span>}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Refresh */}
          <button
            onClick={fetchData}
            title="Обновить"
            className={`p-2 rounded-xl text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${loading ? 'animate-spin' : ''}`}
          >
            <RefreshCw size={16} />
          </button>

          {/* Settings gear */}
          <button
            onClick={() => setShowSettings(true)}
            title="Настройки"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <Settings size={16} />
          </button>
        </div>

        {/* Row 2: Input bar (like browser) */}
        <div className="px-4 pb-2.5">
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl border border-slate-200 dark:border-slate-600 p-1.5">
            <form onSubmit={handleSendNote} className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePasteClipboard}
                disabled={!roomId}
                title={t('pasteFromClipboard')}
                className="p-2 text-slate-400 hover:text-indigo-500 transition-colors rounded-xl hover:bg-white dark:hover:bg-slate-700 disabled:opacity-40"
              >
                <Clipboard size={18} strokeWidth={2} />
              </button>

              <button
                type="button"
                onClick={handleAttach}
                disabled={!roomId || attachLoading}
                title={t('attachFile')}
                className="p-2 text-slate-400 hover:text-blue-500 transition-colors rounded-xl hover:bg-white dark:hover:bg-slate-700 disabled:opacity-40"
              >
                <Paperclip size={18} strokeWidth={2} />
              </button>

              <input
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) handleSendNote(e as unknown as React.FormEvent); }}
                placeholder={t('writeNote')}
                disabled={!roomId || sendingNote}
                className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-300 transition disabled:opacity-50"
              />

              <button
                type="submit"
                disabled={!noteText.trim() || !roomId || sendingNote}
                title={t('sendText')}
                className="p-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white shadow-sm transition-colors disabled:opacity-40"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Card grid */}
      <main className="flex-1 overflow-y-auto p-4">
        {loading && items.length === 0 && (
          <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
            Загрузка...
          </div>
        )}
        {!loading && items.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-slate-400">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-2xl">
              📋
            </div>
            <p className="text-sm">{t('nothingFound')}</p>
          </div>
        )}
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
          {items.map(item => {
            if (item.type === 'text') {
              return (
                <TextCard
                  key={item.id}
                  item={item}
                  copiedId={copiedId}
                  onCopy={handleCopy}
                  onShare={handleShare}
                  onDelete={handleDelete}
                />
              );
            }
            if (item.type === 'image') {
              return (
                <ImageCard
                  key={item.id}
                  item={item}
                  baseUrl={baseUrl}
                  onDelete={handleDelete}
                />
              );
            }
            if (item.type === 'audio') {
              return (
                <AudioCard
                  key={item.id}
                  item={item}
                  baseUrl={baseUrl}
                  onDelete={handleDelete}
                />
              );
            }
            if (item.type === 'file') {
              return (
                <FileCard
                  key={item.id}
                  item={item}
                  baseUrl={baseUrl}
                  onDelete={handleDelete}
                />
              );
            }
            return null;
          })}
        </div>
      </main>
    </div>
  );
}
