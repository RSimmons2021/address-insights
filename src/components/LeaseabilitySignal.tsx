'use client';

import { useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { LeaseabilityBreakdown } from '@/types';

interface LeaseabilitySignalProps {
  breakdown: LeaseabilityBreakdown;
  walkScore: number;
  driveScore: number;
  amenityCount: number;
}

export default function LeaseabilitySignal({
  breakdown,
  walkScore,
  driveScore,
  amenityCount,
}: LeaseabilitySignalProps) {
  const leaseabilityAccent = 'var(--clay-yellow)';
  const leaseabilityAccentBg = 'rgba(255, 204, 0, 0.2)';
  const [opsMode, setOpsMode] = useState(false);
  const motionScore = useMotionValue(0);
  const displayScore = useTransform(motionScore, (v) => Math.round(v));
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const controls = animate(motionScore, breakdown.score, {
      duration: 1.5,
      ease: [0.34, 1.56, 0.64, 1],
      delay: 0.8,
    });
    return () => controls.stop();
  }, [breakdown.score, motionScore]);

  useEffect(() => {
    const unsubscribe = displayScore.on('change', (v) => setDisplayValue(v));
    return unsubscribe;
  }, [displayScore]);

  const getBarColor = (score: number) => {
    if (score >= 70) return 'linear-gradient(90deg, #FFD60A, #FFCC00)';
    if (score >= 40) return 'linear-gradient(90deg, #FFD60A, #FFB800)';
    return 'linear-gradient(90deg, #FFC300, #FF9500)';
  };

  const getSignalLabel = (score: number) => {
    if (score >= 80) return 'Strong Signal';
    if (score >= 60) return 'Moderate Signal';
    if (score >= 40) return 'Weak Signal';
    return 'Low Signal';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7 }}
      className="rounded-[20px] overflow-hidden"
      style={{ background: 'var(--bg-surface)' }}
    >
      {/* Header */}
      <div className="p-5 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <span
              className="text-xs uppercase tracking-wide font-semibold block mb-1"
              style={{ color: 'var(--text-secondary)' }}
            >
              Leaseability Signal
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                {displayValue}
              </span>
              <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                / 100
              </span>
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full ml-1"
                style={{
                  background: leaseabilityAccentBg,
                  color: leaseabilityAccent,
                }}
              >
                {getSignalLabel(breakdown.score)}
              </span>
            </div>
          </div>
          {/* Ops toggle */}
          <button
            onClick={() => setOpsMode(!opsMode)}
            className="text-xs font-semibold px-3 py-1.5 rounded-full cursor-pointer transition-all"
            style={{
              background: opsMode ? 'var(--color-inverse-bg)' : 'var(--bg-card)',
              color: opsMode ? 'var(--color-inverse-text)' : 'var(--text-secondary)',
              border: '1px solid var(--divider)',
            }}
          >
            {opsMode ? 'Ops View' : 'User View'}
          </button>
        </div>

        {/* Progress bar */}
        <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: 'var(--divider)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: getBarColor(breakdown.score) }}
            initial={{ width: '0%' }}
            animate={{ width: `${displayValue}%` }}
            transition={{ duration: 1.5, delay: 0.8, ease: [0.34, 1.56, 0.64, 1] }}
          />
        </div>

        <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Estimates how attractive this location is to renters based on nearby amenities and
          accessibility. Directional, not predictive.
        </p>
      </div>

      {/* Helps / Hurts */}
      <div className="grid grid-cols-2 gap-0 border-t" style={{ borderColor: 'var(--divider)' }}>
        <div className="p-4 border-r" style={{ borderColor: 'var(--divider)' }}>
          <span className="text-xs font-semibold uppercase tracking-wide block mb-3" style={{ color: '#34C759' }}>
            Helps Leasing
          </span>
          <ul className="space-y-2">
            {breakdown.helps.map((h, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1 + i * 0.1 }}
                className="text-xs leading-relaxed flex items-start gap-1.5"
                style={{ color: 'var(--text-primary)' }}
              >
                <span className="text-[10px] mt-0.5 shrink-0" style={{ color: '#34C759' }}>+</span>
                {h}
              </motion.li>
            ))}
          </ul>
        </div>
        <div className="p-4">
          <span className="text-xs font-semibold uppercase tracking-wide block mb-3" style={{ color: '#FF9500' }}>
            Potential Friction
          </span>
          <ul className="space-y-2">
            {breakdown.hurts.map((h, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1 + i * 0.1 }}
                className="text-xs leading-relaxed flex items-start gap-1.5"
                style={{ color: 'var(--text-primary)' }}
              >
                <span className="text-[10px] mt-0.5 shrink-0" style={{ color: '#FF9500' }}>-</span>
                {h}
              </motion.li>
            ))}
            {breakdown.hurts.length === 0 && (
              <li className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                No significant friction detected
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* Ops Mode Details */}
      {opsMode && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="border-t px-4 py-3"
          style={{ borderColor: 'var(--divider)', background: 'var(--bg-card)' }}
        >
          <span className="text-xs font-semibold uppercase tracking-wide block mb-2" style={{ color: 'var(--text-secondary)' }}>
            Score Breakdown
          </span>
          <div className="space-y-1.5 text-xs" style={{ color: 'var(--text-primary)' }}>
            <div className="flex justify-between">
              <span>Walk Score Component (30%)</span>
              <span className="font-semibold">{Math.round(walkScore * 0.3)}</span>
            </div>
            <div className="flex justify-between">
              <span>Drive Score Component (15%)</span>
              <span className="font-semibold">{Math.round(driveScore * 0.15)}</span>
            </div>
            <div className="flex justify-between">
              <span>Amenity Diversity (25%)</span>
              <span className="font-semibold">counted</span>
            </div>
            <div className="flex justify-between">
              <span>Transit Proximity (20%)</span>
              <span className="font-semibold">calculated</span>
            </div>
            <div className="flex justify-between">
              <span>Green Space (10%)</span>
              <span className="font-semibold">calculated</span>
            </div>
            <div className="flex justify-between pt-1 border-t" style={{ borderColor: 'var(--divider)' }}>
              <span>Total Amenities Analyzed</span>
              <span className="font-semibold">{amenityCount}</span>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
