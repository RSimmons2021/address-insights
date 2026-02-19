import { Amenity, AmenityCategory } from '@/types';

// Use Overpass API (OpenStreetMap) - free, no API key required
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

// Map OSM tags to our categories
const OSM_QUERIES: { category: AmenityCategory; tags: string }[] = [
  { category: 'cafe', tags: '"amenity"="cafe"' },
  { category: 'restaurant', tags: '"amenity"="restaurant"' },
  { category: 'grocery', tags: '"shop"="supermarket"' },
  { category: 'park', tags: '"leisure"="park"' },
  { category: 'transit', tags: '"public_transport"="stop_position"' },
  { category: 'gym', tags: '"leisure"="fitness_centre"' },
  { category: 'pharmacy', tags: '"amenity"="pharmacy"' },
  { category: 'school', tags: '"amenity"="school"' },
];

function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function fetchNearbyAmenities(
  lat: number,
  lng: number,
  radiusMeters: number = 1500
): Promise<Amenity[]> {
  // Build a single Overpass query for all categories
  const unionParts = OSM_QUERIES.map(
    (q) => `node[${q.tags}](around:${radiusMeters},${lat},${lng});`
  ).join('\n');

  const query = `
    [out:json][timeout:15];
    (
      ${unionParts}
    );
    out body 100;
  `;

  try {
    const res = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!res.ok) {
      console.error('Overpass API error:', res.status);
      return [];
    }

    const data = await res.json();
    const elements = data.elements || [];

    const amenities: Amenity[] = elements
      .map((el: Record<string, unknown>, idx: number) => {
        const tags = (el.tags || {}) as Record<string, string>;
        const category = categorizeOSMElement(tags);
        if (!category) return null;

        const elLat = el.lat as number;
        const elLng = el.lon as number;
        const distance = haversineDistance(lat, lng, elLat, elLng);

        return {
          id: `${el.id || idx}`,
          name: tags.name || `${category.charAt(0).toUpperCase() + category.slice(1)}`,
          category,
          lat: elLat,
          lng: elLng,
          distance: Math.round(distance),
        };
      })
      .filter((a: Amenity | null): a is Amenity => a !== null && a.name !== a.category)
      .sort((a: Amenity, b: Amenity) => a.distance - b.distance);

    return amenities;
  } catch (err) {
    console.error('Failed to fetch amenities:', err);
    return [];
  }
}

function categorizeOSMElement(tags: Record<string, string>): AmenityCategory | null {
  if (tags.amenity === 'cafe') return 'cafe';
  if (tags.amenity === 'restaurant') return 'restaurant';
  if (tags.shop === 'supermarket') return 'grocery';
  if (tags.leisure === 'park') return 'park';
  if (tags.public_transport === 'stop_position') return 'transit';
  if (tags.leisure === 'fitness_centre') return 'gym';
  if (tags.amenity === 'pharmacy') return 'pharmacy';
  if (tags.amenity === 'school') return 'school';
  return null;
}
