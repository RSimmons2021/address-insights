'use client';

import { useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  getSearchHistory,
  getSearchHistoryServerSnapshot,
  subscribeSearchHistory,
} from '@/lib/history';

const DEFAULT_SUGGESTIONS = [
  { label: 'Hayes Valley, SF', address: 'Hayes Valley, San Francisco, CA', lat: 37.7759, lng: -122.4245 },
  { label: 'Williamsburg, BK', address: 'Williamsburg, Brooklyn, NY', lat: 40.7081, lng: -73.9571 },
  { label: 'Silver Lake, LA', address: 'Silver Lake, Los Angeles, CA', lat: 34.0869, lng: -118.2702 },
];

export default function RecentSearches() {
  const router = useRouter();
  const history = useSyncExternalStore(
    subscribeSearchHistory,
    getSearchHistory,
    getSearchHistoryServerSnapshot
  );

  const navigateTo = (address: string, lat: number, lng: number) => {
    const params = new URLSearchParams({
      address,
      lat: lat.toString(),
      lng: lng.toString(),
    });
    router.push(`/insights?${params.toString()}`);
  };

  const handleHistoryClick = (item: (typeof history)[number]) => {
    navigateTo(item.address, item.lat, item.lng);
  };

  const shortLabel = (address: string) => {
    const parts = address.split(',');
    return parts.length > 1 ? `${parts[0]}, ${parts[1].trim().split(' ')[0]}` : parts[0];
  };

  // Show history if it exists, otherwise show default suggestions
  const hasHistory = history.length > 0;

  return (
    <div className="flex gap-3 justify-center mt-6 flex-wrap">
      <span
        className="text-xs font-semibold uppercase tracking-wide self-center"
        style={{ color: 'var(--text-secondary)' }}
      >
        {hasHistory ? 'Recent' : 'Try'}
      </span>

      {hasHistory
        ? history.slice(0, 4).map((item, i) => (
            <motion.button
              key={item.timestamp}
              onClick={() => handleHistoryClick(item)}
              className="px-5 py-2.5 text-sm font-medium cursor-pointer border border-white/40"
              style={{
                background: 'var(--bg-pill)',
                borderRadius: '100px',
                color: 'var(--text-primary)',
              }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 + 0.3 }}
              whileHover={{
                background: 'var(--bg-pill-hover)',
                y: -2,
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
              }}
            >
              {shortLabel(item.address)}
            </motion.button>
          ))
        : DEFAULT_SUGGESTIONS.map((s, i) => (
            <motion.button
              key={s.label}
              onClick={() => navigateTo(s.address, s.lat, s.lng)}
              className="px-5 py-2.5 text-sm font-medium cursor-pointer border border-white/40"
              style={{
                background: 'var(--bg-pill)',
                borderRadius: '100px',
                color: 'var(--text-primary)',
              }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 + 0.3 }}
              whileHover={{
                background: 'var(--bg-pill-hover)',
                y: -2,
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
              }}
            >
              {s.label}
            </motion.button>
          ))}
    </div>
  );
}
