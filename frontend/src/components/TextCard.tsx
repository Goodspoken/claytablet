import { memo } from 'react';
import { Copy, Check, Share2, Trash2 } from 'lucide-react';
import type { ClipboardItem } from '../types';
import { timeAgo, linkify } from '../utils';
import { useLanguage } from '../contexts/LanguageContext';

interface TextCardProps {
  item: ClipboardItem;
  copiedId: string | null;
  onCopy: (content: string, id: string) => void;
  onShare: (item: ClipboardItem) => void;
  onDelete?: (id: string) => void;
}

function getYouTubeId(url: string) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

function isImageLink(url: string) {
  return /\.(jpeg|jpg|gif|png|webp)(\?.*)?$/i.test(url);
}

export const TextCard = memo(function TextCard({ item, copiedId, onCopy, onShare, onDelete }: TextCardProps) {
  const { lang, t } = useLanguage();
  const content = item.content || '';
  const firstUrlMatch = content.match(/https?:\/\/[^\s]+/);
  const firstUrl = firstUrlMatch ? firstUrlMatch[0] : null;

  let ytId = null;
  let imgUrl = null;
  if (firstUrl) {
    ytId = getYouTubeId(firstUrl);
    if (!ytId && isImageLink(firstUrl)) imgUrl = firstUrl;
  }

  return (
    <div className="break-inside-avoid bg-white dark:bg-slate-800 shadow-sm border border-slate-200/70 dark:border-slate-700/70 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 rounded-[1.25rem] overflow-hidden group relative">
      <div className="p-5 flex flex-col gap-3">
        {content && (
          <pre className="whitespace-pre-wrap font-sans text-[14px] text-slate-700 dark:text-slate-200 leading-relaxed max-h-[400px] overflow-y-auto custom-scrollbar">
            {linkify(content)}
          </pre>
        )}
        {ytId && (
          <div className="rounded-xl overflow-hidden aspect-video border border-slate-200 dark:border-slate-700 shadow-sm relative z-0">
            <iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${ytId}`} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
          </div>
        )}
        {imgUrl && (
          <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
            <img src={imgUrl} alt="Link preview" className="w-full h-auto object-cover max-h-64" loading="lazy" />
          </div>
        )}
      </div>

      {/* Timestamp */}
      <div className="px-5 pb-3 pt-1 text-[11px] text-slate-400 dark:text-slate-500 font-medium select-none">
        {timeAgo(item.timestamp, lang)}
      </div>

      {/* Action Bar: always visible on touch (mobile), hover-only on desktop */}
      <div className="absolute bottom-4 right-4 flex items-center gap-1.5 opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 transition-opacity duration-200 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm shadow-sm border border-slate-100 dark:border-slate-700/60 p-1 rounded-2xl">
        <button
          onClick={() => onCopy(item.content!, item.id)}
          className="p-2 text-slate-400 dark:text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          title={t('copyAction')}
        >
          {copiedId === item.id ? <Check size={16} className="text-green-500 dark:text-green-400" /> : <Copy size={16} />}
        </button>
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
