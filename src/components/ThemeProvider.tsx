'use client';

import { createContext, useContext, useEffect, useSyncExternalStore, ReactNode } from 'react';

interface ThemeContextType {
  isDark: boolean;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextType>({ isDark: false, toggle: () => {} });
const THEME_STORAGE_KEY = 'theme';
const THEME_UPDATED_EVENT = 'address-insights-theme-updated';

function getThemeSnapshot(): boolean {
  if (typeof window === 'undefined') return false;

  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'dark') return true;
  if (stored === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function getThemeServerSnapshot(): boolean {
  return false;
}

function subscribeTheme(onStoreChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  const onStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY) onStoreChange();
  };
  const onMediaChange = () => {
    if (!localStorage.getItem(THEME_STORAGE_KEY)) onStoreChange();
  };
  const onThemeUpdated = () => onStoreChange();

  window.addEventListener('storage', onStorage);
  mediaQuery.addEventListener('change', onMediaChange);
  window.addEventListener(THEME_UPDATED_EVENT, onThemeUpdated);

  return () => {
    window.removeEventListener('storage', onStorage);
    mediaQuery.removeEventListener('change', onMediaChange);
    window.removeEventListener(THEME_UPDATED_EVENT, onThemeUpdated);
  };
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const isDark = useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    getThemeServerSnapshot
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  const toggle = () => {
    const next = !isDark;
    localStorage.setItem(THEME_STORAGE_KEY, next ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', next);
    window.dispatchEvent(new Event(THEME_UPDATED_EVENT));
  };

  return <ThemeContext.Provider value={{ isDark, toggle }}>{children}</ThemeContext.Provider>;
}
