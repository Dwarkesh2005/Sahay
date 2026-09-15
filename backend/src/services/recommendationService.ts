import { prisma } from '../db';

// ─── Need Category Constants ───────────────────────────────────────

export const NEED_CATEGORIES = [
  'FOOD', 'SHELTER', 'MEDICAL', 'EMPLOYMENT', 'EDUCATION', 'LEGAL',
  'GUIDANCE', 'OTHER', 'SKILL_DEVELOPMENT', 'FINANCIAL_ASSISTANCE',
  'WOMEN_SUPPORT', 'CHILD_SUPPORT', 'ELDERLY_SUPPORT', 'DISABILITY_SUPPORT',
  'MIGRANT_SUPPORT', 'DOCUMENTATION', 'EMERGENCY'
] as const;

export type NeedCategory = typeof NEED_CATEGORIES[number];

// ─── Keyword → Category Mapping ────────────────────────────────────

const NEED_KEYWORDS: Record<NeedCategory, string[]> = {
  MEDICAL: [
    'hospital', 'doctor', 'medicine', 'treatment', 'surgery', 'health',
    'medical', 'clinic', 'ambulance', 'illness', 'disease', 'injury',
    'healthcare', 'mental health', 'counseling',
    'बीमारी', 'इलाज', 'दवा', 'अस्पताल', 'डॉक्टर'
  ],
  EDUCATION: [
    'school', 'college', 'tuition', 'education', 'study', 'fees',
    'scholarship', 'learning', 'literacy', 'training program', 'digital skills',
    'શિક્ષણ', 'स्कूल', 'पढ़ाई', 'शिक्षा'
  ],
  FOOD: [
    'food', 'ration', 'meal', 'hungry', 'groceries', 'kitchen', 'nutrition',
    'starving', 'eating',
    'રાશન', 'ભોજન', 'खाना', 'भोजन', 'राशन'
  ],
  SHELTER: [
    'house', 'homeless', 'rent', 'shelter', 'accommodation', 'night shelter',
    'housing', 'roof', 'place to stay', 'temporary stay', 'lodging',
    'રહેવા', 'ઘર', 'मकान', 'आश्रय', 'रहने'
  ],
  EMPLOYMENT: [
    'job', 'work', 'employment', 'unemployed', 'placement', 'labor',
    'daily wage', 'livelihood', 'occupation', 'career', 'hire',
    'નોકરી', 'કામ', 'नौकरी', 'काम', 'रोजगार'
  ],
  SKILL_DEVELOPMENT: [
    'training', 'skill', 'course', 'vocational', 'computer training',
    'workshop', 'apprentice', 'certification', 'upskill'
  ],
  LEGAL: [
    'lawyer', 'legal', 'court', 'legal help', 'documentation dispute',
    'law', 'justice', 'rights', 'advocate', 'bail',
    'कानूनी', 'वकील', 'अदालत'
  ],
  FINANCIAL_ASSISTANCE: [
    'money', 'financial help', 'expenses', 'unable to afford', 'cannot afford',
    'financial support', 'funding', 'debt', 'loan', 'financial assistance',
    'afford', 'payment', 'cost', 'पैसा', 'आर्थिक'
  ],
  WOMEN_SUPPORT: [
    'women', 'domestic violence', 'women empowerment', 'woman',
    'dowry', 'harassment', 'gender', 'महिला', 'नारी'
  ],
  CHILD_SUPPORT: [
    'child', 'children', 'orphan', 'kid', 'minor', 'infant', 'baby',
    'बाल', 'બાળક', 'बच्चा', 'बच्चे', 'बच्चों', 'अनाथ'
  ],
  ELDERLY_SUPPORT: [
    'elderly', 'senior citizen', 'old age', 'aged', 'geriatric',
    'वृद्ध', 'बुजुर्ग'
  ],
  DISABILITY_SUPPORT: [
    'disability', 'disabled', 'visually impaired', 'physical disability',
    'handicap', 'wheelchair', 'blind', 'deaf', 'divyang',
    'विकलांग', 'दिव्यांग'
  ],
  MIGRANT_SUPPORT: [
    'migrant', 'migration', 'relocated', 'migrant worker', 'inter-state',
    'interstate', 'moved to', 'new city', 'recently arrived', 'just arrived',
    'प्रवासी', 'पलायन'
  ],
  DOCUMENTATION: [
    'aadhaar', 'passport', 'documents', 'certificate', 'government document',
    'id card', 'identity', 'ration card', 'voter id', 'pan card', 'driving license',
    'दस्तावेज', 'आधार', 'पासपोर्ट'
  ],
  EMERGENCY: [
    'emergency', 'urgent', 'immediate help', 'crisis', 'critical',
    'desperately', 'life threatening', 'severe', 'immediately',
    'आपातकाल', 'तुरंत', 'जरूरी'
  ],
  GUIDANCE: [
    'guidance', 'advice', 'help', 'direction', 'navigate', 'counselling',
    'support', 'assistance', 'information', 'consultation',
    'मार्गदर्शन', 'सलाह'
  ],
  OTHER: []
};

