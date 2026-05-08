import { useSyncExternalStore, useCallback } from 'react';
import { getSetting, setSetting } from '../services/store';

export type ThemeMode = 'light' | 'dark' | 'system';

let _theme: ThemeMode = 'system';
let _initialized = false;
const _listeners = new Set<() => void>();

const notify = () => _listeners.forEach(fn => fn());

const applyToDocument = (mode: ThemeMode) => {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const dark = mode === 'dark' || (mode === 'system' && prefersDark);
  document.documentElement.classList.toggle('dark', dark);
};

const ensureInit = () => {
  if (_initialized) return;
  _initialized = true;
  getSetting<ThemeMode>('theme', 'system').then(t => {
    _theme = t;
    applyToDocument(t);
    notify();
  });
  // Re-apply when system preference changes (only relevant when mode='system')
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', () => {
    if (_theme === 'system') applyToDocument('system');
  });
};

const subscribe = (cb: () => void) => {
  ensureInit();
  _listeners.add(cb);
  return () => { _listeners.delete(cb); };
};

const getSnapshot = () => _theme;

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const setTheme = useCallback(async (t: ThemeMode) => {
    _theme = t;
    applyToDocument(t);
    notify();
    await setSetting('theme', t);
  }, []);

  return { theme, setTheme };
}
