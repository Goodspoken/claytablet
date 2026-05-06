import { useState, useEffect } from 'react';
import { getSetting, setSetting } from '../services/store';
import { getBaseUrl, setBaseUrl } from '../services/api';
import type { Language } from '../i18n';
import { useI18n } from '../hooks/useI18n';

export default function Settings({ onClose }: { onClose?: () => void }) {
  const { lang, setLang } = useI18n();
  const [serverUrl, setServerUrlState] = useState('https://claytablet.online');
  const [room, setRoomState] = useState('default');
  const [theme, setThemeState] = useState<'light' | 'dark' | 'system'>('system');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([
      getBaseUrl(),
      getSetting<string>('currentRoom', 'default'),
      getSetting<'light' | 'dark' | 'system'>('theme', 'system'),
    ]).then(([url, currentRoom, currentTheme]) => {
      setServerUrlState(url);
      setRoomState(currentRoom);
      setThemeState(currentTheme);
    });
  }, []);

  const handleSave = async () => {
    await setBaseUrl(serverUrl.trim() || 'https://claytablet.online');
    await setSetting('currentRoom', room.trim() || 'default');
    await setSetting('theme', theme);
    applyTheme(theme);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const applyTheme = (t: 'light' | 'dark' | 'system') => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const dark = t === 'dark' || (t === 'system' && prefersDark);
    document.documentElement.classList.toggle('dark', dark);
  };

  return (
    <div className="h-screen bg-slate-50 dark:bg-slate-900 font-sans overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-800 dark:text-white">Настройки</h1>
        {onClose && (
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            ✕
          </button>
        )}
      </div>

      <div className="max-w-md mx-auto px-6 py-6 space-y-6">
        {/* Server URL */}
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Сервер</label>
          <input
            value={serverUrl}
            onChange={e => setServerUrlState(e.target.value)}
            placeholder="https://claytablet.online"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-400/50"
          />
          <p className="text-xs text-slate-400">По умолчанию: https://claytablet.online</p>
        </div>

        {/* Current Room */}
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Текущая комната</label>
          <input
            value={room}
            onChange={e => setRoomState(e.target.value)}
            placeholder="default"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-400/50"
          />
        </div>

        {/* Theme */}
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Тема</label>
          <div className="flex gap-2">
            {(['light', 'dark', 'system'] as const).map(t => (
              <button
                key={t}
                onClick={() => setThemeState(t)}
                className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-colors ${
                  theme === t
                    ? 'bg-indigo-500 border-indigo-500 text-white'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-300'
                }`}
              >
                {t === 'light' ? '☀️ Светлая' : t === 'dark' ? '🌙 Тёмная' : '🖥 Системная'}
              </button>
            ))}
          </div>
        </div>

        {/* Language */}
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Язык</label>
          <div className="flex gap-2">
            {(['RU', 'EN'] as Language[]).map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-colors ${
                  lang === l
                    ? 'bg-indigo-500 border-indigo-500 text-white'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-300'
                }`}
              >
                {l === 'RU' ? '🇷🇺 Русский' : '🇬🇧 English'}
              </button>
            ))}
          </div>
        </div>

        {/* Shortcuts info */}
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 space-y-2">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Горячие клавиши</p>
          <div className="space-y-1.5 text-sm text-slate-600 dark:text-slate-400">
            <div className="flex justify-between items-center">
              <span>Открыть Quick Paste</span>
              <kbd className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-xs font-mono">Ctrl+Shift+V</kbd>
            </div>
            <div className="flex justify-between items-center">
              <span>Отправить буфер в комнату</span>
              <kbd className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-xs font-mono">Ctrl+Shift+C</kbd>
            </div>
          </div>
        </div>

        {/* Autostart — TODO */}
        <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Автозапуск при старте</p>
              <p className="text-xs text-slate-400 mt-0.5">Запускать ClayTablet вместе с системой</p>
            </div>
            {/* TODO: implement with tauri-plugin-autostart */}
            <button
              disabled
              className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-400 text-xs font-medium cursor-not-allowed"
              title="Скоро — tauri-plugin-autostart"
            >
              TODO
            </button>
          </div>
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
            saved
              ? 'bg-green-500 text-white'
              : 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-indigo-900/50'
          }`}
        >
          {saved ? '✓ Сохранено' : 'Сохранить'}
        </button>
      </div>
    </div>
  );
}
