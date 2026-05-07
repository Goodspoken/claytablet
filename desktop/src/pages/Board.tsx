import { useEffect, useState, useCallback } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { writeText, readText } from '@tauri-apps/plugin-clipboard-manager';
import { sendNotification } from '@tauri-apps/plugin-notification';
import { Settings2, RefreshCw, Plus } from 'lucide-react';

import { useRoom } from '../hooks/useRoom';
import { useWebSocket } from '../hooks/useWebSocket';
import { useI18n } from '../hooks/useI18n';
import { addText, getBaseUrl } from '../services/api';
import { TextCard } from '../components/TextCard';
import { ImageCard } from '../components/ImageCard';
import { AudioCard } from '../components/AudioCard';
import { FileCard } from '../components/FileCard';
import { BottomBar } from '../components/BottomBar';
import { ConnectionStatus } from '../components/ConnectionStatus';
import Settings from './Settings';
import type { ClipboardItem } from '../types';

export default function Board() {
  const { roomId, items, recentRooms, loading, fetchData, changeRoom } = useRoom();
  const { isConnected } = useWebSocket({ roomId, onSync: fetchData });
  const { lang: _lang } = useI18n();
  const [baseUrl, setBaseUrl] = useState('https://claytablet.online');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [roomInput, setRoomInput] = useState('');
  const [showRoomInput, setShowRoomInput] = useState(false);
  const [lastItemCount, setLastItemCount] = useState(0);

  // Load base URL for media cards + apply saved theme on startup
  useEffect(() => {
    getBaseUrl().then(setBaseUrl);
    import('../services/store').then(({ getSetting }) => {
      getSetting<'light' | 'dark' | 'system'>('theme', 'system').then(theme => {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const dark = theme === 'dark' || (theme === 'system' && prefersDark);
        document.documentElement.classList.toggle('dark', dark);
      });
    });
  }, []);

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
    const { deleteItem } = await import('../services/api');
    await deleteItem(roomId, id);
    fetchData();
  }, [roomId, fetchData]);

  const handleRoomSwitch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (roomInput.trim()) {
      await changeRoom(roomInput.trim());
      setRoomInput('');
      setShowRoomInput(false);
    }
  };

  if (showSettings) {
    return <Settings onClose={() => setShowSettings(false)} />;
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-900 font-sans">
      {/* Header */}
      <header className="flex-shrink-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Logo + room */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-indigo-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">CT</span>
            </div>
            <span className="text-slate-400 text-sm select-none hidden sm:block">ClayTablet</span>
            <span className="text-slate-300 dark:text-slate-600 hidden sm:block">/</span>
            <span className="font-semibold text-slate-800 dark:text-slate-100 truncate max-w-[120px] text-sm">
              {roomId || '...'}
            </span>
          </div>

          <div className="flex-1" />

          {/* Connection status */}
          <ConnectionStatus isConnected={isConnected} />

          {/* New room button */}
          <button
            onClick={() => setShowRoomInput(v => !v)}
            title="Сменить комнату"
            className="p-2 rounded-xl text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <Plus size={18} />
          </button>

          {/* Refresh */}
          <button
            onClick={fetchData}
            title="Обновить"
            className={`p-2 rounded-xl text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${loading ? 'animate-spin' : ''}`}
          >
            <RefreshCw size={18} />
          </button>

          {/* Settings */}
          <button
            onClick={() => setShowSettings(true)}
            title="Настройки"
            className="p-2 rounded-xl text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <Settings2 size={18} />
          </button>
        </div>

        {/* Room input */}
        {showRoomInput && (
          <form onSubmit={handleRoomSwitch} className="mt-2 flex gap-2">
            <input
              autoFocus
              value={roomInput}
              onChange={e => setRoomInput(e.target.value)}
              placeholder="Введите room_id..."
              className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-indigo-400/50"
            />
            <button type="submit" className="px-3 py-1.5 bg-indigo-500 text-white rounded-lg text-sm hover:bg-indigo-600 transition-colors">
              Перейти
            </button>
          </form>
        )}

        {/* Recent rooms */}
        {showRoomInput && recentRooms.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {recentRooms.map(r => (
              <button
                key={r}
                onClick={() => { changeRoom(r); setShowRoomInput(false); }}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  r === roomId
                    ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 hover:text-indigo-600'
                }`}
              >
                {r === roomId ? `● ${r}` : r}
              </button>
            ))}
          </div>
        )}
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
            <p className="text-sm">Доска пуста. Создайте заметку!</p>
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

      {/* Bottom bar */}
      <BottomBar roomId={roomId} onSent={fetchData} disabled={!roomId} />
    </div>
  );
}
