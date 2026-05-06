import { useLanguage } from '../contexts/LanguageContext';

interface DragOverlayProps {
  isDragging: boolean;
}

export function DragOverlay({ isDragging }: DragOverlayProps) {
  const { t } = useLanguage();
  if (!isDragging) return null;

  return (
    <div className="absolute inset-x-4 inset-y-4 rounded-3xl border-[3px] border-dashed border-indigo-400 dark:border-indigo-500 bg-indigo-50/20 dark:bg-indigo-900/10 z-30 pointer-events-none flex items-center justify-center">
      <p className="text-indigo-500 dark:text-indigo-400 font-semibold text-lg bg-white/80 dark:bg-slate-900/80 px-6 py-3 rounded-2xl shadow-sm backdrop-blur-sm">
        {t('dropToUpload')}
      </p>
    </div>
  );
}
