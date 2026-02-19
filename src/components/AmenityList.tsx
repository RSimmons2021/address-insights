'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Amenity, AmenityCategory, AMENITY_ICONS, AMENITY_COLORS } from '@/types';

const FILTERS: { label: string; value: AmenityCategory | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Cafes', value: 'cafe' },
  { label: 'Food', value: 'restaurant' },
  { label: 'Grocery', value: 'grocery' },
  { label: 'Parks', value: 'park' },
  { label: 'Transit', value: 'transit' },
  { label: 'Gym', value: 'gym' },
];

interface AmenityListProps {
  amenities: Amenity[];
  hoveredAmenityId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (amenity: Amenity) => void;
}

export default function AmenityList({
  amenities,
  hoveredAmenityId,
  onHover,
  onSelect,
}: AmenityListProps) {
  const [activeFilter, setActiveFilter] = useState<AmenityCategory | 'all'>('all');

  const filtered =
    activeFilter === 'all'
      ? amenities
      : amenities.filter((a) => a.category === activeFilter);

  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${meters}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  return (
    <div>
      <span
        className="text-xs uppercase tracking-wide font-semibold mb-4 block"
        style={{ color: 'var(--text-secondary)' }}
      >
        Nearby Amenities ({amenities.length})
      </span>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setActiveFilter(f.value)}
            className="px-4 py-2 rounded-full text-[13px] font-semibold whitespace-nowrap cursor-pointer transition-all"
            style={{
              background: activeFilter === f.value ? 'var(--color-inverse-bg)' : 'var(--bg-surface)',
              color: activeFilter === f.value ? 'var(--color-inverse-text)' : 'var(--text-secondary)',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-1 max-h-[300px] overflow-y-auto custom-scrollbar">
        {filtered.length === 0 && (
          <p className="text-sm py-4 text-center" style={{ color: 'var(--text-secondary)' }}>
            No amenities found in this category
          </p>
        )}
        {filtered.slice(0, 20).map((amenity, i) => (
          <motion.div
            key={amenity.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            className="flex items-center gap-4 p-3 rounded-2xl cursor-pointer transition-colors"
            style={{
              background: hoveredAmenityId === amenity.id ? 'var(--bg-surface)' : 'transparent',
            }}
            onMouseEnter={() => onHover(amenity.id)}
            onMouseLeave={() => onHover(null)}
            onClick={() => onSelect(amenity)}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
              style={{ background: `${AMENITY_COLORS[amenity.category]}15` }}
            >
              {AMENITY_ICONS[amenity.category]}
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-semibold text-[15px] block truncate" style={{ color: 'var(--text-primary)' }}>
                {amenity.name}
              </span>
              <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                {amenity.category.charAt(0).toUpperCase() + amenity.category.slice(1)} &middot;{' '}
                {formatDistance(amenity.distance)}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
