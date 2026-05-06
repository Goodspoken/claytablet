import { memo, useRef, useState } from 'react';
import { Play, Pause, Download, Trash2 } from 'lucide-react';
import type { ClipboardItem } from '../types';

interface AudioCardProps {
  item: ClipboardItem;
  onDelete?: (id: string) => void;
  baseUrl: string;
}

export const AudioCard = memo(function AudioCard({ item, onDelete, baseUrl }: AudioCardProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const audioUrl = item.url ? `${baseUrl}${item.url}` : '';

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().then(() => setPlaying(true)).catch(console.error);
    }
  };

  return (
    <div className="break-inside-avoid bg-white dark:bg-slate-800 shadow-sm border border-slate-200/70 dark:border-slate-700/70 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 rounded-[1.25rem] overflow-hidden group relative p-4">
      <audio ref={audioRef} src={audioUrl} onEnded={() => setPlaying(false)} />

      <div className="flex items-center gap-3">
        <button onClick={togglePlay}
          className="w-11 h-11 rounded-full bg-indigo-500 hover:bg-indigo-600 flex items-center justify-center text-white shadow-md transition-colors flex-shrink-0">
          {playing ? <Pause size={20} /> : <Play size={20} />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
            {item.filename ?? 'Аудио'}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            {item.size ? `${(item.size / 1024).toFixed(1)} KB` : 'Аудиозапись'}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <a href={audioUrl} download={item.filename ?? 'audio'}
            className="p-2 text-slate-400 hover:text-blue-500 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            title="Скачать">
            <Download size={16} />
          </a>
          {onDelete && (
            <button onClick={() => onDelete(item.id)}
              className="p-2 text-slate-400 hover:text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
              title="Удалить">
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
});
