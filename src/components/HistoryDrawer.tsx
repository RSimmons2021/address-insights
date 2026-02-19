'use client';

import { useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getSearchHistory,
  getSearchHistoryServerSnapshot,
  clearHistory,
  subscribeSearchHistory,
} from '@/lib/history';

export default function HistoryDrawer() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const history = useSyncExternalStore(
    subscribeSearchHistory,
    getSearchHistory,
    getSearchHistoryServerSnapshot
  );

  const handleClick = (item: (typeof history)[number]) => {
    const params = new URLSearchParams({
      address: item.address,
      lat: item.lat.toString(),
      lng: item.lng.toString(),
    });
    router.push(`/insights?${params.toString()}`);
    setOpen(false);
  };

  const handleClear = () => {
    clearHistory();
  };

  const shortLabel = (address: string) => {
    const parts = address.split(',');
    return parts.length > 1 ? `${parts[0]},${parts[1]}` : parts[0];
  };

  const formatTimestamp = (ts: number) => {
    return new Date(ts).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <>
      {/* Toggle button */}
      <motion.button
        onClick={() => setOpen(!open)}
        className="w-11 h-11 rounded-full flex items-center justify-center cursor-pointer"
        style={{
          background: 'var(--bg-card)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Search history"
      >
        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--text-primary)' }}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </motion.button>

      {/* Drawer overlay */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              style={{ background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(4px)' }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed top-0 right-0 h-full w-[360px] max-w-[90vw] z-50 flex flex-col"
              style={{
                background: 'var(--bg-overlay)',
                backdropFilter: 'blur(30px)',
                boxShadow: '-20px 0 60px rgba(0,0,0,0.1)',
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--divider)' }}>
                <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  Recent Searches
                </h2>
                <button
                  onClick={() => setOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
                  style={{ background: 'var(--bg-surface)' }}
                  aria-label="Close history"
                >
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {history.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full gap-3">
                    <span className="text-3xl">🔍</span>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      No recent searches yet
                    </p>
                  </div>
                )}
                {history.map((item, i) => (
                  <motion.button
                    key={item.timestamp}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => handleClick(item)}
                    className="w-full flex items-center gap-3 p-4 rounded-2xl cursor-pointer text-left transition-colors"
                    style={{ background: 'transparent' }}
                    whileHover={{ backgroundColor: 'var(--bg-surface)' }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg"
                      style={{ background: 'var(--bg-surface)' }}
                    >
                      📍
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-semibold block truncate" style={{ color: 'var(--text-primary)' }}>
                        {shortLabel(item.address)}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {formatTimestamp(item.timestamp)}
                      </span>
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* Footer */}
              {history.length > 0 && (
                <div className="p-4 border-t" style={{ borderColor: 'var(--divider)' }}>
                  <button
                    onClick={handleClear}
                    className="w-full py-3 rounded-2xl text-sm font-semibold cursor-pointer transition-colors"
                    style={{ background: 'var(--bg-surface)', color: 'var(--clay-red)' }}
                  >
                    Clear History
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
