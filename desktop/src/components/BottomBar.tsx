import { useState, useRef } from 'react';
import { readText } from '@tauri-apps/plugin-clipboard-manager';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { readFile } from '@tauri-apps/plugin-fs';
import { Send, Clipboard, Paperclip } from 'lucide-react';
import { addText, addImage, addAudio, addFile } from '../services/api';

interface BottomBarProps {
  roomId: string;
  onSent: () => void;
  disabled?: boolean;
}

function getMimeFromExt(ext: string): string {
  const img = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
  const audio = ['mp3', 'ogg', 'wav', 'webm', 'opus', 'm4a'];
  if (img.includes(ext)) return `image/${ext === 'jpg' ? 'jpeg' : ext}`;
  if (audio.includes(ext)) return `audio/${ext}`;
  return 'application/octet-stream';
}

export function BottomBar({ roomId, onSent, disabled }: BottomBarProps) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    try {
      await addText(roomId, trimmed);
      setText('');
      onSent();
    } catch (err) {
      console.error('addText error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  const handlePaste = async () => {
    try {
      const txt = await readText();
      if (txt && txt.trim()) {
        await addText(roomId, txt.trim());
        onSent();
        return;
      }
    } catch {
      // no text in clipboard, try image below
    }
    // Image paste not supported via readText; user can use Ctrl+V in input instead
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
    setLoading(true);
    try {
      for (const path of paths) {
        const ext = path.split('.').pop()?.toLowerCase() ?? 'bin';
        const mime = getMimeFromExt(ext);
        const data = await readFile(path);
        const blob = new Blob([data], { type: mime });
        const filename = path.split('/').pop() ?? path.split('\\').pop() ?? 'file';
        const file = new File([blob], filename, { type: mime });

        if (mime.startsWith('image/')) {
          await addImage(roomId, file);
        } else if (mime.startsWith('audio/')) {
          await addAudio(roomId, file);
        } else {
          await addFile(roomId, file);
        }
      }
      onSent();
    } catch (err) {
      console.error('attach error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-t border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900 px-4 py-3">
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          ref={inputRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Написать заметку..."
          disabled={disabled || loading}
          className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-400 transition disabled:opacity-50"
        />

        {/* Paste from clipboard */}
        <button
          type="button"
          onClick={handlePaste}
          disabled={disabled || loading}
          title="Вставить из буфера обмена"
          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-indigo-500 hover:border-indigo-300 transition-colors disabled:opacity-50"
        >
          <Clipboard size={18} />
        </button>

        {/* Attach file */}
        <button
          type="button"
          onClick={handleAttach}
          disabled={disabled || loading}
          title="Прикрепить файл"
          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-indigo-500 hover:border-indigo-300 transition-colors disabled:opacity-50"
        >
          <Paperclip size={18} />
        </button>

        {/* Send */}
        <button
          type="submit"
          disabled={!text.trim() || disabled || loading}
          title="Отправить (Enter)"
          className="p-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white shadow-sm transition-colors disabled:opacity-40"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
