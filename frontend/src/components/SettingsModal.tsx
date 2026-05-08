import { useState, useEffect } from 'react';
import { X, HardDrive, Shield, Clock, Share2, QrCode, Terminal, Copy, Check, EyeOff, Server, Globe } from 'lucide-react';
import type { RoomSettings } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { getCliToken, getBaseUrl, setCustomServer, clearCustomServer, isUsingCustomServer } from '../api';

interface SettingsModalProps {
  isOpen: boolean;
  currentSettings: RoomSettings;
  onClose: () => void;
  onClearAll: () => void;
  onUpdateSettings: (settings: RoomSettings) => void;
  onOpenQR?: () => void;
  onCopyLink?: () => void;
}

export function SettingsModal({ isOpen, currentSettings, onClose, onClearAll, onUpdateSettings, onOpenQR, onCopyLink }: SettingsModalProps) {
  const [selectedTTL, setSelectedTTL] = useState(currentSettings.ttl);
  const [cliToken, setCliToken] = useState<string | null>(null);
  const [tokenCopied, setTokenCopied] = useState(false);
  const [customServerInput, setCustomServerInput] = useState('');
  const [usingCustomServer, setUsingCustomServer] = useState(isUsingCustomServer());
  const { lang, t } = useLanguage();

  const TTL_OPTIONS = [
    { value: '10m', label: lang === 'RU' ? '10 минут' : '10 min' },
    { value: '1h', label: t('oneHour') },
    { value: '24h', label: t('oneDay') },
    { value: '7d', label: t('oneWeek') },
    { value: 'forever', label: t('never') },
  ];

  useEffect(() => {
    if (!isOpen) return;
    getCliToken().then(setCliToken);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCustomServerInput(getBaseUrl());
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUsingCustomServer(isUsingCustomServer());
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const handleTTLChange = (value: string) => {
    setSelectedTTL(value);
    onUpdateSettings({ ttl: value });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/20 dark:bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg border border-slate-100 dark:border-slate-800 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{t('settingsTitle')}</h2>
          <button onClick={onClose} className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 bg-white dark:bg-slate-800 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {/* Share */}
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400 rounded-2xl shrink-0">
              <Share2 size={24} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-800 dark:text-slate-200">{lang === 'RU' ? 'Поделиться' : 'Share'}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-3">
                {lang === 'RU' ? 'Пригласите коллег или перенесите доску на мобильное устройство.' : 'Invite colleagues or move to a mobile device.'}
              </p>
              <div className="flex gap-2">
                <button onClick={() => { onClose(); onCopyLink?.(); }} className="px-4 py-2 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 border border-slate-200 dark:border-slate-700">
                  <Share2 size={16} /> {t('copyLink')}
                </button>
                <button onClick={() => { onClose(); onOpenQR?.(); }} className="px-4 py-2 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 border border-slate-200 dark:border-slate-700">
                  <QrCode size={16} /> {t('showQR')}
                </button>
              </div>
            </div>
          </div>

          <div className="h-px w-full bg-slate-100 dark:bg-slate-800"></div>
          {/* TTL Settings */}
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-50 dark:bg-amber-900/30 text-amber-500 dark:text-amber-400 rounded-2xl shrink-0">
              <Clock size={24} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-800 dark:text-slate-200">{t('autoDeleteLabel')}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-3">
                {lang === 'RU' ? 'После последней активности комната будет автоматически удалена.' : 'The room will be automatically deleted after inactivity.'}
              </p>
              <div className="flex flex-wrap gap-2">
                {TTL_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => handleTTLChange(opt.value)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                      selectedTTL === opt.value
                        ? 'bg-indigo-600 dark:bg-indigo-500 text-white border-indigo-600 dark:border-indigo-500'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="h-px w-full bg-slate-100 dark:bg-slate-800"></div>

          {/* Clear board */}
          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400 rounded-2xl shrink-0">
              <HardDrive size={24} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-800 dark:text-slate-200">{lang === 'RU' ? 'Управление памятью' : 'Storage Management'}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-3">
                {lang === 'RU' ? 'Очистить всю доску (тексты и изображения будут безвозвратно удалены).' : 'Clear the entire board (items will be permanently deleted).'}
              </p>
              <button onClick={onClearAll} className="px-4 py-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm font-medium rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors">
                {t('clearBoardAction')}
              </button>
            </div>
          </div>

          <div className="h-px w-full bg-slate-100 dark:bg-slate-800"></div>

          {/* Password Settings */}
          <div className="flex items-start gap-4">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 dark:text-indigo-400 rounded-2xl shrink-0">
              <Shield size={24} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-800 dark:text-slate-200">{lang === 'RU' ? 'Доступ из Интернет' : 'Access Control'}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-3">
                {currentSettings.is_protected 
                  ? t('protectedRoom') 
                  : (lang === 'RU' ? 'Установите пароль для ограничения доступа.' : 'Set a password to restrict access.')}
              </p>
              <div className="flex gap-2">
                <input 
                  id="new-password-input"
                  type="password" 
                  placeholder={currentSettings.is_protected ? (lang === 'RU' ? "Изменить пароль..." : "Change password...") : (lang === 'RU' ? "Новый пароль..." : "New password...")}
                  className="flex-1 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 focus:border-indigo-400 dark:focus:border-indigo-500 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const val = (e.target as HTMLInputElement).value;
                      if (val) {
                        onUpdateSettings({ ...currentSettings, password: val });
                        (e.target as HTMLInputElement).value = '';
                      }
                    }
                  }}
                />
                <button 
                  onClick={() => {
                    const input = document.getElementById('new-password-input') as HTMLInputElement;
                    if (input && input.value) {
                      onUpdateSettings({ ...currentSettings, password: input.value });
                      input.value = '';
                    }
                  }}
                  className="px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors"
                >
                  {t('saveSettings')}
                </button>
              </div>
              {currentSettings.is_protected && (
                <button 
                  onClick={() => onUpdateSettings({ ...currentSettings, password: "" })}
                  className="mt-2 text-xs text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium"
                >
                  {lang === 'RU' ? 'Удалить пароль и сделать публичной' : 'Remove password and make public'}
                </button>
              )}
            </div>
          </div>

          {/* Read-Only toggle */}
          <>
            <div className="h-px w-full bg-slate-100 dark:bg-slate-800"></div>
            <div className="flex items-start gap-4">
              <div className="p-3 bg-violet-50 dark:bg-violet-900/30 text-violet-500 dark:text-violet-400 rounded-2xl shrink-0">
                <EyeOff size={24} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-800 dark:text-slate-200">{t('readOnlyToggle')}</h3>
                  <button
                    onClick={() => onUpdateSettings({ ...currentSettings, is_readonly: !currentSettings.is_readonly })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                      currentSettings.is_readonly
                        ? 'bg-violet-600 dark:bg-violet-500'
                        : 'bg-slate-200 dark:bg-slate-700'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      currentSettings.is_readonly ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {t('readOnlyToggleDesc')}
                </p>
              </div>
            </div>
          </>

          {/* Public room toggle */}
          {!currentSettings.is_system && (
            <>
              <div className="h-px w-full bg-slate-100 dark:bg-slate-800"></div>
              <div className="flex items-start gap-4">
                <div className="p-3 bg-green-50 dark:bg-green-900/30 text-green-500 dark:text-green-400 rounded-2xl shrink-0">
                  <Globe size={24} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-200">
                      {lang === 'RU' ? 'Публичная комната' : 'Public Room'}
                    </h3>
                    <button
                      onClick={() => onUpdateSettings({ ...currentSettings, is_public: !currentSettings.is_public })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                        currentSettings.is_public
                          ? 'bg-green-500 dark:bg-green-500'
                          : 'bg-slate-200 dark:bg-slate-700'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        currentSettings.is_public ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {lang === 'RU'
                      ? 'Комната будет видна в разделе «Открытые доски» на главной странице'
                      : 'Room will appear in the «Open Boards» section on the home page'}
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Server selector */}
          <div className="h-px w-full bg-slate-100 dark:bg-slate-800"></div>
          <div className="flex items-start gap-4">
            <div className="p-3 bg-teal-50 dark:bg-teal-900/30 text-teal-500 dark:text-teal-400 rounded-2xl shrink-0">
              <Server size={24} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-800 dark:text-slate-200">
                {lang === 'RU' ? 'Сервер' : 'Server'}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-3">
                {usingCustomServer
                  ? (lang === 'RU' ? `Подключён к: ${getBaseUrl()}` : `Connected to: ${getBaseUrl()}`)
                  : (lang === 'RU' ? 'Облачный сервер claytablet.online (по умолчанию)' : 'Cloud server claytablet.online (default)')}
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={lang === 'RU' ? 'http://192.168.1.X:8080' : 'http://192.168.1.X:8080'}
                  value={customServerInput}
                  onChange={(e) => setCustomServerInput(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-teal-100 dark:focus:ring-teal-900 focus:border-teal-400 dark:focus:border-teal-500 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 font-mono"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && customServerInput.trim()) {
                      setCustomServer(customServerInput.trim());
                      setUsingCustomServer(true);
                      window.location.reload();
                    }
                  }}
                />
                <button
                  onClick={() => {
                    if (customServerInput.trim()) {
                      setCustomServer(customServerInput.trim());
                      setUsingCustomServer(true);
                      window.location.reload();
                    }
                  }}
                  className="px-3 py-2 bg-teal-600 dark:bg-teal-500 text-white text-sm font-medium rounded-lg hover:bg-teal-700 dark:hover:bg-teal-600 transition-colors"
                >
                  {lang === 'RU' ? 'Подключить' : 'Connect'}
                </button>
              </div>
              {usingCustomServer && (
                <button
                  onClick={() => { clearCustomServer(); setUsingCustomServer(false); setCustomServerInput(''); window.location.reload(); }}
                  className="mt-2 text-xs text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium"
                >
                  {lang === 'RU' ? '← Вернуться на claytablet.online' : '← Back to claytablet.online'}
                </button>
              )}
            </div>
          </div>
          {cliToken && (
            <>
              <div className="h-px w-full bg-slate-100 dark:bg-slate-800"></div>
              <div className="flex items-start gap-4">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl shrink-0">
                  <Terminal size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-800 dark:text-slate-200">
                    {lang === 'RU' ? 'Токен для CLI' : 'CLI Token'}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-3">
                    {lang === 'RU'
                      ? 'Используй этот токен для входа в claytab на любом устройстве.'
                      : 'Use this token to log in with claytab on any device.'}
                  </p>
                  <div className="flex gap-2 items-center">
                    <code className="flex-1 min-w-0 px-3 py-2 text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg font-mono truncate border border-slate-200 dark:border-slate-700 select-all">
                      {cliToken}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(cliToken);
                        setTokenCopied(true);
                        setTimeout(() => setTokenCopied(false), 2000);
                      }}
                      className="shrink-0 p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
                      title={lang === 'RU' ? 'Скопировать' : 'Copy'}
                    >
                      {tokenCopied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 font-mono">
                    claytab config --token &lt;токен&gt;
                  </p>
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
