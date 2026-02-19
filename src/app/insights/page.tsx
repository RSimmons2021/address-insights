'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { fetchNearbyAmenities } from '@/lib/amenities';
import {
  computeWalkingScore,
  computeDrivingScore,
  computeUrbanIndex,
  computeLeaseabilityScore,
} from '@/lib/scoring';
import { addToHistory } from '@/lib/history';
import { Amenity, ScoreBreakdown, LeaseabilityBreakdown } from '@/types';
import ScoreGrid from '@/components/ScoreGrid';
import LeaseabilitySignal from '@/components/LeaseabilitySignal';
import AmenityList from '@/components/AmenityList';
import AmenityMap from '@/components/AmenityMap';
import ExplainPanel from '@/components/ExplainPanel';
import ShareButton from '@/components/ShareButton';
import HistoryDrawer from '@/components/HistoryDrawer';
import DarkModeButton from '@/components/DarkModeButton';

function InsightsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const address = searchParams.get('address') || '';
  const lat = parseFloat(searchParams.get('lat') || '0');
  const lng = parseFloat(searchParams.get('lng') || '0');

  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [walkScore, setWalkScore] = useState<ScoreBreakdown | null>(null);
  const [driveScore, setDriveScore] = useState<ScoreBreakdown | null>(null);
  const [urbanIndex, setUrbanIndex] = useState<ScoreBreakdown | null>(null);
  const [leaseability, setLeaseability] = useState<LeaseabilityBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredAmenityId, setHoveredAmenityId] = useState<string | null>(null);
  const [selectedAmenity, setSelectedAmenity] = useState<Amenity | null>(null);

  const loadData = useCallback(async () => {
    if (!address || (lat === 0 && lng === 0)) {
      setError('No address provided. Please search from the home page.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Save to history
      addToHistory({ address, lat, lng });

      // Fetch amenities
      const fetchedAmenities = await fetchNearbyAmenities(lat, lng, 3000);
      setAmenities(fetchedAmenities);

      // Compute scores
      const walk = computeWalkingScore(fetchedAmenities);
      const drive = computeDrivingScore(fetchedAmenities);
      const urban = computeUrbanIndex(fetchedAmenities);
      const lease = computeLeaseabilityScore(walk, drive, fetchedAmenities);

      setWalkScore(walk);
      setDriveScore(drive);
      setUrbanIndex(urban);
      setLeaseability(lease);
    } catch (err) {
      console.error('Failed to load insights:', err);
      setError('Failed to load insights. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [address, lat, lng]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Parse address parts
  const addressParts = address.split(',').map((s) => s.trim());
  const mainAddress = addressParts[0] || address;
  const subAddress = addressParts.slice(1).join(', ');

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-surface)' }}>
        <div className="text-center max-w-md px-6">
          <div className="text-5xl mb-4">😕</div>
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            Something went wrong
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            {error}
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 rounded-full text-sm font-semibold cursor-pointer"
            style={{ background: 'var(--color-inverse-bg)', color: 'var(--color-inverse-text)' }}
          >
            Back to Search
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col lg:grid lg:grid-cols-[420px_1fr]" style={{ background: 'var(--bg-card)' }}>
      {/* Left Panel */}
      <div className="lg:h-screen overflow-y-auto p-6 lg:p-8 border-r custom-scrollbar flex flex-col gap-8" style={{ borderColor: 'var(--divider)' }}>
        {/* Top actions */}
        <div className="flex items-center justify-between">
          <motion.button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-sm font-semibold cursor-pointer self-start"
            style={{ color: 'var(--text-secondary)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            whileHover={{ x: -3 }}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Search
          </motion.button>
          <div className="hidden lg:block">
            <HistoryDrawer variant="pill" />
          </div>
        </div>

        {/* Address header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <span className="text-xs uppercase tracking-wide font-semibold block mb-2" style={{ color: 'var(--text-secondary)' }}>
            Address Insight
          </span>
          {loading ? (
            <>
              <div className="skeleton h-8 w-3/4 mb-2" />
              <div className="skeleton h-5 w-1/2" />
            </>
          ) : (
            <>
              <h1 className="text-[28px] font-bold tracking-tight mb-1" style={{ color: 'var(--text-primary)', letterSpacing: '-1px' }}>
                {mainAddress}
              </h1>
              {subAddress && (
                <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
                  {subAddress}
                </p>
              )}
            </>
          )}
        </motion.div>

        {/* Scores */}
        {loading ? (
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-[200px] rounded-[20px]" />
            ))}
          </div>
        ) : (
          walkScore && driveScore && urbanIndex && (
            <ScoreGrid walkScore={walkScore} driveScore={driveScore} urbanIndex={urbanIndex} />
          )
        )}

        {/* Leaseability Signal */}
        {loading ? (
          <div className="skeleton h-[200px] rounded-[20px]" />
        ) : (
          leaseability && walkScore && driveScore && (
            <LeaseabilitySignal
              breakdown={leaseability}
              walkScore={walkScore.score}
              driveScore={driveScore.score}
              amenityCount={amenities.length}
            />
          )
        )}

        {/* Explain panel */}
        <ExplainPanel />

        {/* Amenity list */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton h-16 rounded-2xl" />
            ))}
          </div>
        ) : (
          <AmenityList
            amenities={amenities}
            hoveredAmenityId={hoveredAmenityId}
            onHover={setHoveredAmenityId}
            onSelect={setSelectedAmenity}
          />
        )}
      </div>

      {/* Right Panel - Map */}
      <div className="relative h-[50vh] lg:h-full" style={{ background: 'var(--bg-map)' }}>
        {/* Map controls */}
        <div className="absolute top-6 right-6 flex gap-3 z-10">
          <DarkModeButton />
          <ShareButton />
          <div className="lg:hidden">
            <HistoryDrawer />
          </div>
        </div>

        {/* Map */}
        {!loading && lat !== 0 && (
          <AmenityMap
            lat={lat}
            lng={lng}
            amenities={amenities}
            hoveredAmenityId={hoveredAmenityId}
            selectedAmenity={selectedAmenity}
            addressLabel={mainAddress}
          />
        )}

        {loading && (
          <div className="w-full h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-[var(--clay-blue)] border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                Loading insights...
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function InsightsPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[var(--clay-blue)] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <InsightsContent />
    </Suspense>
  );
}
