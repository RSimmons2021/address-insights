import { Amenity, AmenityCategory, ScoreBreakdown, LeaseabilityBreakdown } from '@/types';

// Category weights for walking score (800m radius)
const WALK_WEIGHTS: Partial<Record<AmenityCategory, number>> = {
  grocery: 10,
  transit: 8,
  park: 6,
  cafe: 5,
  restaurant: 4,
  pharmacy: 4,
  gym: 3,
  school: 2,
};

// Category weights for driving score (3km radius)
const DRIVE_WEIGHTS: Partial<Record<AmenityCategory, number>> = {
  grocery: 8,
  restaurant: 6,
  gym: 5,
  pharmacy: 5,
  school: 4,
  park: 3,
  cafe: 2,
  transit: 1,
};

function countByCategory(amenities: Amenity[]): Record<string, number> {
  const counts: Record<string, number> = {};
  amenities.forEach((a) => {
    counts[a.category] = (counts[a.category] || 0) + 1;
  });
  return counts;
}

function getLabel(score: number, type: 'walk' | 'drive' | 'urban'): string {
  if (type === 'walk') {
    if (score >= 90) return "Walker's Paradise";
    if (score >= 70) return 'Very Walkable';
    if (score >= 50) return 'Somewhat Walkable';
    if (score >= 25) return 'Car-Dependent';
    return 'Almost All Errands Require a Car';
  }
  if (type === 'drive') {
    if (score >= 90) return 'Excellent Access';
    if (score >= 70) return 'Good Access';
    if (score >= 50) return 'Some Access';
    return 'Limited Access';
  }
  // urban
  if (score >= 80) return 'Urban Core';
  if (score >= 60) return 'Urban';
  if (score >= 40) return 'Suburban';
  if (score >= 20) return 'Exurban';
  return 'Rural';
}

function getDescription(score: number, type: 'walk' | 'drive' | 'urban'): string {
  if (type === 'walk') {
    if (score >= 90) return 'Daily errands do not require a car.';
    if (score >= 70) return 'Most errands can be accomplished on foot.';
    if (score >= 50) return 'Some errands can be accomplished on foot.';
    return 'Most errands require a car.';
  }
  if (type === 'drive') {
    if (score >= 70) return 'Many amenities accessible by car within minutes.';
    if (score >= 50) return 'Decent variety of amenities within driving distance.';
    return 'Fewer amenities accessible by car.';
  }
  if (score >= 60) return 'Dense amenities and walkable streets.';
  if (score >= 40) return 'Mix of urban and suburban character.';
  return 'Spread out with car-oriented infrastructure.';
}

export function computeWalkingScore(amenities: Amenity[]): ScoreBreakdown {
  const walkable = amenities.filter((a) => a.distance <= 800);
  const counts = countByCategory(walkable);

  let raw = 0;
  for (const [cat, count] of Object.entries(counts)) {
    const weight = WALK_WEIGHTS[cat as AmenityCategory] || 1;
    // Diminishing returns: first of category is worth full weight, subsequent half
    raw += weight + Math.min(count - 1, 5) * (weight * 0.3);
  }

  const score = Math.min(100, Math.round(raw * 1.5));
  const ingredients = Object.entries(counts).map(
    ([cat, count]) => `${count} ${cat}${count > 1 ? 's' : ''}`
  );

  return {
    score,
    label: getLabel(score, 'walk'),
    description: getDescription(score, 'walk'),
    ingredients: ingredients.length ? ingredients : ['No amenities within 800m'],
  };
}

export function computeDrivingScore(amenities: Amenity[]): ScoreBreakdown {
  const drivable = amenities.filter((a) => a.distance <= 3000);
  const counts = countByCategory(drivable);

  let raw = 0;
  for (const [cat, count] of Object.entries(counts)) {
    const weight = DRIVE_WEIGHTS[cat as AmenityCategory] || 1;
    raw += weight + Math.min(count - 1, 10) * (weight * 0.2);
  }

  const score = Math.min(100, Math.round(raw * 0.8));
  const ingredients = Object.entries(counts).map(
    ([cat, count]) => `${count} ${cat}${count > 1 ? 's' : ''}`
  );

  return {
    score,
    label: getLabel(score, 'drive'),
    description: getDescription(score, 'drive'),
    ingredients: ingredients.length ? ingredients : ['No amenities within 3km'],
  };
}

export function computeUrbanIndex(amenities: Amenity[]): ScoreBreakdown {
  const nearby = amenities.filter((a) => a.distance <= 1000);
  const categories = new Set(nearby.map((a) => a.category));

  // Density: amenities per sq km (area of 1km radius circle ≈ 3.14 sq km)
  const density = nearby.length / 3.14;
  // Category diversity bonus
  const diversityBonus = categories.size * 5;

  const score = Math.min(100, Math.round(density * 3 + diversityBonus));
  const ingredients = [
    `${nearby.length} amenities within 1km`,
    `${categories.size} categories represented`,
    `${Math.round(density)} per sq km`,
  ];

  return {
    score,
    label: getLabel(score, 'urban'),
    description: getDescription(score, 'urban'),
    ingredients,
  };
}

export function computeLeaseabilityScore(
  walkScore: ScoreBreakdown,
  driveScore: ScoreBreakdown,
  amenities: Amenity[]
): LeaseabilityBreakdown {
  const nearbyAmenities = amenities.filter((a) => a.distance <= 1000);
  const categories = new Set(nearbyAmenities.map((a) => a.category));

  // Weighted composite
  const walkComponent = walkScore.score * 0.3;
  const driveComponent = driveScore.score * 0.15;

  // Amenity diversity (0-25)
  const diversityScore = Math.min(25, categories.size * 3.5);

  // Transit proximity (0-20)
  const transitStops = amenities.filter(
    (a) => a.category === 'transit' && a.distance <= 500
  ).length;
  const transitScore = Math.min(20, transitStops * 5);

  // Green space (0-10)
  const parks = amenities.filter(
    (a) => a.category === 'park' && a.distance <= 800
  ).length;
  const greenScore = Math.min(10, parks * 3);

  const score = Math.min(
    100,
    Math.round(walkComponent + driveComponent + diversityScore + transitScore + greenScore)
  );

  // Generate helps/hurts
  const helps: string[] = [];
  const hurts: string[] = [];

  // Walking
  if (walkScore.score >= 70) helps.push('High walkability score');
  else hurts.push('Low walkability, car may be needed');

  // Groceries
  const groceries = nearbyAmenities.filter((a) => a.category === 'grocery');
  if (groceries.length >= 1)
    helps.push(`${groceries.length} grocer${groceries.length > 1 ? 'ies' : 'y'} within 1km`);
  else hurts.push('No grocery stores nearby');

  // Transit
  if (transitStops >= 2) helps.push(`${transitStops} transit stops within 5 min walk`);
  else if (transitStops === 0) hurts.push('No transit stops within walking distance');

  // Cafes/restaurants (proxy for vibrancy)
  const eateries = nearbyAmenities.filter(
    (a) => a.category === 'cafe' || a.category === 'restaurant'
  );
  if (eateries.length >= 5) helps.push('High dining/cafe density');
  else if (eateries.length <= 1) hurts.push('Few dining options nearby');

  // Parks
  if (parks >= 2) helps.push('Multiple green spaces nearby');
  else if (parks === 0) hurts.push('No parks or green spaces');

  // Diversity
  if (categories.size >= 6) helps.push('Diverse amenity mix');
  else if (categories.size <= 2) hurts.push('Limited amenity variety');

  return { score, helps, hurts };
}
