import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  returnTo?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, returnTo }) => {
  const { t } = useLanguage();

  if (!isOpen) return null;

  const handleLoginClick = () => {
    if (returnTo) {
      localStorage.setItem('returnTo', returnTo);
    }
  };

  const isPrivateRoomAccess = !!returnTo && returnTo !== '/';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl max-w-sm w-full overflow-hidden p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          ✕
        </button>

        <div className="text-center mb-6 mt-2">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            {t('login')}
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {isPrivateRoomAccess ? t('privateRoomDesc') : t('loginDesc')}
          </p>
        </div>

        <div className="space-y-3">
          <a
            href="/api/auth/google/login"
            onClick={handleLoginClick}
            className="flex items-center justify-center gap-3 w-full py-3 px-4 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-700 dark:text-zinc-200 font-medium hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors shadow-sm"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Google
          </a>

          <a
            href="/api/auth/yandex/login"
            onClick={handleLoginClick}
            className="flex items-center justify-center gap-3 w-full py-3 px-4 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-700 dark:text-zinc-200 font-medium hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors shadow-sm"
          >
            <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
              Я
            </div>
            Yandex
          </a>
        </div>
      </div>
    </div>
  );
};
