import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, Clipboard, Smartphone, Monitor, Zap, Globe, Sun, Moon, Hash, LogIn, Lock, ChevronDown, ChevronUp } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { AuthModal } from '../components/AuthModal';
import * as api from '../api';
import { generateId } from '../helpers';
import type { PublicRoom, SystemRoom } from '../types';

const PENDING_ROOM_KEY = 'claytablet_pending_room';
const isValidRoomName = (name: string) => /^[a-zA-Z0-9_-]{2,32}$/.test(name);

export default function HomePage() {
  const navigate = useNavigate();
  const { lang, setLang } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { user, isLoading } = useAuth();

  const [roomInput, setRoomInput] = useState('');
  const [inputError, setInputError] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [myRooms, setMyRooms] = useState<{ id: string; ttl: string; last_activity?: string }[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [publicRooms, setPublicRooms] = useState<PublicRoom[]>([]);
  const [systemRooms, setSystemRooms] = useState<SystemRoom[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const didAutoRedirect = useRef(false);

  // Load user's rooms when user becomes available
  useEffect(() => {
    if (!user) return;
    setRoomsLoading(true);
    api.getMyRooms()
      .then((rooms: { id: string; ttl: string; last_activity?: string }[]) => setMyRooms(rooms))
      .catch(() => setMyRooms([]))
      .finally(() => setRoomsLoading(false));
  }, [user]);

  // Load public + system rooms on mount
  useEffect(() => {
    api.getPublicRooms().then(setPublicRooms).catch(() => {});
    api.getSystemRooms().then(setSystemRooms).catch(() => {});
  }, []);

  // After login: restore pending room
  useEffect(() => {
    if (isLoading || didAutoRedirect.current) return;
    const pendingRoom = localStorage.getItem(PENDING_ROOM_KEY);
    if (pendingRoom && user) {
      localStorage.removeItem(PENDING_ROOM_KEY);
      didAutoRedirect.current = true;
      navigate(`/${pendingRoom}`);
    }
  }, [user, isLoading, navigate]);

  // Auto-redirect if exactly one room
  useEffect(() => {
    if (isLoading || roomsLoading || didAutoRedirect.current) return;
    if (!user || myRooms.length !== 1 || roomInput.trim()) return;
    if (localStorage.getItem(PENDING_ROOM_KEY)) return;
    didAutoRedirect.current = true;
    navigate(`/${myRooms[0].id}`);
  }, [user, myRooms, roomsLoading, isLoading, navigate, roomInput]);

  const goToRoom = (id?: string) => {
    const target = id ?? (roomInput.trim() || generateId());
    if (roomInput.trim() && !isValidRoomName(roomInput.trim())) {
      setInputError(
        lang === 'RU'
          ? 'Только буквы, цифры, _ и - (2–32 символа)'
          : 'Letters, digits, _ and - only (2–32 chars)'
      );
      return;
    }
    navigate(`/${target}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') goToRoom();
  };

  const openAuthWithPendingRoom = () => {
    const pending = roomInput.trim();
    if (pending) localStorage.setItem(PENDING_ROOM_KEY, pending);
    setIsAuthModalOpen(true);
  };

  const formatActivity = (ts: number) => {
    const diff = Date.now() / 1000 - ts;
    if (diff < 60) return lang === 'RU' ? 'только что' : 'just now';
    if (diff < 3600) return lang === 'RU' ? `${Math.floor(diff / 60)} мин. назад` : `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return lang === 'RU' ? `${Math.floor(diff / 3600)} ч. назад` : `${Math.floor(diff / 3600)}h ago`;
    return lang === 'RU' ? `${Math.floor(diff / 86400)} дн. назад` : `${Math.floor(diff / 86400)}d ago`;
  };

  const steps = lang === 'RU' ? [
    { icon: Monitor, title: 'Откройте на компьютере', desc: 'Зайдите на claytablet.online' },
    { icon: Clipboard, title: 'Скопируйте что угодно', desc: 'Текст, фото, файлы — Ctrl+V или 📎' },
    { icon: Smartphone, title: 'Откройте на телефоне', desc: 'Та же ссылка — всё уже там' },
  ] : [
    { icon: Monitor, title: 'Open on your PC', desc: 'Go to claytablet.online' },
    { icon: Clipboard, title: 'Paste anything', desc: 'Text, photos, files — Ctrl+V or 📎' },
    { icon: Smartphone, title: 'Open on your phone', desc: 'Same link — everything is there' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/30 transition-colors duration-500">
      {/* Top bar */}
      <nav className="flex items-center justify-between px-6 sm:px-10 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30 rotate-3">
            <span className="text-white font-bold text-xl">C</span>
          </div>
          <span className="text-2xl font-black tracking-tight text-slate-800 dark:text-white">
            Clay<span className="text-indigo-600 dark:text-indigo-400">Tablet</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleTheme} className="p-2 text-slate-400 hover:text-amber-500 dark:hover:text-amber-300 transition-colors rounded-xl hover:bg-white/50 dark:hover:bg-slate-800/50">
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <button
            onClick={() => setLang(lang === 'RU' ? 'EN' : 'RU')}
            className="p-2 px-3 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors rounded-xl hover:bg-white/50 dark:hover:bg-slate-800/50 flex items-center gap-1.5 text-sm font-bold"
          >
            <Globe size={16} /> {lang}
          </button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 sm:px-10 pt-10 sm:pt-16 pb-16">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-100/80 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-full text-sm font-medium mb-6 border border-indigo-200/50 dark:border-indigo-700/50">
            <Zap size={14} />
            {lang === 'RU' ? 'Бесплатно и без регистрации' : 'Free, no sign-up required'}
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-tight mb-4">
            {lang === 'RU' ? (
              <>Мгновенный буфер обмена<br /><span className="text-indigo-600 dark:text-indigo-400">между устройствами</span></>
            ) : (
              <>Instant clipboard<br /><span className="text-indigo-600 dark:text-indigo-400">across devices</span></>
            )}
          </h1>

          <p className="text-lg sm:text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed mb-8">
            {lang === 'RU'
              ? 'Скопировал на компьютере — открыл на телефоне. Текст, фото, файлы, голосовые. Никаких проводов.'
              : 'Copy on your PC — open on your phone. Text, photos, files, voice notes. No cables needed.'}
          </p>

          {/* Room creation card */}
          <div className="max-w-lg mx-auto bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-3xl border border-slate-200/60 dark:border-slate-700/60 shadow-xl p-5">
            {/* Main input */}
            <div className={`flex items-center gap-2 bg-slate-50 dark:bg-slate-900 rounded-2xl border-2 transition-all ${
              inputError ? 'border-red-400' : 'border-slate-200 dark:border-slate-700 focus-within:border-indigo-400 dark:focus-within:border-indigo-500'
            }`}>
              <Hash size={18} className="ml-4 text-slate-400 dark:text-slate-500 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={roomInput}
                onChange={e => { setRoomInput(e.target.value); setInputError(''); }}
                onKeyDown={handleKeyDown}
                placeholder={lang === 'RU' ? 'Имя комнаты (или оставь пустым)' : 'Room name (or leave empty)'}
                className="flex-1 py-3.5 bg-transparent text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none text-base font-medium"
                maxLength={32}
                autoComplete="off"
                spellCheck={false}
              />
              <button
                onClick={() => goToRoom()}
                className="mr-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-bold rounded-xl transition-all hover:shadow-lg active:scale-95 flex items-center gap-2 shrink-0"
              >
                {lang === 'RU' ? 'Перейти' : 'Go'}
                <ArrowRight size={16} />
              </button>
            </div>

            {inputError && (
              <p className="mt-2 text-sm text-red-500 text-left px-1">{inputError}</p>
            )}

            {/* Advanced options toggle */}
            <button
              onClick={() => setShowAdvanced(v => !v)}
              className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors py-1"
            >
              {showAdvanced
                ? (lang === 'RU' ? 'Скрыть настройки' : 'Hide options')
                : (lang === 'RU' ? 'Настройки комнаты' : 'Room options')}
              {showAdvanced ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>

            {/* Advanced panel */}
            {showAdvanced && (
              <div className="mt-2 pt-3 border-t border-slate-100 dark:border-slate-700 space-y-3">
                {/* Public/Private toggle */}
                <div className="flex items-center justify-between px-1">
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {isPublic
                        ? (lang === 'RU' ? '🌐 Публичная комната' : '🌐 Public room')
                        : (lang === 'RU' ? '🔒 Приватная комната' : '🔒 Private room')}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {isPublic
                        ? (lang === 'RU' ? 'Видна в разделе «Открытые доски»' : 'Visible in Open Boards')
                        : (lang === 'RU' ? 'Только по ссылке' : 'Accessible by link only')}
                    </p>
                  </div>
                  <button
                    onClick={() => setIsPublic(v => !v)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isPublic ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${isPublic ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                <p className="text-xs text-slate-400 text-center">
                  {lang === 'RU'
                    ? 'Пароль и другие настройки — внутри комнаты в меню «Комната»'
                    : 'Password and more settings — inside the room via «Room» menu'}
                </p>
              </div>
            )}
          </div>

          {/* Sign in button */}
          {!isLoading && !user && (
            <button
              onClick={openAuthWithPendingRoom}
              className="mt-4 px-6 py-2.5 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-300 transition-all hover:shadow-md inline-flex items-center gap-2"
            >
              <LogIn size={16} />
              {lang === 'RU' ? 'Войти, чтобы сохранять комнаты' : 'Sign in to save rooms'}
            </button>
          )}
        </div>

        {/* My Rooms */}
        {user && !roomsLoading && myRooms.length > 0 && (
          <div className="mb-10">
            <h2 className="text-base font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
              {user.picture && <img src={user.picture} alt="" className="w-5 h-5 rounded-full" />}
              {lang === 'RU' ? 'Мои комнаты' : 'My Rooms'}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {myRooms.map(room => (
                <button
                  key={room.id}
                  onClick={() => navigate(`/${room.id}`)}
                  className="text-left p-3.5 bg-white/80 dark:bg-slate-800/60 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 hover:border-indigo-300 hover:shadow-md transition-all group"
                >
                  <div className="font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400 mb-1 truncate group-hover:text-indigo-700 dark:group-hover:text-indigo-300">
                    #{room.id}
                  </div>
                  <div className="text-xs text-slate-400">
                    {room.ttl === 'forever' ? '∞' : room.ttl}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* System rooms */}
        {systemRooms.length > 0 && (
          <div className="mb-10">
            <h2 className="text-base font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
              <span className="text-lg">📌</span>
              {lang === 'RU' ? 'Системные доски' : 'System Boards'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {systemRooms.map(room => (
                <button
                  key={room.id}
                  onClick={() => navigate(`/${room.id}`)}
                  className="text-left p-4 bg-white/70 dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 hover:border-indigo-300 dark:hover:border-indigo-500 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center gap-2.5 mb-2">
                    <span className="text-xl">{room.emoji}</span>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                      {lang === 'RU' ? room.title_ru : room.title_en}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {lang === 'RU' ? room.description_ru : room.description_en}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Public rooms */}
        {publicRooms.length > 0 && (
          <div className="mb-10">
            <h2 className="text-base font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
              <Globe size={16} className="text-green-500" />
              {lang === 'RU' ? 'Открытые доски' : 'Open Boards'}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {publicRooms.map(room => (
                <button
                  key={room.id}
                  onClick={() => navigate(`/${room.id}`)}
                  className="text-left p-3.5 bg-white/80 dark:bg-slate-800/60 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 hover:border-green-300 dark:hover:border-green-700 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="font-mono text-sm font-bold text-slate-700 dark:text-slate-300 truncate group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                      #{room.id}
                    </span>
                    {room.is_protected && <Lock size={11} className="text-amber-400 shrink-0" />}
                  </div>
                  <div className="text-xs text-slate-400">{formatActivity(room.last_activity)}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* How it works */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {steps.map((step, i) => (
            <div key={i} className="relative bg-white/70 dark:bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/60 dark:border-slate-700/60 hover:shadow-lg transition-all hover:-translate-y-0.5 group">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <step.icon size={20} />
              </div>
              <div className="absolute top-6 right-6 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-400 dark:text-slate-500">
                {i + 1}
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">{step.title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">{step.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center pb-8 text-sm text-slate-400 dark:text-slate-600">
        ClayTablet © {new Date().getFullYear()} ·{' '}
        <Link to="/_terms" className="hover:text-slate-600 dark:hover:text-slate-400 transition-colors">
          {lang === 'RU' ? 'Условия' : 'Terms'}
        </Link>
      </footer>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
}
