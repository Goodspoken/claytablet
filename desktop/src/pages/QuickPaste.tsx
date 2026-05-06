import { useEffect, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { fetchClipboard } from '../services/api';
import { getCurrentRoom } from '../services/store';
import type { ClipboardItem } from '../types';

export default function QuickPaste() {
  const [items, setItems] = useState<ClipboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const win = getCurrentWindow();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const roomId = await getCurrentRoom();
        const data = await fetchClipboard(roomId);
        setItems(data.items.filter(i => i.type === 'text').slice(0, 5));
      } catch (err) {
        console.error('[QuickPaste] load error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') win.hide();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [win]);

  const handleItemClick = async (item: ClipboardItem) => {
    await writeText(item.content ?? '');
    win.hide();
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) win.hide();
  };

  return (
    <div
      className="bg-white dark:bg-slate-900 h-screen flex flex-col font-sans select-none overflow-hidden"
      onClick={handleBackdropClick}
    >
      {/* Drag region for the undecorated window */}
      <div data-tauri-drag-region className="h-8 flex items-center px-3 bg-indigo-500 text-white text-xs font-semibold flex-shrink-0 cursor-grab">
        <span>⚡ Quick Paste</span>
        <button
          onClick={() => win.hide()}
          className="ml-auto w-5 h-5 flex items-center justify-center rounded hover:bg-white/20 transition-colors"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 flex flex-col p-2 gap-1 overflow-y-auto">
        {loading && (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
            Загрузка...
          </div>
        )}
        {!loading && items.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm text-center px-4">
            Нет текстовых записей
          </div>
        )}
        {!loading && items.map(item => (
          <button
            key={item.id}
            onClick={() => handleItemClick(item)}
            className="text-left px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 text-sm text-slate-700 dark:text-slate-200 truncate transition-colors border border-transparent hover:border-indigo-200 dark:hover:border-indigo-700"
          >
            {item.content}
          </button>
        ))}
      </div>

      <div className="px-3 py-1.5 text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-800 text-center flex-shrink-0">
        Клик — скопировать · ESC — закрыть
      </div>
    </div>
  );
}
