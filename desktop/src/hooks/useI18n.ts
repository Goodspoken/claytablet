import { useState, useEffect, useCallback } from 'react';
import { getSetting, setSetting } from '../services/store';
import type { Language } from '../i18n';
import { translations } from '../i18n';

export function useI18n() {
  const [lang, setLangState] = useState<Language>('RU');

  useEffect(() => {
    getSetting<Language>('lang', 'RU').then(setLangState);
  }, []);

  const t = useCallback((key: keyof typeof translations.RU): string => {
    return (translations[lang] as Record<string, string>)[key] ?? key;
  }, [lang]);

  const setLang = useCallback(async (l: Language) => {
    await setSetting('lang', l);
    setLangState(l);
  }, []);

  return { lang, t, setLang };
}
