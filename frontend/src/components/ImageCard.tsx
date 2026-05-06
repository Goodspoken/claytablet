import { memo } from 'react';
import { Copy, Download, Share2, Trash2 } from 'lucide-react';
import type { ClipboardItem } from '../types';
import { timeAgo } from '../utils';
import { useLanguage } from '../contexts/LanguageContext';

interface ImageCardProps {
  item: ClipboardItem;
  onShare: (item: ClipboardItem) => void;
  onCopyImage?: (url: string) => void;
  onDelete?: (id: string) => void;
}

export const ImageCard = memo(function ImageCard({ item, onShare, onCopyImage, onDelete }: ImageCardProps) {
  const { lang, t } = useLanguage();
  return (
    <div className="break-inside-avoid bg-white dark:bg-slate-800 shadow-sm border border-slate-200/70 dark:border-slate-700/70 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 rounded-[1.25rem] overflow-hidden group relative">
      <div className="relative bg-slate-50 dark:bg-slate-900 flex items-center justify-center min-h-[80px]">
        <a href={item.url} target="_blank" rel="noreferrer" className="block w-full">
          <img
            src={item.url}
            alt={item.filename}
            className="w-full h-auto object-cover"
            loading="lazy"
          />
        </a>
      </div>

      {/* Timestamp */}
      <div className="px-5 pb-3 pt-1 text-[11px] text-slate-400 dark:text-slate-500 font-medium select-none">
        {timeAgo(item.timestamp, lang)}
      </div>

      {/* Action Bar: always visible on touch (mobile), hover-only on desktop */}
      <div className="absolute bottom-4 right-4 flex items-center gap-1.5 opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 transition-opacity duration-200 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm shadow-sm border border-slate-100 dark:border-slate-700/60 p-1 rounded-2xl">
        {onCopyImage && (
          <button
            onClick={() => onCopyImage(item.url!)}
            className="p-2 text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            title={t('copyAction')}
          >
            <Copy size={16} />
          </button>
        )}
        <a
          href={item.url}
          download={item.filename}
          className="p-2 text-slate-400 dark:text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors block"
          title={t('downloadAction')}
        >
          <Download size={16} />
        </a>
        <button
          onClick={() => onShare(item)}
          className="p-2 text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          title={t('shareAction')}
        >
          <Share2 size={16} />
        </button>
        {onDelete && <>
          <div className="w-px h-4 bg-slate-200 dark:bg-slate-600 mx-0.5"></div>
          <button
            onClick={() => onDelete(item.id)}
            className="p-2 text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
            title={t('deleteAction')}
          >
            <Trash2 size={16} />
          </button>
        </>}
      </div>
    </div>
  );
});
