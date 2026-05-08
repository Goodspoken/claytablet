import { useSyncExternalStore, useCallback } from 'react';
import { getSetting, setSetting } from '../services/store';
import type { Language } from '../i18n';
import { translations } from '../i18n';

let _lang: Language = 'RU';
let _initialized = false;
const _listeners = new Set<() => void>();

const notify = () => _listeners.forEach(fn => fn());

const ensureInit = () => {
  if (_initialized) return;
  _initialized = true;
  getSetting<Language>('lang', 'RU').then(l => {
    if (l !== _lang) {
      _lang = l;
      notify();
    }
  });
};

const subscribe = (cb: () => void) => {
  ensureInit();
  _listeners.add(cb);
  return () => { _listeners.delete(cb); };
};

const getSnapshot = () => _lang;

export function useI18n() {
  const lang = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const t = useCallback(
    (key: keyof typeof translations.RU): string =>
      (translations[lang] as Record<string, string>)[key] ?? key,
    [lang]
  );

  const setLang = useCallback(async (l: Language) => {
    await setSetting('lang', l);
    _lang = l;
    notify();
  }, []);

  return { lang, t, setLang };
}
