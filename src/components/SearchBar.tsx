'use client';

import { useState, useEffect, useRef, useCallback, useId } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { searchAddresses, geocodeAddress } from '@/lib/geocode';
import { addToHistory } from '@/lib/history';
import { GeocodeSuggestion } from '@/types';

export default function SearchBar() {
  const router = useRouter();
  const inputId = useId();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>(undefined);
  const queryHasAddressNumber = /\d/.test(query);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      setHasSearched(false);
      return;
    }
    setLoading(true);
    setHasSearched(false);
    try {
      const results = await searchAddresses(q);
      setSuggestions(results);
      setShowSuggestions(true);
    } catch (err) {
      console.error('Autocomplete error:', err);
      setSuggestions([]);
    } finally {
      setHasSearched(true);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, fetchSuggestions]);

  const navigateToInsights = (placeName: string, lat: number, lng: number) => {
    addToHistory({ address: placeName, lat, lng });
    setShowSuggestions(false);
    setStatusMessage(null);
    const params = new URLSearchParams({
      address: placeName,
      lat: lat.toString(),
      lng: lng.toString(),
    });
    router.push(`/insights?${params.toString()}`);
  };

  const handleSelectSuggestion = (suggestion: GeocodeSuggestion) => {
    navigateToInsights(suggestion.placeName, suggestion.lat, suggestion.lng);
  };

  // Direct geocode lookup when user presses Enter without picking a suggestion
  const handleDirectSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      // First try to use an existing suggestion
      if (suggestions.length > 0) {
        const pick = suggestions[selectedIndex >= 0 ? selectedIndex : 0];
        navigateToInsights(pick.placeName, pick.lat, pick.lng);
        return;
      }
      // Otherwise do a direct geocode
      const result = await geocodeAddress(query);
      if (result) {
        navigateToInsights(result.displayName, result.lat, result.lng);
      } else {
        setStatusMessage('No results found. Try adding city and state.');
      }
    } catch (err) {
      console.error('Search error:', err);
      setStatusMessage('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        handleSelectSuggestion(suggestions[selectedIndex]);
      } else {
        handleDirectSearch();
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div className="w-full max-w-[600px] relative z-20">
      <label
        htmlFor={inputId}
        className="block text-sm font-semibold mb-3 px-2"
        style={{ color: 'var(--text-secondary)' }}
      >
        Address search
      </label>
      <motion.div
        className="w-full h-[72px] flex items-center px-6 border border-white/50"
        style={{
          background: 'var(--bg-search)',
          backdropFilter: 'blur(20px)',
          borderRadius: '100px',
          boxShadow: 'var(--shadow-float)',
        }}
        whileHover={{ scale: 1.01 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        <svg
          className="w-6 h-6 mr-4 shrink-0"
          style={{ color: 'var(--text-secondary)' }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.5"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          id={inputId}
          ref={inputRef}
          type="text"
          placeholder="Enter an address, neighborhood, or city"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedIndex(-1);
            setStatusMessage(null);
            setHasSearched(false);
            if (e.target.value.trim().length >= 3) setShowSuggestions(true);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => query.trim().length >= 3 && setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          className="flex-1 border-none bg-transparent text-xl font-medium outline-none placeholder:text-[var(--text-secondary)]"
          style={{ color: 'var(--text-primary)' }}
          aria-label="Search for an address"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={showSuggestions}
          aria-activedescendant={
            selectedIndex >= 0 ? `${listboxId}-option-${selectedIndex}` : undefined
          }
          aria-haspopup="listbox"
          role="combobox"
        />
        {loading && (
          <div className="w-5 h-5 border-2 border-[var(--text-secondary)] border-t-transparent rounded-full animate-spin mr-3" />
        )}
        <motion.button
          onClick={handleDirectSearch}
          className="w-12 h-12 rounded-full flex items-center justify-center cursor-pointer shrink-0"
          style={{ background: 'var(--color-inverse-bg)' }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          disabled={loading || !query.trim()}
          aria-disabled={loading || !query.trim()}
          aria-label="Search"
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--color-inverse-text)' }}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
              d="M14 5l7 7m0 0l-7 7m7-7H3"
            />
          </svg>
        </motion.button>
      </motion.div>

      <AnimatePresence>
        {showSuggestions &&
          query.trim().length >= 3 &&
          (suggestions.length > 0 || loading || (hasSearched && queryHasAddressNumber)) && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full mt-3 w-full overflow-hidden"
            style={{
              background: 'var(--bg-overlay)',
              backdropFilter: 'blur(20px)',
              borderRadius: '24px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
            id={listboxId}
            role="listbox"
            aria-label="Address suggestions"
          >
            {suggestions.length > 0 ? (
              suggestions.map((s, i) => (
                <motion.button
                  id={`${listboxId}-option-${i}`}
                  key={s.id}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleSelectSuggestion(s)}
                  className="w-full px-6 py-4 cursor-pointer flex items-center gap-3 transition-colors text-left"
                  style={{
                    background: i === selectedIndex ? 'var(--bg-surface)' : 'transparent',
                    borderBottom: i < suggestions.length - 1 ? '1px solid var(--divider)' : 'none',
                  }}
                  whileHover={{ backgroundColor: 'var(--bg-surface)' }}
                  role="option"
                  aria-selected={i === selectedIndex}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm"
                    style={{ background: 'var(--bg-surface)' }}
                  >
                    📍
                  </div>
                  <span className="text-[15px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {s.placeName}
                  </span>
                </motion.button>
              ))
            ) : loading ? (
              <div className="px-6 py-5 text-sm flex items-center gap-3" style={{ color: 'var(--text-secondary)' }}>
                <div className="w-4 h-4 border-2 border-[var(--text-secondary)] border-t-transparent rounded-full animate-spin" />
                <p role="status" aria-live="polite">Searching suggestions...</p>
              </div>
            ) : (
              <div className="px-6 py-5 text-sm flex items-center gap-3" style={{ color: 'var(--text-secondary)' }}>
                <span aria-hidden="true">🔎</span>
                <p role="status" aria-live="polite">
                  No suggestions for &quot;{query.trim()}&quot;. Press Enter to run a full search.
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {statusMessage && (
        <p
          className="mt-3 px-4 text-sm"
          style={{ color: 'var(--text-secondary)' }}
          role="status"
          aria-live="polite"
        >
          {statusMessage}
        </p>
      )}
    </div>
  );
}
