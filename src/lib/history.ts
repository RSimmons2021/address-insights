import { SearchHistoryItem } from '@/types';

const STORAGE_KEY = 'address-insights-history';
const HISTORY_UPDATED_EVENT = 'address-insights-history-updated';
const MAX_ITEMS = 10;
const EMPTY_HISTORY: SearchHistoryItem[] = [];

let cachedRawHistory: string | null | undefined;
let cachedParsedHistory: SearchHistoryItem[] = EMPTY_HISTORY;

function emitHistoryUpdated(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(HISTORY_UPDATED_EVENT));
}

export function getSearchHistory(): SearchHistoryItem[] {
  if (typeof window === 'undefined') return EMPTY_HISTORY;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === cachedRawHistory) return cachedParsedHistory;

    cachedRawHistory = raw;
    if (!raw) {
      cachedParsedHistory = EMPTY_HISTORY;
      return cachedParsedHistory;
    }

    const parsed = JSON.parse(raw);
    cachedParsedHistory = Array.isArray(parsed) ? parsed : EMPTY_HISTORY;
    return cachedParsedHistory;
  } catch {
    return cachedParsedHistory;
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
    cachedRawHistory = undefined;
    emitHistoryUpdated();
  } catch {
    // localStorage might be full or unavailable
  }
}

export function clearHistory(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    cachedRawHistory = undefined;
    emitHistoryUpdated();
  } catch {
    // ignore
  }
}

export function getSearchHistoryServerSnapshot(): SearchHistoryItem[] {
  return EMPTY_HISTORY;
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
