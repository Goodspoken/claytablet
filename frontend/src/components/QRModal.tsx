import { X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useLanguage } from '../contexts/LanguageContext';

interface QRModalProps {
  isOpen: boolean;
  url: string;
  onClose: () => void;
}

export function QRModal({ isOpen, url, onClose }: QRModalProps) {
  const { t } = useLanguage();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/20 dark:bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm border border-slate-100 dark:border-slate-800 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{t('qrTitle')}</h2>
          <button onClick={onClose} className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 bg-white dark:bg-slate-800 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-8 flex flex-col items-center gap-5">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 max-w-full">
            <QRCodeSVG
              value={url}
              size={200}
              level="M"
              bgColor="#ffffff"
              fgColor="#1e293b"
            />
          </div>
          <div className="text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('qrScanText')}</p>
            <p className="text-xs text-slate-400 mt-1 font-mono break-all max-w-[280px]">{url}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
