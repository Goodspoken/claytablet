import { memo } from 'react';
import { Download, Share2, Trash2, Mic } from 'lucide-react';
import type { ClipboardItem } from '../types';
import { timeAgo } from '../utils';
import { useLanguage } from '../contexts/LanguageContext';

interface AudioCardProps {
  item: ClipboardItem;
  onShare: (item: ClipboardItem) => void;
  onDelete?: (id: string) => void;
}

export const AudioCard = memo(function AudioCard({ item, onShare, onDelete }: AudioCardProps) {
  const { lang, t } = useLanguage();
  return (
    <div className="break-inside-avoid bg-white dark:bg-slate-800 shadow-sm border border-slate-200/70 dark:border-slate-700 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 rounded-[1.25rem] overflow-hidden group relative p-5">
      <div className="flex flex-col gap-3">
        <div className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
           <Mic size={16} className="text-indigo-500 dark:text-indigo-400" />
           {t('voiceMessage')}
        </div>
        {/* V3: Replaced native <audio> with a styled wrapper — removes forced light theme via invert hack */}
        <div className="relative w-full rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-700/50">
          <audio
            controls
            src={item.url}
            className="w-full h-10 outline-none [color-scheme:normal] dark:[color-scheme:dark]"
          />
        </div>
      </div>

      <div className="pb-1 pt-3 text-[11px] text-slate-400 dark:text-slate-500 font-medium select-none">
        {timeAgo(item.timestamp, lang)}
      </div>

      {/* Action Bar: always visible on touch (mobile), hover-only on desktop */}
      <div className="absolute bottom-4 right-4 flex items-center gap-1.5 opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 transition-opacity duration-200 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm shadow-sm border border-slate-100 dark:border-slate-700/60 p-1 rounded-2xl">
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
