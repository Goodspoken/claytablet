import { useState, useEffect, useCallback } from 'react';
import { Puzzle, RefreshCw, ChevronDown, ChevronUp, CheckCircle, XCircle, Loader, Lock } from 'lucide-react';
import axios from 'axios';
import { getPlugins, getPluginConfig, setPluginConfig } from '../api';
import type { PluginInfo } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

export function PluginsPanel() {
  const { t, lang } = useLanguage();
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [configs, setConfigs] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setAuthError(false);
    try {
      const data = await getPlugins();
      setPlugins(data);
    } catch (e) {
      const status = axios.isAxiosError(e) ? e.response?.status : 0;
      if (status === 401 || status === 403) setAuthError(true);
      setPlugins([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (!configs[id]) {
      try {
        const cfg = await getPluginConfig(id);
        setConfigs(prev => ({ ...prev, [id]: JSON.stringify(cfg, null, 2) }));
      } catch {
        setConfigs(prev => ({ ...prev, [id]: '{}' }));
      }
    }
  };

  const handleEditStart = (id: string) => {
    setEditingId(id);
    setEditValue(configs[id] ?? '{}');
    setSaveError('');
  };

  const handleSave = async (id: string) => {
    setSaving(true);
    setSaveError('');
    try {
      const parsed = JSON.parse(editValue);
      await setPluginConfig(id, parsed);
      setConfigs(prev => ({ ...prev, [id]: JSON.stringify(parsed, null, 2) }));
      setEditingId(null);
    } catch (e) {
      setSaveError(e instanceof SyntaxError ? 'Невалидный JSON' : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-slate-400 gap-2">
        <Loader size={16} className="animate-spin" />
        <span className="text-sm">{t('loading')}</span>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="rounded-xl border border-dashed border-amber-300 dark:border-amber-700 p-6 text-center bg-amber-50/50 dark:bg-amber-900/10">
        <Lock size={24} className="mx-auto mb-2 text-amber-500" />
        <p className="text-sm text-slate-700 dark:text-slate-200 font-medium">
          {lang === 'RU' ? 'Управление плагинами доступно только администратору' : 'Plugin management is admin-only'}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {lang === 'RU'
            ? 'Войдите как владелец сервера или установите свой ID в PLUGIN_ADMINS.'
            : 'Sign in as the server owner or list your user ID in PLUGIN_ADMINS.'}
        </p>
      </div>
    );
  }

  if (plugins.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 p-6 text-center">
        <Puzzle size={28} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Плагины не установлены</p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
          Добавь папку плагина в <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">plugins/</code> и перезапусти сервер
        </p>
        <a
          href="https://github.com/claytablet/claytablet/blob/main/plugins/PLUGIN_API.md"
          target="_blank"
          rel="noreferrer"
          className="inline-block mt-3 text-xs text-indigo-500 hover:underline"
        >
          Документация Plugin API →
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-slate-400">{plugins.length} плагин{plugins.length === 1 ? '' : plugins.length < 5 ? 'а' : 'ов'}</span>
        <button
          onClick={load}
          className="p-1 text-slate-400 hover:text-indigo-500 transition-colors rounded"
          title="Обновить"
        >
          <RefreshCw size={13} />
        </button>
      </div>

      {plugins.map(plugin => {
        const isLoaded = plugin.status === 'loaded';
        const isExpanded = expandedId === plugin.id;
        const isEditing = editingId === plugin.id;

        return (
          <div
            key={plugin.id}
            className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
          >
            {/* Header row */}
            <button
              onClick={() => handleExpand(plugin.id)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
            >
              {isLoaded
                ? <CheckCircle size={15} className="text-green-500 flex-shrink-0" />
                : <XCircle size={15} className="text-red-500 flex-shrink-0" />
              }
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{plugin.name}</span>
                  <span className="text-xs text-slate-400 font-mono">v{plugin.version}</span>
                  <span className="text-xs text-slate-400">by {plugin.author}</span>
                </div>
                {plugin.description && (
                  <p className="text-xs text-slate-400 truncate mt-0.5">{plugin.description}</p>
                )}
                {!isLoaded && (
                  <p className="text-xs text-red-400 mt-0.5 truncate">{plugin.status}</p>
                )}
              </div>
              {isExpanded
                ? <ChevronUp size={14} className="text-slate-400 flex-shrink-0" />
                : <ChevronDown size={14} className="text-slate-400 flex-shrink-0" />
              }
            </button>

            {/* Config section */}
            {isExpanded && (
              <div className="border-t border-slate-100 dark:border-slate-700 px-4 py-3 bg-slate-50/50 dark:bg-slate-800/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    config.json
                  </span>
                  <div className="flex gap-2">
                    {!isEditing ? (
                      <button
                        onClick={() => handleEditStart(plugin.id)}
                        className="text-xs px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                      >
                        Редактировать
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => { setEditingId(null); setSaveError(''); }}
                          className="text-xs px-2 py-1 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                          Отмена
                        </button>
                        <button
                          onClick={() => handleSave(plugin.id)}
                          disabled={saving}
                          className="text-xs px-2 py-1 rounded-lg bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white transition-colors"
                        >
                          {saving ? '...' : 'Сохранить'}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {saveError && (
                  <p className="text-xs text-red-500 mb-2">{saveError}</p>
                )}

                {isEditing ? (
                  <textarea
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    className="w-full h-40 px-3 py-2 font-mono text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-400/50 resize-y"
                    spellCheck={false}
                  />
                ) : (
                  <pre className="text-xs font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 rounded-lg p-3 overflow-x-auto max-h-40 overflow-y-auto">
                    {configs[plugin.id] ?? '{}'}
                  </pre>
                )}

                {/* Plugin endpoints hint */}
                <p className="text-xs text-slate-400 mt-2">
                  Эндпоинты: <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">/api/plugins/{plugin.id}/…</code>
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
