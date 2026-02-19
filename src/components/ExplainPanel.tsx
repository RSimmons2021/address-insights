'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ExplainPanel() {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="rounded-[20px] overflow-hidden border"
      style={{ borderColor: 'var(--divider)', background: 'var(--bg-card)' }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 flex justify-between items-center cursor-pointer"
        aria-expanded={expanded}
      >
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          How are scores computed?
        </span>
        <motion.svg
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.3 }}
          style={{ color: 'var(--text-secondary)' }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </motion.svg>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-4">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--clay-green)' }}>
                  Walking Score
                </h4>
                <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  Counts amenities within <strong>800m</strong>. Each category has a weight
                  (grocery=10, transit=8, park=6, cafe=5, restaurant=4). First amenity in a
                  category gets full weight; additional ones get 30% weight (diminishing returns).
                </p>
              </div>
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--clay-blue)' }}>
                  Driving Score
                </h4>
                <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  Same approach but with a <strong>3km radius</strong> and different weights
                  optimized for car-accessible errands (grocery=8, restaurant=6, gym=5).
                </p>
              </div>
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--clay-orange)' }}>
                  Urban/Suburban Index
                </h4>
                <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  Measures amenity density per square kilometer within 1km, plus a bonus for
                  category diversity. Higher density = more urban character.
                </p>
              </div>
              <div className="pt-2 border-t" style={{ borderColor: 'var(--divider)' }}>
                <p className="text-[12px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  Amenity data from OpenStreetMap via Overpass API. Scores are heuristic-based
                  and directional &mdash; not predictive. Map data from Mapbox.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
