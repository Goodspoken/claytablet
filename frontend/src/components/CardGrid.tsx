import { ClipboardIcon, ImageIcon, Mic } from 'lucide-react';
import type { ClipboardItem } from '../types';
import { TextCard } from './TextCard';
import { ImageCard } from './ImageCard';
import { AudioCard } from './AudioCard';
import { FileCard } from './FileCard';
import { useLanguage } from '../contexts/LanguageContext';

interface CardGridProps {
  items: ClipboardItem[];
  copiedId: string | null;
  isReadOnly?: boolean;
  onCopy: (content: string, id: string) => void;
  onShare: (item: ClipboardItem) => void;
  onCopyImage: (url: string) => void;
  onDelete: (id: string) => void;
}

export function CardGrid({ items, copiedId, isReadOnly = false, onCopy, onShare, onCopyImage, onDelete }: CardGridProps) {
  const { t } = useLanguage();

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full select-none">
        {/* V5: Enhanced empty state with better visual clarity */}
        <div className="relative w-28 h-28 mb-8">
          <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-100/80 dark:border-indigo-800/40 shadow-sm" />
          <div className="absolute inset-0 flex items-center justify-center">
            <ClipboardIcon size={36} className="text-indigo-300 dark:text-indigo-600" />
          </div>
          <div className="absolute -top-2 -right-3 w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-sm">
            <ImageIcon size={18} className="text-pink-400 dark:text-pink-500" />
          </div>
          <div className="absolute -bottom-2 -left-3 w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-sm">
            <Mic size={18} className="text-indigo-400 dark:text-indigo-500" />
          </div>
        </div>
        <p className="text-xl font-bold text-slate-600 dark:text-slate-300 mb-2 tracking-tight">
          {t('boardEmpty')}
        </p>
        <p className="text-slate-400 dark:text-slate-500 max-w-xs text-center text-sm leading-relaxed">
          {t('nothingFound')}
        </p>
        <div className="mt-6 flex items-center gap-3 text-xs text-slate-300 dark:text-slate-600">
          <kbd className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-sm font-mono">Ctrl+V</kbd>
          <span>{t('orDragDrop')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 2xl:columns-5 gap-5 space-y-5 max-w-[1920px] mx-auto">
      {items.map(item => {
        const noDelete = isReadOnly ? undefined : onDelete;
        if (item.type === 'audio') return <AudioCard key={item.id} item={item} onShare={onShare} onDelete={noDelete} />;
        if (item.type === 'image') return <ImageCard key={item.id} item={item} onShare={onShare} onCopyImage={onCopyImage} onDelete={noDelete} />;
        if (item.type === 'file') return <FileCard key={item.id} item={item} onShare={onShare} onDelete={noDelete} />;
        return <TextCard key={item.id} item={item} copiedId={copiedId} onCopy={onCopy} onShare={onShare} onDelete={noDelete} />;
      })}
    </div>
  );
}
