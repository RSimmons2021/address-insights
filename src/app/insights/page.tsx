'use client';

import { useEffect, useState, useCallback, Suspense, useMemo, useSyncExternalStore } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { fetchNearbyAmenities } from '@/lib/amenities';
import {
  computeWalkingScore,
  computeDrivingScore,
  computeUrbanIndex,
  computeLeaseabilityScore,
} from '@/lib/scoring';
import {
  addToHistory,
  getSearchHistory,
  getSearchHistoryServerSnapshot,
  subscribeSearchHistory,
} from '@/lib/history';
import { getSnapshot } from '@/lib/snapshots';
import {
  Amenity,
  ScoreBreakdown,
  LeaseabilityBreakdown,
  CompareAddress,
  CompareAddressMetrics,
  InsightSnapshotPayload,
} from '@/types';
import ScoreGrid from '@/components/ScoreGrid';
import LeaseabilitySignal from '@/components/LeaseabilitySignal';
import AmenityList from '@/components/AmenityList';
import AmenityMap from '@/components/AmenityMap';
import ExplainPanel from '@/components/ExplainPanel';
import ShareButton from '@/components/ShareButton';
import HistoryDrawer from '@/components/HistoryDrawer';
import DarkModeButton from '@/components/DarkModeButton';
import BrandLogo from '@/components/BrandLogo';

const MAX_COMPARE_ADDRESSES = 10;
const MIN_COMPARE_ADDRESSES = 2;
const COMPARE_FETCH_CONCURRENCY = 2;

function keyForAddress(address: string): string {
  return address.trim().toLowerCase();
}

function toCompareAddress(item: { address: string; lat: number; lng: number }): CompareAddress {
  return { address: item.address, lat: item.lat, lng: item.lng };
}

function withSign(value: number): string {
  if (value > 0) return `+${value}`;
  return `${value}`;
}

function getDeltaTone(delta: number): { fg: string; bg: string; border: string; icon: string } {
  if (delta > 0) {
    return {
      fg: '#1F7A3E',
      bg: 'rgba(52, 199, 89, 0.16)',
      border: 'rgba(52, 199, 89, 0.35)',
      icon: '▲',
    };
  }
  if (delta < 0) {
    return {
      fg: '#A12A28',
      bg: 'rgba(255, 59, 48, 0.16)',
      border: 'rgba(255, 59, 48, 0.35)',
      icon: '▼',
    };
  }
  return {
    fg: 'var(--text-secondary)',
    bg: 'var(--bg-surface)',
    border: 'var(--divider)',
    icon: '•',
  };
}

function shortAddressLabel(address: string): string {
  const parts = address.split(',').map((part) => part.trim()).filter(Boolean);
  return parts.length > 1 ? `${parts[0]}, ${parts[1]}` : parts[0] || address;
}

function isValidSnapshotPayload(payload: unknown): payload is InsightSnapshotPayload {
  if (!payload || typeof payload !== 'object') return false;
  const maybe = payload as Partial<InsightSnapshotPayload>;
  return Boolean(
    maybe.version === 1 &&
      maybe.insight &&
      typeof maybe.insight.address === 'string' &&
      typeof maybe.insight.lat === 'number' &&
      typeof maybe.insight.lng === 'number' &&
      maybe.insight.walkScore &&
      maybe.insight.driveScore &&
      maybe.insight.urbanIndex &&
      maybe.insight.leaseability &&
      maybe.compare
  );
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      if (currentIndex >= items.length) return;
      results[currentIndex] = await mapper(items[currentIndex]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
  );

  return results;
}

function InsightsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const history = useSyncExternalStore(
    subscribeSearchHistory,
    getSearchHistory,
    getSearchHistoryServerSnapshot
  );

  const snapshotId = searchParams.get('snapshot')?.trim() || '';
  const addressParam = searchParams.get('address') || '';
  const latParamRaw = Number.parseFloat(searchParams.get('lat') || '0');
  const lngParamRaw = Number.parseFloat(searchParams.get('lng') || '0');
  const latParam = Number.isFinite(latParamRaw) ? latParamRaw : 0;
  const lngParam = Number.isFinite(lngParamRaw) ? lngParamRaw : 0;

  const [resolvedAddress, setResolvedAddress] = useState(addressParam);
  const [resolvedLat, setResolvedLat] = useState(latParam);
  const [resolvedLng, setResolvedLng] = useState(lngParam);
  const [isSnapshotMode, setIsSnapshotMode] = useState(Boolean(snapshotId));

  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [walkScore, setWalkScore] = useState<ScoreBreakdown | null>(null);
  const [driveScore, setDriveScore] = useState<ScoreBreakdown | null>(null);
  const [urbanIndex, setUrbanIndex] = useState<ScoreBreakdown | null>(null);
  const [leaseability, setLeaseability] = useState<LeaseabilityBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredAmenityId, setHoveredAmenityId] = useState<string | null>(null);
  const [selectedAmenity, setSelectedAmenity] = useState<Amenity | null>(null);
  const [compareSelected, setCompareSelected] = useState<CompareAddress[]>([]);
  const [compareMetrics, setCompareMetrics] = useState<CompareAddressMetrics[]>([]);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);

  const compareCandidates = useMemo(() => {
    const deduped = new Map<string, CompareAddress>();
    const push = (item: CompareAddress) => {
      if (!item.address || !Number.isFinite(item.lat) || !Number.isFinite(item.lng)) return;
      const key = keyForAddress(item.address);
      if (!key || deduped.has(key)) return;
      deduped.set(key, item);
    };
    push(toCompareAddress({ address: resolvedAddress, lat: resolvedLat, lng: resolvedLng }));
    history.forEach((item) => push(toCompareAddress(item)));
    return Array.from(deduped.values()).slice(0, 24);
  }, [history, resolvedAddress, resolvedLat, resolvedLng]);

  const loadData = useCallback(async () => {
    if (!resolvedAddress || (resolvedLat === 0 && resolvedLng === 0)) {
      setError('No address provided. Please search from the home page.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Save to history
      addToHistory({ address: resolvedAddress, lat: resolvedLat, lng: resolvedLng });

      // Fetch amenities
      const fetchedAmenities = await fetchNearbyAmenities(resolvedLat, resolvedLng, 3000);
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
  }, [resolvedAddress, resolvedLat, resolvedLng]);

  useEffect(() => {
    if (snapshotId) return;
    setIsSnapshotMode(false);
    setResolvedAddress(addressParam);
    setResolvedLat(latParam);
    setResolvedLng(lngParam);
  }, [snapshotId, addressParam, latParam, lngParam]);

  useEffect(() => {
    let cancelled = false;
    if (!snapshotId) return () => {};

    const loadSnapshot = async () => {
      setLoading(true);
      setError(null);
      setIsSnapshotMode(true);
      try {
        const result = await getSnapshot(snapshotId);
        if (!isValidSnapshotPayload(result.snapshot)) {
          throw new Error('Snapshot payload is invalid.');
        }

        if (cancelled) return;
        const payload = result.snapshot;
        setResolvedAddress(payload.insight.address);
        setResolvedLat(payload.insight.lat);
        setResolvedLng(payload.insight.lng);
        setAmenities(payload.insight.amenities);
        setWalkScore(payload.insight.walkScore);
        setDriveScore(payload.insight.driveScore);
        setUrbanIndex(payload.insight.urbanIndex);
        setLeaseability(payload.insight.leaseability);
        setCompareSelected(payload.compare.selected || []);
        setCompareMetrics(payload.compare.metrics || []);
      } catch (err) {
        console.error('Failed to load snapshot:', err);
        if (!cancelled) setError('Failed to load shared snapshot. Please open a live search link.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadSnapshot();
    return () => {
      cancelled = true;
    };
  }, [snapshotId]);

  useEffect(() => {
    if (isSnapshotMode) return;
    loadData();
  }, [loadData, isSnapshotMode]);

  useEffect(() => {
    if (!resolvedAddress || (resolvedLat === 0 && resolvedLng === 0)) return;
    const current = toCompareAddress({
      address: resolvedAddress,
      lat: resolvedLat,
      lng: resolvedLng,
    });
    setCompareSelected((prev) => {
      const exists = prev.some((item) => keyForAddress(item.address) === keyForAddress(current.address));
      if (exists) return prev;
      return [current, ...prev].slice(0, MAX_COMPARE_ADDRESSES);
    });
  }, [resolvedAddress, resolvedLat, resolvedLng]);

  const toggleCompareAddress = (candidate: CompareAddress) => {
    setCompareError(null);
    const existsNow = compareSelected.some(
      (item) => keyForAddress(item.address) === keyForAddress(candidate.address)
    );
    if (!existsNow && compareSelected.length >= MAX_COMPARE_ADDRESSES) {
      setCompareError(`You can compare up to ${MAX_COMPARE_ADDRESSES} addresses.`);
      return;
    }
    setCompareSelected((prev) => {
      const exists = prev.some(
        (item) => keyForAddress(item.address) === keyForAddress(candidate.address)
      );
      if (exists) {
        return prev.filter(
          (item) => keyForAddress(item.address) !== keyForAddress(candidate.address)
        );
      }
      return [...prev, candidate];
    });
  };

  const runCompare = useCallback(async () => {
    if (compareSelected.length < MIN_COMPARE_ADDRESSES) {
      setCompareError(`Select at least ${MIN_COMPARE_ADDRESSES} addresses to compare.`);
      setCompareMetrics([]);
      return;
    }

    setCompareLoading(true);
    setCompareError(null);
    try {
      const metrics = await mapWithConcurrency(
        compareSelected.slice(0, MAX_COMPARE_ADDRESSES),
        COMPARE_FETCH_CONCURRENCY,
        async (item) => {
          const nearby = await fetchNearbyAmenities(item.lat, item.lng, 3000);
          const walk = computeWalkingScore(nearby);
          const drive = computeDrivingScore(nearby);
          const urban = computeUrbanIndex(nearby);
          const lease = computeLeaseabilityScore(walk, drive, nearby);

          return {
            address: item.address,
            lat: item.lat,
            lng: item.lng,
            walkScore: walk.score,
            driveScore: drive.score,
            urbanIndex: urban.score,
            leaseability: lease.score,
            amenityCount: nearby.length,
          } satisfies CompareAddressMetrics;
        }
      );
      setCompareMetrics(metrics);
    } catch (err) {
      console.error('Compare mode failed:', err);
      setCompareError('Could not build comparison. Try again.');
    } finally {
      setCompareLoading(false);
    }
  }, [compareSelected]);

  const snapshotPayload = useMemo<InsightSnapshotPayload | null>(() => {
    if (
      !resolvedAddress ||
      !Number.isFinite(resolvedLat) ||
      !Number.isFinite(resolvedLng) ||
      !walkScore ||
      !driveScore ||
      !urbanIndex ||
      !leaseability
    ) {
      return null;
    }

    return {
      version: 1,
      createdAt: new Date().toISOString(),
      insight: {
        address: resolvedAddress,
        lat: resolvedLat,
        lng: resolvedLng,
        amenities,
        walkScore,
        driveScore,
        urbanIndex,
        leaseability,
      },
      compare: {
        selected: compareSelected,
        metrics: compareMetrics,
      },
    };
  }, [
    resolvedAddress,
    resolvedLat,
    resolvedLng,
    amenities,
    walkScore,
    driveScore,
    urbanIndex,
    leaseability,
    compareSelected,
    compareMetrics,
  ]);

  // Parse address parts
  const addressParts = resolvedAddress.split(',').map((s) => s.trim());
  const mainAddress = addressParts[0] || resolvedAddress;
  const subAddress = addressParts.slice(1).join(', ');
  const baselineMetrics = compareMetrics[0] || null;
  const compareRankByAddress = useMemo(() => {
    const ranked = [...compareMetrics].sort((a, b) => b.leaseability - a.leaseability);
    return new Map<string, number>(
      ranked.map((item, index) => [keyForAddress(item.address), index + 1])
    );
  }, [compareMetrics]);
  const bestByMetric = useMemo(() => {
    if (compareMetrics.length === 0) return null;
    const pickTop = <K extends keyof CompareAddressMetrics>(
      field: K
    ): CompareAddressMetrics => {
      return compareMetrics.reduce((best, current) =>
        current[field] > best[field] ? current : best
      );
    };
    return {
      leaseability: pickTop('leaseability'),
      walk: pickTop('walkScore'),
      drive: pickTop('driveScore'),
      urban: pickTop('urbanIndex'),
    };
  }, [compareMetrics]);

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
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BrandLogo size="compact" />
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
          </div>
          <div className="hidden lg:block">
            <HistoryDrawer variant="pill" />
          </div>
        </div>

        {/* Address header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs uppercase tracking-wide font-semibold block" style={{ color: 'var(--text-secondary)' }}>
              Address Insight
            </span>
            {isSnapshotMode && (
              <span
                className="text-[10px] uppercase tracking-wide font-bold px-2 py-1 rounded-full"
                style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)' }}
              >
                Snapshot
              </span>
            )}
          </div>
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

        {/* Portfolio compare mode */}
        <section
          className="p-5 rounded-[20px] border flex flex-col gap-4"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--divider)' }}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                Portfolio Compare
              </h2>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                Select {MIN_COMPARE_ADDRESSES}-{MAX_COMPARE_ADDRESSES} addresses for side-by-side deltas.
              </p>
            </div>
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)' }}
            >
              {compareSelected.length}/{MAX_COMPARE_ADDRESSES}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {compareCandidates.map((candidate) => {
              const selected = compareSelected.some(
                (item) => keyForAddress(item.address) === keyForAddress(candidate.address)
              );
              return (
                <button
                  key={`${candidate.address}-${candidate.lat}-${candidate.lng}`}
                  type="button"
                  onClick={() => toggleCompareAddress(candidate)}
                  className="px-3 py-2 rounded-full text-xs font-semibold cursor-pointer border transition-colors"
                  style={{
                    background: selected ? 'var(--color-inverse-bg)' : 'var(--bg-card)',
                    color: selected ? 'var(--color-inverse-text)' : 'var(--text-primary)',
                    borderColor: selected ? 'var(--color-inverse-bg)' : 'var(--divider)',
                  }}
                >
                  {shortAddressLabel(candidate.address)}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void runCompare()}
              disabled={compareLoading || compareSelected.length < MIN_COMPARE_ADDRESSES}
              aria-disabled={compareLoading || compareSelected.length < MIN_COMPARE_ADDRESSES}
              className="px-4 py-2 rounded-full text-xs font-bold cursor-pointer disabled:opacity-60"
              style={{ background: 'var(--color-inverse-bg)', color: 'var(--color-inverse-text)' }}
            >
              {compareLoading ? 'Comparing...' : 'Compare selected'}
            </button>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Base case: first selected address
            </p>
          </div>

          {compareMetrics.length > 0 && (
            <>
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span
                  className="px-2 py-1 rounded-full border"
                  style={{
                    background: 'rgba(52, 199, 89, 0.16)',
                    color: '#1F7A3E',
                    borderColor: 'rgba(52, 199, 89, 0.35)',
                  }}
                >
                  ▲ Better than baseline
                </span>
                <span
                  className="px-2 py-1 rounded-full border"
                  style={{
                    background: 'rgba(255, 59, 48, 0.16)',
                    color: '#A12A28',
                    borderColor: 'rgba(255, 59, 48, 0.35)',
                  }}
                >
                  ▼ Worse than baseline
                </span>
                <span
                  className="px-2 py-1 rounded-full border"
                  style={{
                    background: 'var(--bg-card)',
                    color: 'var(--text-secondary)',
                    borderColor: 'var(--divider)',
                  }}
                >
                  Rank uses leaseability
                </span>
              </div>

              {bestByMetric && (
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  <span
                    className="px-2 py-1 rounded-full"
                    style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)' }}
                  >
                    Best leaseability signal: {shortAddressLabel(bestByMetric.leaseability.address)}
                  </span>
                  <span
                    className="px-2 py-1 rounded-full"
                    style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)' }}
                  >
                    Best walking score: {shortAddressLabel(bestByMetric.walk.address)}
                  </span>
                  <span
                    className="px-2 py-1 rounded-full"
                    style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)' }}
                  >
                    Best driving score: {shortAddressLabel(bestByMetric.drive.address)}
                  </span>
                </div>
              )}
            </>
          )}

          {compareError && (
            <p className="text-xs font-medium" style={{ color: 'var(--clay-red)' }} role="status">
              {compareError}
            </p>
          )}

          {compareMetrics.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-wide font-semibold" style={{ color: 'var(--text-secondary)' }}>
                Score deltas vs {shortAddressLabel(compareMetrics[0].address)}
              </p>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {compareMetrics.map((item, index) => {
                  const isBaseline = index === 0;
                  const rank = compareRankByAddress.get(keyForAddress(item.address)) || 0;
                  const walkDelta = baselineMetrics ? item.walkScore - baselineMetrics.walkScore : 0;
                  const driveDelta = baselineMetrics ? item.driveScore - baselineMetrics.driveScore : 0;
                  const urbanDelta = baselineMetrics ? item.urbanIndex - baselineMetrics.urbanIndex : 0;
                  const leaseDelta = baselineMetrics
                    ? item.leaseability - baselineMetrics.leaseability
                    : 0;
                  const amenityDelta = baselineMetrics
                    ? item.amenityCount - baselineMetrics.amenityCount
                    : 0;
                  const amenityTone = getDeltaTone(amenityDelta);

                  const metricRows = [
                    {
                      label: 'Walking Score',
                      score: item.walkScore,
                      delta: walkDelta,
                      track: 'var(--clay-green)',
                    },
                    {
                      label: 'Driving Score',
                      score: item.driveScore,
                      delta: driveDelta,
                      track: 'var(--clay-blue)',
                    },
                    {
                      label: 'Urban/Suburban Index',
                      score: item.urbanIndex,
                      delta: urbanDelta,
                      track: 'var(--clay-orange)',
                    },
                    {
                      label: 'Leaseability Signal',
                      score: item.leaseability,
                      delta: leaseDelta,
                      track: 'var(--clay-yellow)',
                    },
                  ];

                  const cardBorderColor = isBaseline
                    ? 'var(--clay-blue)'
                    : rank === 1
                      ? 'var(--clay-green)'
                      : 'var(--divider)';
                  const cardBackground = isBaseline ? 'var(--bg-surface)' : 'var(--bg-card)';

                  return (
                    <article
                      key={`${item.address}-${item.lat}-${item.lng}`}
                      className="min-w-[250px] rounded-2xl p-4 border shrink-0"
                      style={{ background: cardBackground, borderColor: cardBorderColor }}
                    >
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                          {shortAddressLabel(item.address)}
                        </h3>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isBaseline && (
                            <span
                              className="text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full"
                              style={{ background: 'rgba(90, 200, 250, 0.18)', color: '#1F6D88' }}
                            >
                              Baseline
                            </span>
                          )}
                          {rank === 1 && !isBaseline && (
                            <span
                              className="text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full"
                              style={{ background: 'rgba(52, 199, 89, 0.18)', color: '#1F7A3E' }}
                            >
                              Top
                            </span>
                          )}
                          {!isBaseline && (
                            <span
                              className="text-[10px] font-bold px-2 py-1 rounded-full"
                              style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)' }}
                            >
                              #{rank}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3 text-xs">
                        {metricRows.map((metric) => {
                          const deltaTone = getDeltaTone(metric.delta);
                          return (
                            <div key={metric.label} className="space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <span style={{ color: 'var(--text-secondary)' }}>{metric.label}</span>
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className="px-2 py-0.5 rounded-full font-semibold"
                                    style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
                                  >
                                    {metric.score}
                                  </span>
                                  {!isBaseline && (
                                    <span
                                      className="px-2 py-0.5 rounded-full font-semibold border"
                                      style={{
                                        color: deltaTone.fg,
                                        background: deltaTone.bg,
                                        borderColor: deltaTone.border,
                                      }}
                                    >
                                      {deltaTone.icon} {withSign(metric.delta)}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-surface)' }}>
                                <div
                                  className="h-full rounded-full"
                                  style={{ width: `${Math.max(0, Math.min(100, metric.score))}%`, background: metric.track }}
                                />
                              </div>
                            </div>
                          );
                        })}

                        <div className="flex items-center justify-between pt-1">
                          <span style={{ color: 'var(--text-secondary)' }}>Amenities</span>
                          <div className="flex items-center gap-1.5">
                            <span style={{ color: 'var(--text-primary)' }}>{item.amenityCount}</span>
                            {!isBaseline && (
                              <span
                                className="px-2 py-0.5 rounded-full font-semibold border"
                                style={{
                                  color: amenityTone.fg,
                                  background: amenityTone.bg,
                                  borderColor: amenityTone.border,
                                }}
                              >
                                {amenityTone.icon} {withSign(amenityDelta)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </section>

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
          <ShareButton snapshotPayload={snapshotPayload} />
          <div className="lg:hidden">
            <HistoryDrawer />
          </div>
        </div>

        {/* Map */}
        {!loading && resolvedLat !== 0 && (
          <AmenityMap
            lat={resolvedLat}
            lng={resolvedLng}
            amenities={amenities}
            hoveredAmenityId={hoveredAmenityId}
            selectedAmenity={selectedAmenity}
            addressLabel={mainAddress}
            compareLocations={compareSelected}
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
