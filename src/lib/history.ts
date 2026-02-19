import { SearchHistoryItem } from '@/types';

const STORAGE_KEY = 'address-insights-history';
const MAX_ITEMS = 10;

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
  } catch {
    // localStorage might be full or unavailable
  }
}

export function clearHistory(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
