'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Amenity, AMENITY_COLORS, AMENITY_ICONS, CompareAddress } from '@/types';
import { useTheme } from './ThemeProvider';

interface AmenityMapProps {
  lat: number;
  lng: number;
  amenities: Amenity[];
  hoveredAmenityId: string | null;
  selectedAmenity: Amenity | null;
  addressLabel: string;
  compareLocations?: CompareAddress[];
}

const COMPARE_PALETTE = ['#AF52DE', '#FF9500', '#34C759', '#5AC8FA', '#FF3B30', '#5856D6'];
const COMPARE_SOURCE_ID = 'compare-overlays-source';
const COMPARE_LAYER_ID = 'compare-overlays-layer';

function createAddressPopupContent(addressLabel: string): HTMLDivElement {
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'font-weight:700;font-size:13px;padding:4px 0';
  wrapper.textContent = addressLabel;
  return wrapper;
}

function createAmenityPopupContent(amenity: Amenity): HTMLDivElement {
  const wrapper = document.createElement('div');
  wrapper.style.padding = '4px 0';

  const name = document.createElement('div');
  name.style.cssText = 'font-weight:700;font-size:13px';
  name.textContent = amenity.name;

  const meta = document.createElement('div');
  meta.style.cssText = 'font-size:12px;color:#86868B';
  meta.textContent = `${amenity.category} - ${amenity.distance}m`;

  wrapper.append(name, meta);
  return wrapper;
}

function createComparePopupContent(address: string, rank: number): HTMLDivElement {
  const wrapper = document.createElement('div');
  wrapper.style.padding = '4px 0';

  const name = document.createElement('div');
  name.style.cssText = 'font-weight:700;font-size:13px';
  name.textContent = `Compare #${rank}`;

  const meta = document.createElement('div');
  meta.style.cssText = 'font-size:12px;color:#86868B;max-width:220px';
  meta.textContent = address;

  wrapper.append(name, meta);
  return wrapper;
}

