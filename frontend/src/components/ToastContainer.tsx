import type { Toast as ToastType } from '../hooks/useToast';
import { useTheme } from '../contexts/ThemeContext';
import { CheckCircle, XCircle, Info } from 'lucide-react';

interface ToastContainerProps {
  toasts: ToastType[];
}

const toastStyles = {
  success: {
    light: 'bg-slate-800 text-white',
    dark: 'bg-slate-200 text-slate-900',
    icon: <CheckCircle size={16} className="shrink-0" />,
  },
  error: {
    light: 'bg-red-600 text-white',
    dark: 'bg-red-500 text-white',
    icon: <XCircle size={16} className="shrink-0" />,
  },
  info: {
    light: 'bg-indigo-600 text-white',
    dark: 'bg-indigo-400 text-white',
    icon: <Info size={16} className="shrink-0" />,
  },
};

export function ToastContainer({ toasts }: ToastContainerProps) {
  const { theme } = useTheme();
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none">
      {toasts.map(toast => {
        const styles = toastStyles[toast.type];
        const colorClass = theme === 'dark' ? styles.dark : styles.light;
        return (
          <div
            key={toast.id}
            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl shadow-lg text-sm font-medium pointer-events-auto select-none
              ${toast.exiting ? 'toast-exit' : 'toast-enter'}
              ${colorClass}
            `}
          >
            {toastStyles[toast.type].icon}
            {toast.message}
          </div>
        );
      })}
    </div>
  );
}
