import { memo } from 'react';
import { Copy, Check, Share2, Trash2 } from 'lucide-react';
import type { ClipboardItem } from '../types';

interface TextCardProps {
  item: ClipboardItem;
  copiedId: string | null;
  onCopy: (content: string, id: string) => void;
  onShare: (item: ClipboardItem) => void;
  onDelete?: (id: string) => void;
}

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() / 1000 - ts));
  if (diff < 60) return `${diff}с назад`;
  if (diff < 3600) return `${Math.floor(diff / 60)}м назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}ч назад`;
  return `${Math.floor(diff / 86400)}д назад`;
}

function getYouTubeId(url: string) {
  const match = url.match(/^.*(youtu\.be\/|v\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
  return match && match[2].length === 11 ? match[2] : null;
}

function isImageLink(url: string) {
  return /\.(jpeg|jpg|gif|png|webp)(\?.*)?$/i.test(url);
}

function linkify(text: string) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return parts.map((part, i) =>
    /^https?:\/\//.test(part)
      ? <a key={i} href={part} target="_blank" rel="noreferrer" className="text-indigo-500 underline break-all">{part}</a>
      : part
  );
}

export const TextCard = memo(function TextCard({ item, copiedId, onCopy, onShare, onDelete }: TextCardProps) {
  const content = item.content ?? '';
  const firstUrl = content.match(/https?:\/\/[^\s]+/)?.[0] ?? null;
  const ytId = firstUrl ? getYouTubeId(firstUrl) : null;
  const imgUrl = firstUrl && !ytId && isImageLink(firstUrl) ? firstUrl : null;

  return (
    <div className="break-inside-avoid bg-white dark:bg-slate-800 shadow-sm border border-slate-200/70 dark:border-slate-700/70 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 rounded-[1.25rem] overflow-hidden group relative">
      <div className="p-5 flex flex-col gap-3">
        {content && (
          <pre className="whitespace-pre-wrap font-sans text-[14px] text-slate-700 dark:text-slate-200 leading-relaxed max-h-[400px] overflow-y-auto">
            {linkify(content)}
          </pre>
        )}
        {ytId && (
          <div className="rounded-xl overflow-hidden aspect-video border border-slate-200 dark:border-slate-700 shadow-sm">
            <iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${ytId}`} allowFullScreen />
          </div>
        )}
        {imgUrl && (
          <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
            <img src={imgUrl} alt="Link preview" className="w-full h-auto object-cover max-h-64" loading="lazy" />
          </div>
        )}
      </div>

      <div className="px-5 pb-3 pt-1 text-[11px] text-slate-400 dark:text-slate-500 font-medium select-none">
        {timeAgo(new Date(item.created_at).getTime())}
      </div>

      {/* Action bar */}
      <div className="absolute bottom-4 right-4 flex items-center gap-1.5 opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 transition-opacity duration-200 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm shadow-sm border border-slate-100 dark:border-slate-700/60 p-1 rounded-2xl">
        <button onClick={() => onCopy(item.content!, item.id)}
          className="p-2 text-slate-400 hover:text-indigo-500 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          title="Копировать">
          {copiedId === item.id ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
        </button>
        <button onClick={() => onShare(item)}
          className="p-2 text-slate-400 hover:text-blue-500 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          title="Поделиться">
          <Share2 size={16} />
        </button>
        {onDelete && (
          <>
            <div className="w-px h-4 bg-slate-200 dark:bg-slate-600 mx-0.5" />
            <button onClick={() => onDelete(item.id)}
              className="p-2 text-slate-400 hover:text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
              title="Удалить">
              <Trash2 size={16} />
            </button>
          </>
        )}
      </div>
    </div>
  );
});
