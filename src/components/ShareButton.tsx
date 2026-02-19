'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createSnapshot } from '@/lib/snapshots';
import { InsightSnapshotPayload } from '@/types';

interface ShareButtonProps {
  snapshotPayload?: InsightSnapshotPayload | null;
}

export default function ShareButton({ snapshotPayload }: ShareButtonProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [isSavingSnapshot, setIsSavingSnapshot] = useState(false);

  const showMessage = (text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(null), 2400);
  };

  const copyText = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const input = document.createElement('input');
      input.value = value;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }
  };

  const handleShare = async () => {
    const fallbackUrl = window.location.href;

    try {
      let shareUrl = fallbackUrl;
      let successMessage = 'Link copied!';

      if (snapshotPayload) {
        setIsSavingSnapshot(true);
        const snapshot = await createSnapshot(snapshotPayload);
        shareUrl = `${window.location.origin}/insights?snapshot=${snapshot.id}`;
        successMessage = 'Snapshot link copied!';
      }

      await copyText(shareUrl);
      showMessage(successMessage);
    } catch (error) {
      try {
        await copyText(fallbackUrl);
        showMessage('Snapshot unavailable. Copied live link.');
      } catch {
        showMessage(
          error instanceof Error ? error.message : 'Share failed. Please try again.'
        );
      }
    } finally {
      setIsSavingSnapshot(false);
    }
  };

  return (
    <div className="relative">
      <motion.button
        onClick={handleShare}
        className="w-11 h-11 rounded-full flex items-center justify-center cursor-pointer"
        style={{
          background: 'var(--bg-card)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Share this page"
        disabled={isSavingSnapshot}
        aria-disabled={isSavingSnapshot}
      >
        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--text-primary)' }}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
          />
        </svg>
      </motion.button>

      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.9 }}
            className="absolute top-full mt-2 right-0 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap"
            style={{
              background: 'var(--color-inverse-bg)',
              color: 'var(--color-inverse-text)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            }}
          >
            {message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
