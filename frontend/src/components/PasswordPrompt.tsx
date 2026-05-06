import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Lock, ArrowRight, Loader2, ArrowLeft, ShieldAlert } from 'lucide-react';
import { verifyPassword } from '../api';
import { useLanguage } from '../contexts/LanguageContext';

const MAX_ATTEMPTS = 3;
const LOCKOUT_SECONDS = 60;

interface PasswordPromptProps {
  roomId: string;
  onSuccess: () => void;
}

export function PasswordPrompt({ roomId, onSuccess }: PasswordPromptProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const lockedUntilRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { lang, t } = useLanguage();

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  // Countdown tick when locked
  useEffect(() => {
    if (countdown <= 0) return;
    const id = setTimeout(() => {
      const remaining = lockedUntilRef.current ? Math.ceil((lockedUntilRef.current - Date.now()) / 1000) : 0;
      if (remaining <= 0) {
        lockedUntilRef.current = null;
        setAttempts(0);
        setCountdown(0);
        setError('');
        inputRef.current?.focus();
      } else {
        setCountdown(remaining);
      }
    }, 1000);
    return () => clearTimeout(id);
  }, [countdown]);

  const isLocked = countdown > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || isLocked) return;

    setIsLoading(true);
    setError('');

    try {
      const isValid = await verifyPassword(roomId, password);
      if (isValid) {
        onSuccess();
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        setPassword('');
        if (newAttempts >= MAX_ATTEMPTS) {
          lockedUntilRef.current = Date.now() + LOCKOUT_SECONDS * 1000;
          setCountdown(LOCKOUT_SECONDS);
          setError(t('tooManyAttempts'));
        } else {
          setError(`${t('wrongPassword')} (${newAttempts}/${MAX_ATTEMPTS})`);
          inputRef.current?.focus();
        }
      }
    } catch {
      setError(lang === 'RU' ? 'Ошибка связи с сервером.' : 'Server connection error.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex flex-col items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-sm border border-slate-100 dark:border-slate-800 overflow-hidden transform transition-all animate-in fade-in zoom-in duration-300">
        <div className="p-8 pb-6 flex flex-col items-center text-center relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shrink-0 shadow-inner border ${isLocked ? 'bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400 border-red-100/50 dark:border-red-800/50' : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-indigo-100/50 dark:border-indigo-800/50'}`}>
            {isLocked ? <ShieldAlert size={32} strokeWidth={2.5} /> : <Lock size={32} strokeWidth={2.5} />}
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2 tracking-tight">{t('passwordTitle')}</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs leading-relaxed">
            {t('passwordEnterLabel')} (ID: <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300">{roomId}</span>)
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-8 pb-8 flex flex-col gap-4">
          <div className="relative">
            <input
              ref={inputRef}
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              placeholder={isLocked ? `${t('tryAgainIn')} ${countdown}с` : (lang === 'RU' ? 'Введите пароль...' : 'Enter password...')}
              disabled={isLoading || isLocked}
              className={`w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800 border ${error ? 'border-red-300 dark:border-red-500/50 focus:ring-red-200 dark:focus:ring-red-900' : 'border-slate-200 dark:border-slate-700 focus:ring-indigo-100 dark:focus:ring-indigo-900 focus:border-indigo-400 dark:focus:border-indigo-500'} rounded-xl focus:outline-none focus:ring-4 transition-all pr-12 text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 font-medium disabled:opacity-60 disabled:cursor-not-allowed`}
            />
            {error && (
              <div className="absolute -bottom-6 left-1 text-[11px] text-red-500 dark:text-red-400 font-medium">
                {isLocked ? `${t('tooManyAttempts')} — ${t('tryAgainIn')} ${countdown}с` : error}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || !password.trim() || isLocked}
            className="w-full mt-2 bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 text-white font-semibold py-3.5 px-4 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
          >
            {isLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : isLocked ? (
              <span>{t('tryAgainIn')} {countdown}с</span>
            ) : (
              <>
                <span>{t('enterRoom')}</span>
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>

          <Link
            to="/"
            className="w-full text-center text-sm text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 font-medium py-2 transition-colors flex items-center justify-center gap-1.5"
          >
            <ArrowLeft size={14} />
            {lang === 'RU' ? 'Перейти в другую комнату' : 'Go to another room'}
          </Link>
        </form>
      </div>
    </div>
  );
}
