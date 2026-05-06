import { memo } from 'react';
import { Download, Trash2 } from 'lucide-react';
import type { ClipboardItem } from '../types';

interface ImageCardProps {
  item: ClipboardItem;
  onDelete?: (id: string) => void;
  baseUrl: string;
}

export const ImageCard = memo(function ImageCard({ item, onDelete, baseUrl }: ImageCardProps) {
  const imgUrl = item.url ? `${baseUrl}${item.url}` : '';

  const handleCopyToClipboard = async () => {
    try {
      // Fetch image as blob and write to clipboard via ClipboardItem API
      // (works in Tauri WebView which has Clipboard API access)
      const res = await fetch(imgUrl);
      const blob = await res.blob();
      const mimeType = blob.type.startsWith('image/') ? blob.type : 'image/png';
      await navigator.clipboard.write([
        new ClipboardItem({ [mimeType]: blob }),
      ]);
    } catch (err) {
      console.error('Copy image error:', err);
    }
  };

  return (
    <div className="break-inside-avoid bg-white dark:bg-slate-800 shadow-sm border border-slate-200/70 dark:border-slate-700/70 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 rounded-[1.25rem] overflow-hidden group relative">
      {imgUrl && (
        <img
          src={imgUrl}
          alt={item.filename ?? 'image'}
          className="w-full h-auto object-cover max-h-80 select-none"
          loading="lazy"
        />
      )}

      {/* Action bar */}
      <div className="absolute bottom-3 right-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm shadow-sm border border-slate-100 dark:border-slate-700/60 p-1 rounded-2xl">
        <button
          onClick={handleCopyToClipboard}
          className="p-2 text-slate-400 hover:text-indigo-500 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-base leading-none"
          title="Копировать в буфер"
        >
          📋
        </button>
        <a
          href={imgUrl}
          download={item.filename ?? 'image'}
          className="p-2 text-slate-400 hover:text-blue-500 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center"
          title="Скачать"
        >
          <Download size={16} />
        </a>
        {onDelete && (
          <>
            <div className="w-px h-4 bg-slate-200 dark:bg-slate-600 mx-0.5" />
            <button
              onClick={() => onDelete(item.id)}
              className="p-2 text-slate-400 hover:text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
              title="Удалить"
            >
              <Trash2 size={16} />
            </button>
          </>
        )}
      </div>
    </div>
  );
});