// Map existing request_type values to our categories
const REQUEST_TYPE_TO_CATEGORY: Record<string, NeedCategory> = {
  FOOD: 'FOOD',
  SHELTER: 'SHELTER',
  MEDICAL: 'MEDICAL',
  EMPLOYMENT: 'EMPLOYMENT',
  GUIDANCE: 'GUIDANCE'
};

// ─── Category Extraction ────────────────────────────────────────────

/**
 * Extracts need categories from a text description + optional structured request_type.
 * Uses keyword matching — no external AI/NLP dependency.
 */
export function extractCategories(description: string, requestType?: string): NeedCategory[] {
  const categories = new Set<NeedCategory>();

  // 1. Add the structured request_type as a category
  if (requestType && REQUEST_TYPE_TO_CATEGORY[requestType]) {
    categories.add(REQUEST_TYPE_TO_CATEGORY[requestType]);
  }

  // 2. Keyword-match against the description
  const lowerDesc = description.toLowerCase();

  for (const [category, keywords] of Object.entries(NEED_KEYWORDS)) {
    if (category === 'OTHER') continue; // OTHER is a fallback, not keyword-matched

    for (const keyword of keywords) {
      if (lowerDesc.includes(keyword.toLowerCase())) {
        categories.add(category as NeedCategory);
        break; // One keyword match is enough for this category
      }
    }
  }

  // 3. Fallback: if nothing matched, use GUIDANCE as catch-all but DO NOT
  //    recommend random NGOs — the controller handles the no-match case
  if (categories.size === 0) {
    // Return empty — let controller handle this
    return [];
  }

  return Array.from(categories);
}

// ─── Haversine Distance ─────────────────────────────────────────────

/**
 * Calculates the great-circle distance between two lat/lng points in kilometers.
 */
export function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(deg: number): number {
  return deg * (Math.PI / 180);
}

// ─── Scoring Engine ─────────────────────────────────────────────────

interface NgoCandidate {
  ngo_id: number;
  ngo_name: string;
  city_id: number;
  latitude: any;
  longitude: any;
  verification_status: string | null;
  description: string | null;
  phone_number: string | null;
  email: string | null;
  website: string | null;
  address: string;
  ngo_services: Array<{ service: string }>;
  cities: {
    city_id: number;
    city_name: string;
    district: string;
    state: string;
  };
}

interface UserLocation {
  city: {
    city_id: number;
    city_name: string;
    district: string;
    state: string;
  };
  latitude: number | null;
  longitude: number | null;
}

export interface NgoRecommendation {
  ngoId: number;
  name: string;
  matchScore: number;
  distanceKm: number | null;
  matchedNeeds: NeedCategory[];
  cityMatch: boolean;
  verified: boolean;
  verificationStatus: string;
  reason: string;
  address: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  city: string;
}

function decimalToNumber(d: any): number | null {
  if (d === null || d === undefined) return null;
  return Number(d);
}