export default function AmenityMap({
  lat,
  lng,
  amenities,
  hoveredAmenityId,
  selectedAmenity,
  addressLabel,
  compareLocations = [],
}: AmenityMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const compareMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const [mapLoaded, setMapLoaded] = useState(false);
  const [styleVersion, setStyleVersion] = useState(0);
  const { isDark } = useTheme();

  const mapStyle = isDark
    ? 'mapbox://styles/mapbox/dark-v11'
    : 'mapbox://styles/mapbox/light-v11';

  const addWalkRadius = useCallback(
    (map: mapboxgl.Map) => {
      if (map.getSource('walk-radius')) return;
      map.addSource('walk-radius', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: { type: 'Point', coordinates: [lng, lat] },
        },
      });
      map.addLayer({
        id: 'walk-radius-fill',
        type: 'circle',
        source: 'walk-radius',
        paint: {
          'circle-radius': {
            stops: [
              [0, 0],
              [20, metersToPixels(800, lat, 20)],
            ],
            base: 2,
          },
          'circle-color': '#5AC8FA',
          'circle-opacity': 0.06,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#5AC8FA',
          'circle-stroke-opacity': 0.2,
        },
      });
    },
    [lat, lng]
  );

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      console.error('Mapbox token missing');
      return;
    }

    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: mapStyle,
      center: [lng, lat],
      zoom: 14,
      pitch: 0,
      attributionControl: true,
    });

    map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

    // Address marker
    const el = document.createElement('div');
    el.style.cssText = `
      width: 28px; height: 28px;
      background: #1D1D1F;
      border: 4px solid white;
      border-radius: 50%;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      cursor: pointer;
    `;
    new mapboxgl.Marker({ element: el })
      .setLngLat([lng, lat])
      .setPopup(
        new mapboxgl.Popup({ offset: 15, closeButton: false }).setDOMContent(
          createAddressPopupContent(addressLabel)
        )
      )
      .addTo(map);

    map.on('load', () => {
      setMapLoaded(true);
      addWalkRadius(map);
      setStyleVersion((version) => version + 1);
      map.flyTo({ center: [lng, lat], zoom: 15, duration: 1500, essential: true });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng]);

  // Switch map style when dark mode changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    map.setStyle(mapStyle);
    map.once('style.load', () => {
      addWalkRadius(map);
      setStyleVersion((version) => version + 1);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDark]);

  // Add amenity markers
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current.clear();

    amenities.slice(0, 50).forEach((amenity) => {
      const el = document.createElement('div');
      const color = AMENITY_COLORS[amenity.category];
      el.style.cssText = `
        width: 24px; height: 24px;
        background: ${color};
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        cursor: pointer;
        transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        display: flex; align-items: center; justify-content: center;
        font-size: 11px;
      `;
      el.textContent = AMENITY_ICONS[amenity.category];

      const popup = new mapboxgl.Popup({ offset: 15, closeButton: false }).setDOMContent(
        createAmenityPopupContent(amenity)
      );

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([amenity.lng, amenity.lat])
        .setPopup(popup)
        .addTo(mapRef.current!);

      markersRef.current.set(amenity.id, marker);
    });
  }, [amenities, mapLoaded]);

  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;
    if (!map.isStyleLoaded()) return;

    compareMarkersRef.current.forEach((marker) => marker.remove());
    compareMarkersRef.current.clear();

    const uniqueLocations = new Map<string, CompareAddress>();
    compareLocations.forEach((location) => {
      const key = location.address.trim().toLowerCase();
      if (!key || uniqueLocations.has(key)) return;
      if (Math.abs(location.lat - lat) < 0.000001 && Math.abs(location.lng - lng) < 0.000001) {
        return;
      }
      uniqueLocations.set(key, location);
    });

    const compareList = Array.from(uniqueLocations.values()).slice(0, 10);
    const compareFeatures = compareList.map((location, index) => ({
      type: 'Feature' as const,
      properties: {
        color: COMPARE_PALETTE[index % COMPARE_PALETTE.length],
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [location.lng, location.lat] as [number, number],
      },
    }));

    if (map.getSource(COMPARE_SOURCE_ID)) {
      const source = map.getSource(COMPARE_SOURCE_ID) as mapboxgl.GeoJSONSource;
      source.setData({
        type: 'FeatureCollection',
        features: compareFeatures,
      });
    } else {
      map.addSource(COMPARE_SOURCE_ID, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: compareFeatures,
        },
      });
    }

    if (!map.getLayer(COMPARE_LAYER_ID)) {
      map.addLayer({
        id: COMPARE_LAYER_ID,
        type: 'circle',
        source: COMPARE_SOURCE_ID,
        paint: {
          'circle-radius': {
            stops: [
              [0, 0],
              [20, metersToPixels(500, lat, 20)],
            ],
            base: 2,
          },
          'circle-color': ['get', 'color'],
          'circle-opacity': 0.08,
          'circle-stroke-color': ['get', 'color'],
          'circle-stroke-opacity': 0.2,
          'circle-stroke-width': 1.2,
        },
      });
    }

    compareList
      .forEach((location, index) => {
        const color = COMPARE_PALETTE[index % COMPARE_PALETTE.length];
        const markerEl = document.createElement('div');
        markerEl.style.cssText = `
          width: 26px;
          height: 26px;
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
          color: ${isDark ? '#111113' : '#FFFFFF'};
          background: ${color};
          border: 2px solid ${isDark ? '#111113' : '#FFFFFF'};
          box-shadow: 0 0 0 6px ${color}33, 0 6px 16px rgba(0,0,0,0.25);
          cursor: pointer;
        `;
        markerEl.textContent = `${index + 1}`;

        const popup = new mapboxgl.Popup({ offset: 15, closeButton: false }).setDOMContent(
          createComparePopupContent(location.address, index + 1)
        );

        const marker = new mapboxgl.Marker({ element: markerEl })
          .setLngLat([location.lng, location.lat])
          .setPopup(popup)
          .addTo(map);

        compareMarkersRef.current.set(location.address, marker);
      });
  }, [compareLocations, mapLoaded, lat, lng, isDark, styleVersion]);

  // Handle hover highlight
  useEffect(() => {
    markersRef.current.forEach((marker, id) => {
      const el = marker.getElement();
      if (id === hoveredAmenityId) {
        el.style.transform = 'scale(1.5)';
        el.style.zIndex = '100';
        marker.getPopup()?.addTo(mapRef.current!);
      } else {
        el.style.transform = 'scale(1)';
        el.style.zIndex = '1';
        marker.getPopup()?.remove();
      }
    });
  }, [hoveredAmenityId]);

  // Handle selection - pan to selected amenity
  useEffect(() => {
    if (!selectedAmenity || !mapRef.current) return;
    mapRef.current.easeTo({
      center: [selectedAmenity.lng, selectedAmenity.lat],
      zoom: 16,
      duration: 800,
    });
  }, [selectedAmenity]);

  return (
    <div className="w-full h-full relative">
      <div ref={mapContainerRef} className="w-full h-full" />
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'var(--bg-map)' }}>
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-[var(--clay-blue)] border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Loading map...
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function metersToPixels(meters: number, latitude: number, zoom: number): number {
  const earthCircumference = 40075017;
  const latitudeRadians = (latitude * Math.PI) / 180;
  const metersPerPixel =
    (earthCircumference * Math.cos(latitudeRadians)) / Math.pow(2, zoom + 8);
  return meters / metersPerPixel;
}
