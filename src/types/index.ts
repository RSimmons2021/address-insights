export interface GeocodedAddress {
  lat: number;
  lng: number;
  displayName: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zip?: string;
}

export interface GeocodeSuggestion {
  id: string;
  placeName: string;
  lat: number;
  lng: number;
}

export type AmenityCategory =
  | 'cafe'
  | 'restaurant'
  | 'grocery'
  | 'park'
  | 'transit'
  | 'gym'
  | 'pharmacy'
  | 'school';

export interface Amenity {
  id: string;
  name: string;
  category: AmenityCategory;
  lat: number;
  lng: number;
  distance: number; // meters from address
}

export interface ScoreBreakdown {
  score: number;
  label: string;
  description: string;
  ingredients: string[];
}

export interface LeaseabilityBreakdown {
  score: number;
  helps: string[];
  hurts: string[];
}

export interface SearchHistoryItem {
  address: string;
  lat: number;
  lng: number;
  timestamp: number;
}

export const AMENITY_COLORS: Record<AmenityCategory, string> = {
  cafe: '#5AC8FA',
  restaurant: '#FF9500',
  grocery: '#AF52DE',
  park: '#34C759',
  transit: '#007AFF',
  gym: '#FF3B30',
  pharmacy: '#FF2D55',
  school: '#5856D6',
};

export const AMENITY_ICONS: Record<AmenityCategory, string> = {
  cafe: '☕',
  restaurant: '🍔',
  grocery: '🥦',
  park: '🌳',
  transit: '🚌',
  gym: '💪',
  pharmacy: '💊',
  school: '🏫',
};
