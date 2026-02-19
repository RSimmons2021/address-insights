import { SearchHistoryItem } from '@/types';

const STORAGE_KEY = 'address-insights-history';
const HISTORY_UPDATED_EVENT = 'address-insights-history-updated';
const MAX_ITEMS = 10;

function emitHistoryUpdated(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(HISTORY_UPDATED_EVENT));
}

export function getSearchHistory(): SearchHistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addToHistory(item: Omit<SearchHistoryItem, 'timestamp'>): void {
  if (typeof window === 'undefined') return;
  try {
    const history = getSearchHistory();
    // Remove duplicate if exists
    const filtered = history.filter(
      (h) => h.address.toLowerCase() !== item.address.toLowerCase()
    );
    // Add to front
    filtered.unshift({ ...item, timestamp: Date.now() });
    // Limit size
    const trimmed = filtered.slice(0, MAX_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    emitHistoryUpdated();
  } catch {
    // localStorage might be full or unavailable
  }
}

export function clearHistory(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    emitHistoryUpdated();
  } catch {
    // ignore
  }
}

export function subscribeSearchHistory(onStoreChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) onStoreChange();
  };

  window.addEventListener('storage', onStorage);
  window.addEventListener(HISTORY_UPDATED_EVENT, onStoreChange);

  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(HISTORY_UPDATED_EVENT, onStoreChange);
  };
}
