import { GeocodeSuggestion, GeocodedAddress } from '@/types';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export async function searchAddresses(query: string): Promise<GeocodeSuggestion[]> {
  if (!query || query.length < 3 || !MAPBOX_TOKEN) return [];

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&types=address,place,neighborhood&limit=5&country=us`;

  const res = await fetch(url);
  if (!res.ok) return [];

  const data = await res.json();

  return (data.features || []).map((f: Record<string, unknown>) => ({
    id: f.id as string,
    placeName: f.place_name as string,
    lng: (f.center as number[])[0],
    lat: (f.center as number[])[1],
  }));
}

export async function geocodeAddress(query: string): Promise<GeocodedAddress | null> {
  if (!query || !MAPBOX_TOKEN) return null;

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&types=address,place,neighborhood&limit=1&country=us`;

  const res = await fetch(url);
  if (!res.ok) return null;

  const data = await res.json();
  const feature = data.features?.[0];
  if (!feature) return null;

  const context = feature.context || [];
  const getContext = (type: string) =>
    context.find((c: Record<string, string>) => c.id?.startsWith(type))?.text;

  return {
    lat: feature.center[1],
    lng: feature.center[0],
    displayName: feature.place_name,
    neighborhood: getContext('neighborhood'),
    city: getContext('place'),
    state: getContext('region'),
    zip: getContext('postcode'),
  };
}
