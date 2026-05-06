import { memo } from 'react';
import { Download, Trash2, File } from 'lucide-react';
import type { ClipboardItem } from '../types';

interface FileCardProps {
  item: ClipboardItem;
  onDelete?: (id: string) => void;
  baseUrl: string;
}

export const FileCard = memo(function FileCard({ item, onDelete, baseUrl }: FileCardProps) {
  const fileUrl = item.url ? `${baseUrl}${item.url}` : '';

  return (
    <div className="break-inside-avoid bg-white dark:bg-slate-800 shadow-sm border border-slate-200/70 dark:border-slate-700/70 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 rounded-[1.25rem] overflow-hidden group relative p-4">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
          <File size={22} className="text-slate-500 dark:text-slate-400" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
            {item.filename ?? 'Файл'}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            {item.size ? `${(item.size / 1024).toFixed(1)} KB` : 'Файл'}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <a href={fileUrl} download={item.filename ?? 'file'}
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
