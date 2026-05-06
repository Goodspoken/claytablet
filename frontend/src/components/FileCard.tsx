import { memo } from 'react';
import { Download, Share2, Trash2, FileText, FileArchive, FileImage, FileVideo, FileAudio, File } from 'lucide-react';
import type { ClipboardItem } from '../types';
import { timeAgo } from '../utils';
import { useLanguage } from '../contexts/LanguageContext';

interface FileCardProps {
  item: ClipboardItem;
  onShare: (item: ClipboardItem) => void;
  onDelete?: (id: string) => void;
}

function FileIcon({ filename, size = 24 }: { filename?: string; size?: number }) {
  const ext = (filename || '').split('.').pop()?.toLowerCase() || '';
  if (['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'].includes(ext)) return <FileText size={size} />;
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext)) return <FileArchive size={size} />;
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) return <FileImage size={size} />;
  if (['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv'].includes(ext)) return <FileVideo size={size} />;
  if (['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'webm'].includes(ext)) return <FileAudio size={size} />;
  return <File size={size} />;
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileColor(filename?: string): string {
  const ext = (filename || '').split('.').pop()?.toLowerCase() || '';
  if (['pdf'].includes(ext)) return 'text-red-500 bg-red-50 dark:bg-red-900/30';
  if (['doc', 'docx'].includes(ext)) return 'text-blue-500 bg-blue-50 dark:bg-blue-900/30';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'text-amber-500 bg-amber-50 dark:bg-amber-900/30';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'text-green-500 bg-green-50 dark:bg-green-900/30';
  return 'text-slate-500 bg-slate-50 dark:bg-slate-800';
}

export const FileCard = memo(function FileCard({ item, onShare, onDelete }: FileCardProps) {
  const { lang, t } = useLanguage();
  const colorClass = getFileColor(item.filename);
  const ext = (item.filename || '').split('.').pop()?.toUpperCase() || 'FILE';

  return (
    <div className="break-inside-avoid bg-white dark:bg-slate-800 shadow-sm border border-slate-200/70 dark:border-slate-700/70 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 rounded-[1.25rem] overflow-hidden group relative">
      <div className="p-5 flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
          <FileIcon filename={item.filename} size={24} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate" title={item.filename}>
            {item.filename || 'Unknown file'}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded">
              {ext}
            </span>
            {item.size && (
              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                {formatFileSize(item.size)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Timestamp */}
      <div className="px-5 pb-3 text-[11px] text-slate-400 dark:text-slate-500 font-medium select-none">
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
