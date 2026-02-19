'use client';

import { motion } from 'framer-motion';
import SearchBar from '@/components/SearchBar';
import RecentSearches from '@/components/RecentSearches';
import HistoryDrawer from '@/components/HistoryDrawer';
import DarkModeButton from '@/components/DarkModeButton';
import BrandLogo from '@/components/BrandLogo';

export default function LandingPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{
        background: 'linear-gradient(180deg, var(--bg-gradient-start) 0%, var(--bg-gradient-end) 100%)',
      }}
    >
      {/* Top actions */}
      <div className="fixed top-6 left-6 z-50">
        <BrandLogo />
      </div>
      <div className="fixed top-6 right-6 z-50 flex items-center gap-3">
        <HistoryDrawer />
        <DarkModeButton />
      </div>
      {/* Hero orbs */}
      <div className="flex gap-6 mb-12">
        <motion.div
          className="w-[100px] h-[100px] rounded-[32px] text-[40px] flex items-center justify-center text-white font-bold animate-float"
          style={{
            background: 'var(--clay-green)',
            boxShadow:
              'inset 2px 2px 4px rgba(255,255,255,0.4), inset -2px -2px 4px rgba(0,0,0,0.1), 0 8px 16px rgba(0,0,0,0.15)',
          }}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, type: 'spring' }}
        >
          🚶
        </motion.div>
        <motion.div
          className="w-[120px] h-[120px] rounded-[40px] text-[48px] flex items-center justify-center text-white font-bold animate-float-delayed -mt-5"
          style={{
            background: 'var(--clay-blue)',
            boxShadow:
              'inset 2px 2px 4px rgba(255,255,255,0.4), inset -2px -2px 4px rgba(0,0,0,0.1), 0 8px 16px rgba(0,0,0,0.15)',
          }}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, type: 'spring' }}
        >
          🚗
        </motion.div>
        <motion.div
          className="w-[90px] h-[90px] rounded-[30px] text-[32px] flex items-center justify-center text-white font-bold animate-float-delayed-2"
          style={{
            background: 'var(--clay-orange)',
            boxShadow:
              'inset 2px 2px 4px rgba(255,255,255,0.4), inset -2px -2px 4px rgba(0,0,0,0.1), 0 8px 16px rgba(0,0,0,0.15)',
          }}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, type: 'spring' }}
        >
          🏙️
        </motion.div>
      </div>

      {/* Headline */}
      <motion.h1
        className="text-center mb-8 text-5xl font-bold tracking-tight"
        style={{ color: 'var(--text-primary)', letterSpacing: '-1px' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        Where life happens.
      </motion.h1>

      <motion.p
        className="text-center mb-10 text-lg max-w-md"
        style={{ color: 'var(--text-secondary)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        Type an address and get a neighborhood pulse with scores, amenities, and leaseability insights.
      </motion.p>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="w-full flex justify-center"
      >
        <SearchBar />
      </motion.div>

      {/* Recent searches */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        <RecentSearches />
      </motion.div>
    </div>
  );
}
