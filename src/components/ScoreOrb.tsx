'use client';

import { useEffect, useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';

interface ScoreOrbProps {
  score: number;
  label: string;
  description: string;
  icon: string;
  color: string;
  ingredients: string[];
  delay?: number;
}

export default function ScoreOrb({
  score,
  label,
  description,
  icon,
  color,
  ingredients,
  delay = 0,
}: ScoreOrbProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const motionScore = useMotionValue(0);
  const displayScore = useTransform(motionScore, (v) => Math.round(v));
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const controls = animate(motionScore, score, {
        duration: 1.2,
        ease: [0.34, 1.56, 0.64, 1],
      });
      return () => controls.stop();
    }, delay * 1000);
    return () => clearTimeout(timeout);
  }, [score, motionScore, delay]);

  useEffect(() => {
    const unsubscribe = displayScore.on('change', (v) => setDisplayValue(v));
    return unsubscribe;
  }, [displayScore]);

  const circumference = 2 * Math.PI * 42;
  const strokeDashoffset = circumference - (displayValue / 100) * circumference;

  return (
    <motion.div
      className="relative flex flex-col items-center gap-3 p-5 rounded-[20px] cursor-default"
      style={{ background: 'var(--bg-surface)' }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, type: 'spring', stiffness: 200, damping: 20 }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      whileHover={{ background: 'var(--bg-surface-hover)' }}
    >
      {/* Circular progress */}
      <div className="relative w-24 h-24">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 96 96">
          <circle
            cx="48"
            cy="48"
            r="42"
            fill="none"
            strokeWidth="6"
            style={{ stroke: 'var(--divider)' }}
          />
          <motion.circle
            cx="48"
            cy="48"
            r="42"
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 0.05s linear' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg">{icon}</span>
          <span className="text-2xl font-extrabold tracking-tight" style={{ color }}>
            {displayValue}
          </span>
        </div>
      </div>

      <div className="text-center">
        <h3 className="text-[15px] font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
          {label}
        </h3>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {description}
        </p>
      </div>

      {/* Ingredient badges */}
      <div className="flex flex-wrap gap-1.5 justify-center">
        {ingredients.slice(0, 3).map((ing, i) => (
          <span
            key={i}
            className="text-[10px] font-medium px-2 py-0.5 rounded-full"
            style={{ background: `${color}15`, color }}
          >
            {ing}
          </span>
        ))}
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-2 text-xs font-medium rounded-lg whitespace-nowrap z-50"
          style={{
            background: 'var(--color-inverse-bg)',
            color: 'var(--color-inverse-text)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          }}
        >
          Based on amenity count within radius
        </motion.div>
      )}
    </motion.div>
  );
}