function normalizeCity(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Calculate the match score for a single NGO against user needs.
 */
function calculateMatchScore(
  ngo: NgoCandidate,
  userNeeds: NeedCategory[],
  userLocation: UserLocation
): { score: number; matchedNeeds: NeedCategory[]; distanceKm: number | null; cityMatch: boolean } {

  // ── Need Match (50 points) ──
  const ngoServices = new Set(ngo.ngo_services.map(s => s.service));
  const matchedNeeds = userNeeds.filter(need => ngoServices.has(need));

  let needScore = 0;
  if (userNeeds.length > 0 && matchedNeeds.length > 0) {
    // Proportional: if user has 2 needs and NGO matches 1, that's 25/50
    needScore = (matchedNeeds.length / userNeeds.length) * 50;
  }

  // ── City Match (25 points) ──
  let cityScore = 0;
  let cityMatch = false;
  const userCity = userLocation.city;
  const ngoCity = ngo.cities;

  if (normalizeCity(ngoCity.city_name) === normalizeCity(userCity.city_name)) {
    cityScore = 25;
    cityMatch = true;
  } else if (normalizeCity(ngoCity.district) === normalizeCity(userCity.district)) {
    cityScore = 15;
  } else if (normalizeCity(ngoCity.state) === normalizeCity(userCity.state)) {
    cityScore = 5;
  }

  // ── Distance (15 points) ──
  let distanceScore = 0;
  let distanceKm: number | null = null;

  const userLat = userLocation.latitude;
  const userLon = userLocation.longitude;
  const ngoLat = decimalToNumber(ngo.latitude);
  const ngoLon = decimalToNumber(ngo.longitude);

  if (userLat !== null && userLon !== null && ngoLat !== null && ngoLon !== null) {
    distanceKm = haversineDistance(userLat, userLon, ngoLat, ngoLon);
    distanceKm = Math.round(distanceKm * 10) / 10; // Round to 1 decimal

    if (distanceKm <= 5) distanceScore = 15;
    else if (distanceKm <= 15) distanceScore = 12;
    else if (distanceKm <= 30) distanceScore = 8;
    else if (distanceKm <= 50) distanceScore = 5;
    else distanceScore = 2;
  } else {
    // No coordinates — use city match as proxy for distance
    if (cityMatch) distanceScore = 10;
    else if (cityScore >= 15) distanceScore = 6;
    else if (cityScore >= 5) distanceScore = 3;
    else distanceScore = 0;
  }

  // ── Verification (10 points) ──
  let verificationScore = 0;
  const vStatus = ngo.verification_status;
  if (vStatus === 'GOVERNMENT_VERIFIED' || vStatus === 'CONTACT_VERIFIED' || vStatus === 'MANUALLY_VERIFIED') {
    verificationScore = 10;
  } else if (vStatus === 'PENDING') {
    verificationScore = 5;
  }

  const totalScore = Math.round(needScore + cityScore + distanceScore + verificationScore);

  return { score: totalScore, matchedNeeds, distanceKm, cityMatch };
}

// ─── Reason Generator ───────────────────────────────────────────────

const SERVICE_LABELS: Record<string, string> = {
  FOOD: 'food assistance', SHELTER: 'shelter support', MEDICAL: 'healthcare',
  EMPLOYMENT: 'employment support', EDUCATION: 'education', LEGAL: 'legal aid',
  GUIDANCE: 'general guidance', OTHER: 'other services',
  SKILL_DEVELOPMENT: 'skill development', FINANCIAL_ASSISTANCE: 'financial assistance',
  WOMEN_SUPPORT: 'women support', CHILD_SUPPORT: 'child support',
  ELDERLY_SUPPORT: 'elderly support', DISABILITY_SUPPORT: 'disability support',
  MIGRANT_SUPPORT: 'migrant support', DOCUMENTATION: 'documentation help',
  EMERGENCY: 'emergency response'
};

function generateReason(
  ngo: NgoCandidate,
  matchedNeeds: NeedCategory[],
  cityMatch: boolean,
  distanceKm: number | null,
  verified: boolean
): string {
  const parts: string[] = [];

  // Matched services
  if (matchedNeeds.length > 0) {
    const labels = matchedNeeds.map(n => SERVICE_LABELS[n] || n.toLowerCase()).slice(0, 3);
    if (labels.length === 1) {
      parts.push(`Provides ${labels[0]}`);
    } else {
      const last = labels.pop();
      parts.push(`Provides ${labels.join(', ')} and ${last}`);
    }
  }

  // Location
  if (cityMatch) {
    parts.push(`located in ${ngo.cities.city_name}`);
  } else if (ngo.cities.state) {
    parts.push(`based in ${ngo.cities.city_name}, ${ngo.cities.state}`);
  }

  // Distance
  if (distanceKm !== null && distanceKm <= 50) {
    parts.push(`${distanceKm} km away`);
  }

  // Verification
  if (verified) {
    parts.push('verified NGO');
  }

  if (parts.length === 0) {
    return `${ngo.ngo_name} may be able to help.`;
  }

  // Capitalize first part and join
  const sentence = parts.join(', ') + '.';
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

// ─── Main Recommendation Function ───────────────────────────────────

/**
 * Gets NGO recommendations for a specific help request.
 * Returns top 5 NGOs sorted by match score descending.
 */
export async function getRecommendations(
  requestId: number,
  userId: number
): Promise<{ categories: NeedCategory[]; recommendations: NgoRecommendation[] }> {

  // 1. Fetch the help request with city info
  const helpRequest = await prisma.help_requests.findUnique({
    where: { request_id: requestId },
    include: { cities: true }
  });

  if (!helpRequest) {
    throw new Error('Help request not found');
  }

  if (helpRequest.user_id !== userId) {
    throw new Error('Unauthorized: you do not own this request');
  }

  // 2. Extract categories from request
  const categories = extractCategories(
    helpRequest.description,
    helpRequest.request_type
  );

  if (categories.length === 0) {
    return { categories: [], recommendations: [] };
  }

  // 3. User location context
  const userLocation: UserLocation = {
    city: helpRequest.cities,
    latitude: decimalToNumber(helpRequest.latitude),
    longitude: decimalToNumber(helpRequest.longitude)
  };

  // 4. Pre-filter: get NGOs with at least one matching service
  //    Then also get NGOs in the same city/district/state for location relevance
  const candidateNgos = await prisma.ngos.findMany({
    where: {
      OR: [
        // NGOs matching at least one need category
        {
          ngo_services: {
            some: {
              service: { in: categories as any[] }
            }
          }
        },
        // NGOs in the same city (even if services don't match perfectly)
        { city_id: helpRequest.city_id }
      ]
    },
    include: {
      ngo_services: { select: { service: true } },
      cities: true
    }
  }) as NgoCandidate[];

  // 5. Score all candidates
  const scoredNgos = candidateNgos
    .map(ngo => {
      const { score, matchedNeeds, distanceKm, cityMatch } = calculateMatchScore(
        ngo, categories, userLocation
      );

      // Must have at least ONE matched need to be recommended
      if (matchedNeeds.length === 0) return null;

      const isVerified = ngo.verification_status !== 'PENDING' && ngo.verification_status !== null;

      return {
        ngoId: ngo.ngo_id,
        name: ngo.ngo_name,
        matchScore: score,
        distanceKm,
        matchedNeeds,
        cityMatch,
        verified: isVerified,
        verificationStatus: ngo.verification_status || 'PENDING',
        reason: generateReason(ngo, matchedNeeds, cityMatch, distanceKm, isVerified),
        address: ngo.address,
        phone: ngo.phone_number,
        email: ngo.email,
        website: ngo.website,
        city: ngo.cities.city_name
      } as NgoRecommendation;
    })
    .filter((r): r is NgoRecommendation => r !== null);

  // 6. Sort by score descending, then by matched needs count, then by verification
  scoredNgos.sort((a, b) => {
    if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
    if (b.matchedNeeds.length !== a.matchedNeeds.length) return b.matchedNeeds.length - a.matchedNeeds.length;
    if (b.verified !== a.verified) return b.verified ? 1 : -1;
    return 0;
  });

  // 7. Return top 5
  return {
    categories,
    recommendations: scoredNgos.slice(0, 5)
  };
}
