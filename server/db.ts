import fs from 'fs';
import path from 'path';
import type {
  Provider,
  ProviderAchievement,
  PublicUser,
  SearchFilters,
  User,
} from '../shared/types.ts';
import { createSeedData, type StoreData } from './seed.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'localconnect-store.json');

type SseListener = (event: string, payload: unknown) => void;
const sseListeners = new Set<SseListener>();

export function subscribeSse(listener: SseListener): () => void {
  sseListeners.add(listener);
  return () => sseListeners.delete(listener);
}

export function emitRealtimeEvent(event: string, payload: unknown) {
  for (const listener of sseListeners) {
    try {
      listener(event, payload);
    } catch {
      // ignore disconnected listeners
    }
  }
}

let store: StoreData | null = null;

export function getStore(): StoreData {
  if (store) return store;
  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<StoreData>;
      const defaults = createSeedData();
      store = {
        ...defaults,
        ...parsed,
        talentProfiles: parsed.talentProfiles ?? defaults.talentProfiles,
        userAddresses: parsed.userAddresses ?? defaults.userAddresses,
        serviceReminders: parsed.serviceReminders ?? defaults.serviceReminders,
        accessibilityPreferences:
          parsed.accessibilityPreferences ?? defaults.accessibilityPreferences,
      };
      return store;
    }
  } catch (err) {
    console.warn('Reinitializing LocalConnect store due to read error:', err);
  }
  store = createSeedData();
  saveStore();
  return store;
}

export function saveStore(): void {
  if (!store) return;
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmpPath = `${DB_PATH}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(store, null, 2), 'utf-8');
  fs.renameSync(tmpPath, DB_PATH);
}

export function toPublicUser(user: User): PublicUser {
  const { passwordHash: _omit, ...rest } = user;
  return rest;
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// Spelling-variation & fuzzy distance helper (handles e.g. "elctrician", "tiroor", "kozhikod", "kottakal")
function normalizeText(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\u0d00-\u0d7f\u0900-\u097f\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const dp: number[] = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = i - 1;
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = dp[j];
      if (a[i - 1] === b[j - 1]) {
        dp[j] = prev;
      } else {
        dp[j] = 1 + Math.min(prev, dp[j], dp[j - 1]);
      }
      prev = temp;
    }
  }
  return dp[b.length];
}

const SPELLING_SYNONYMS: Record<string, string[]> = {
  electrician: ['elctrician', 'electritian', 'electrcian', 'current', 'wiring', 'mcb', 'inverter', 'fan'],
  plumber: ['plumbr', 'plamber', 'pipe', 'leak', 'tap', 'motor', 'tank'],
  'ac-repair': ['ac', 'aircon', 'air conditioner', 'cooling', 'split ac'],
  'washing-machine-repair': ['washing machine', 'washer', 'laundry'],
  'refrigerator-repair': ['fridge', 'freezer', 'refrigerator', 'refridgerator'],
  carpenter: ['carpntr', 'wood', 'door', 'teak', 'furniture', 'ashari'],
  tirur: ['tiroor', 'thiroor', '676101'],
  kozhikode: ['calicut', 'kozhikod', '673001'],
  kottakkal: ['kottakal', 'kotakkal', '676503'],
  kochi: ['cochin', 'ernakulam', '682001'],
  thiruvananthapuram: ['trivandrum', 'tvm', '695001'],
  mehendi: ['mehndi', 'henna', 'mailanchi'],
  tuition: ['tution', 'tutor', 'teacher', 'coaching', 'maths', 'mathematics'],
};

function scoreTokenMatch(token: string, haystackWords: string[], fullHaystack: string): number {
  if (fullHaystack.includes(token)) return 10;
  const synonyms = SPELLING_SYNONYMS[token];
  if (synonyms && synonyms.some((syn) => fullHaystack.includes(syn))) return 8;
  for (const [canonical, variants] of Object.entries(SPELLING_SYNONYMS)) {
    if (variants.includes(token) && fullHaystack.includes(canonical)) return 8;
  }
  if (token.length >= 4) {
    for (const word of haystackWords) {
      if (word.length >= 4 && Math.abs(word.length - token.length) <= 2) {
        const dist = levenshtein(token, word);
        if (dist <= 2) return 6 - dist;
      }
    }
  }
  return 0;
}

export interface ProviderSearchResult {
  providers: Array<Provider & { distanceKm?: number; relevanceScore: number }>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  correctedQuery?: string;
  didYouMean: string[];
  suggestions: string[];
}

function findFuzzyCorrection(token: string, knownLocations: string[], subNames: Array<{ id: string; name: string }>): string | null {
  if (!token || token.length < 3) return null;
  if (SPELLING_SYNONYMS[token]) return token;
  for (const [canonical, variants] of Object.entries(SPELLING_SYNONYMS)) {
    if (variants.includes(token)) {
      const subMatch = subNames.find((s) => s.id === canonical);
      return subMatch ? subMatch.name : canonical;
    }
  }
  let best: { word: string; dist: number } | null = null;
  const candidates = [
    ...Object.keys(SPELLING_SYNONYMS).map((k) => {
      const subMatch = subNames.find((s) => s.id === k);
      return subMatch ? subMatch.name : k;
    }),
    ...knownLocations,
    ...subNames.map((s) => s.name),
  ];
  for (const cand of candidates) {
    const words = normalizeText(cand).split(' ');
    for (const w of words) {
      if (w.length < 3) continue;
      if (w === token) return null; // Exact token already valid
      if (Math.abs(w.length - token.length) <= 2) {
        const d = levenshtein(token, w);
        if (d > 0 && d <= 2 && (!best || d < best.dist)) {
          best = { word: cand, dist: d };
        }
      }
    }
  }
  return best ? best.word : null;
}

export function searchProvidersInDb(filters: SearchFilters): ProviderSearchResult {
  const db = getStore();
  const seenIds = new Set<string>();
  const userLat = filters.userLat;
  const userLng = filters.userLng;

  const stopWords = new Set(['in', 'near', 'at', 'for', 'and', 'the', 'a', 'to', 'of']);
  const queryTokens = filters.q
    ? normalizeText(filters.q)
        .split(' ')
        .filter((t) => t.length > 0 && !stopWords.has(t))
    : [];

  const scored: Array<Provider & { distanceKm?: number; relevanceScore: number }> = [];

  for (const p of db.providers) {
    if (seenIds.has(p.id)) continue;
    seenIds.add(p.id);

    if (filters.categoryId && !p.categoryIds.includes(filters.categoryId)) continue;
    if (filters.subcategoryId && !p.subcategoryIds.includes(filters.subcategoryId)) continue;
    if (filters.district && p.district.toLowerCase() !== filters.district.toLowerCase()) continue;
    if (filters.town && p.town.toLowerCase() !== filters.town.toLowerCase()) continue;
    if (filters.pincode && p.pincode !== filters.pincode) continue;
    if (filters.minRating && p.rating < filters.minRating) continue;
    if (filters.minPrice && p.startingPrice < filters.minPrice) continue;
    if (filters.maxPrice && p.startingPrice > filters.maxPrice) continue;
    if (filters.availableOnly && !p.isAvailable) continue;
    if (filters.minExperience && p.experienceYears < filters.minExperience) continue;
    if (filters.verifiedOnly && !(p.identityVerified && p.profileVerified)) continue;

    let distanceKm: number | undefined;
    if (typeof userLat === 'number' && typeof userLng === 'number') {
      distanceKm = haversineKm(userLat, userLng, p.lat, p.lng);
      if (filters.maxDistanceKm && distanceKm > filters.maxDistanceKm) continue;
    }

    let relevanceScore = p.isFeatured ? 3 : 0;
    relevanceScore += p.rating;

    if (queryTokens.length > 0) {
      const catNames = db.categories
        .filter((c) => p.categoryIds.includes(c.id))
        .map((c) => `${c.name} ${c.nameMl} ${c.nameHi}`);
      const subNames = db.categories
        .flatMap((c) => c.subcategories)
        .filter((s) => p.subcategoryIds.includes(s.id))
        .map((s) => `${s.name} ${s.nameMl} ${s.nameHi}`);
      const serviceText = p.services.map((s) => `${s.name} ${s.description}`).join(' ');

      const fullHaystack = normalizeText(
        [
          p.name,
          p.title,
          p.bio,
          p.town,
          p.district,
          p.locality,
          p.pincode,
          ...catNames,
          ...subNames,
          serviceText,
        ].join(' ')
      );
      const haystackWords = Array.from(new Set(fullHaystack.split(' ')));

      let matchedTokens = 0;
      let tokenScore = 0;
      for (const tok of queryTokens) {
        const s = scoreTokenMatch(tok, haystackWords, fullHaystack);
        if (s > 0) {
          matchedTokens++;
          tokenScore += s;
        }
      }

      if (matchedTokens === 0) continue;
      if (queryTokens.length > 1 && matchedTokens < Math.ceil(queryTokens.length / 2)) continue;
      relevanceScore += tokenScore + matchedTokens * 5;
    }

    scored.push({
      ...p,
      distanceKm,
      relevanceScore,
    });
  }

  const sortBy = filters.sortBy || 'relevant';
  scored.sort((a, b) => {
    if (sortBy === 'nearest') {
      const da = a.distanceKm ?? 9999;
      const dbDist = b.distanceKm ?? 9999;
      return da - dbDist || b.rating - a.rating;
    }
    if (sortBy === 'highest_rated') {
      return b.rating - a.rating || b.reviewCount - a.reviewCount;
    }
    if (sortBy === 'lowest_price') {
      return a.startingPrice - b.startingPrice || b.rating - a.rating;
    }
    if (sortBy === 'recently_added') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    return b.relevanceScore - a.relevanceScore || b.rating - a.rating;
  });

  const total = scored.length;
  const page = Math.max(1, filters.page || 1);
  // Support unlimited pagination (limit === 0 or negative returns full result set, positive limit up to 5000)
  const rawLimit = typeof filters.limit === 'number' ? filters.limit : 12;
  const limit = rawLimit <= 0 ? Math.max(1, total) : Math.max(1, Math.min(5000, rawLimit));
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * limit;
  const paged = scored.slice(start, start + limit);

  // Build fuzzy spelling correction & helpful suggestions
  const allSubs = db.categories.flatMap((c) => c.subcategories.map((s) => ({ id: s.id, name: s.name })));
  const knownLocs = Array.from(
    new Set(db.providers.flatMap((p) => [p.town, p.district]).filter(Boolean))
  );

  let correctedQuery: string | undefined;
  const didYouMeanSet = new Set<string>();

  if (filters.q && queryTokens.length > 0) {
    let anyCorrected = false;
    const rebuiltTokens = queryTokens.map((tok) => {
      const corr = findFuzzyCorrection(tok, knownLocs, allSubs);
      if (corr && corr.toLowerCase() !== tok.toLowerCase()) {
        anyCorrected = true;
        didYouMeanSet.add(corr);
        return corr;
      }
      return tok;
    });
    if (anyCorrected) {
      correctedQuery = rebuiltTokens.join(' ');
      didYouMeanSet.add(correctedQuery);
    }
  }

  const suggestions: string[] = [];
  if (total === 0) {
    if (correctedQuery) suggestions.push(correctedQuery);
    suggestions.push('Electrician in Tirur', 'AC repair in Malappuram', 'Plumber near Kottakkal', 'Home tuition');
  } else if (filters.q) {
    const qLower = normalizeText(correctedQuery || filters.q);
    for (const sub of allSubs) {
      if (
        (sub.name.toLowerCase().includes(qLower) || qLower.split(' ').some((t) => t.length >= 3 && sub.name.toLowerCase().includes(t))) &&
        suggestions.length < 5
      ) {
        suggestions.push(sub.name);
      }
    }
  }

  return {
    providers: paged,
    total,
    page: safePage,
    limit,
    totalPages,
    correctedQuery,
    didYouMean: Array.from(didYouMeanSet).slice(0, 4),
    suggestions: Array.from(new Set(suggestions)).slice(0, 5),
  };
}

export function getSmartRecommendations(userId?: string, town?: string, district?: string) {
  const db = getStore();
  const user = userId ? db.users.find((u) => u.id === userId) : undefined;
  const allowPersonalization = user ? user.allowRecommendations : true;
  const history = allowPersonalization && user ? user.searchHistory : [];
  const favIds = user ? db.favourites[user.id] || [] : [];

  const targetTown = town || user?.town || 'Tirur';
  const targetDistrict = district || user?.district || 'Malappuram';

  const ranked = db.providers.map((p) => {
    let score = p.rating * 2;
    const reasons: string[] = [];

    if (p.town.toLowerCase() === targetTown.toLowerCase()) {
      score += 6;
      reasons.push(`Located in ${p.town}`);
    } else if (p.district.toLowerCase() === targetDistrict.toLowerCase()) {
      score += 3;
      reasons.push(`Serves ${p.district} district`);
    }

    if (allowPersonalization && history.length > 0) {
      const joined = `${p.title} ${p.bio} ${p.subcategoryIds.join(' ')} ${p.services.map((s) => s.name).join(' ')}`.toLowerCase();
      const matchedTerm = history.find((term) => joined.includes(term.toLowerCase()));
      if (matchedTerm) {
        score += 5;
        reasons.push(`Matches your search "${matchedTerm}"`);
      }
    }

    if (favIds.includes(p.id)) {
      score += 2;
      reasons.push('Saved in your favourites');
    }

    if (p.rating >= 4.8 && p.reviewCount >= 20) {
      reasons.push(`Top-rated (${p.rating.toFixed(1)}★ · ${p.reviewCount} reviews)`);
    }

    if (reasons.length === 0) {
      reasons.push(`Verified specialist in ${p.district}`);
    }

    return {
      provider: p,
      score,
      reason: reasons[0],
    };
  });

  ranked.sort((a, b) => b.score - a.score);
  return ranked.slice(0, 6);
}

export function computeProviderAchievements(providerId: string): ProviderAchievement[] {
  const db = getStore();
  const provider = db.providers.find((p) => p.id === providerId);
  if (!provider) return [];

  const completedInDb = db.bookings.filter(
    (b) => b.providerId === providerId && b.status === 'service_completed'
  ).length;
  const totalJobs = Math.max(provider.completedJobs || 0, completedInDb);

  const favCount = Object.values(db.favourites).filter((list) => list.includes(providerId)).length;
  const publishedReviews = db.reviews.filter(
    (r) => r.providerId === providerId && r.moderatedStatus === 'published'
  );
  const reviewCount = Math.max(provider.reviewCount || 0, publishedReviews.length);
  const quotesCount = db.quotations.filter((q) => q.providerId === providerId).length;
  const allVerified = provider.identityVerified && provider.skillVerified && provider.profileVerified;

  return [
    {
      id: 'ach-rising-star',
      key: 'rising_star',
      title: 'Rising Star',
      description: 'Awarded after completing initial jobs with strong household feedback.',
      ruleLabel: 'At least 5 completed jobs & 4.5+ rating',
      earned: totalJobs >= 5 && provider.rating >= 4.5,
      progressCurrent: Math.min(totalJobs, 5),
      progressTarget: 5,
      earnedAt: totalJobs >= 5 && provider.rating >= 4.5 ? provider.createdAt : undefined,
    },
    {
      id: 'ach-10-jobs',
      key: 'jobs_10',
      title: '10 Jobs Completed',
      description: 'Consistent neighbourhood service delivery across at least 10 completed bookings.',
      ruleLabel: '10 completed bookings recorded in database',
      earned: totalJobs >= 10,
      progressCurrent: Math.min(totalJobs, 10),
      progressTarget: 10,
      earnedAt: totalJobs >= 10 ? provider.createdAt : undefined,
    },
    {
      id: 'ach-50-jobs',
      key: 'jobs_50',
      title: '50 Jobs Completed',
      description: 'Established local specialist with 50+ verified completions.',
      ruleLabel: '50 completed bookings recorded in database',
      earned: totalJobs >= 50,
      progressCurrent: Math.min(totalJobs, 50),
      progressTarget: 50,
      earnedAt: totalJobs >= 50 ? provider.createdAt : undefined,
    },
    {
      id: 'ach-100-jobs',
      key: 'jobs_100',
      title: '100 Jobs Completed',
      description: 'Century milestone earned strictly through completed household jobs.',
      ruleLabel: '100 completed bookings recorded in database',
      earned: totalJobs >= 100,
      progressCurrent: Math.min(totalJobs, 100),
      progressTarget: 100,
      earnedAt: totalJobs >= 100 ? provider.createdAt : undefined,
    },
    {
      id: 'ach-top-rated',
      key: 'top_rated',
      title: 'Top Rated',
      description: 'Sustained 4.8+ rating backed by at least 15 verified customer reviews.',
      ruleLabel: 'Rating ≥ 4.8★ and ≥ 15 reviews',
      earned: provider.rating >= 4.8 && reviewCount >= 15,
      progressCurrent: Math.min(reviewCount, 15),
      progressTarget: 15,
      earnedAt: provider.rating >= 4.8 && reviewCount >= 15 ? provider.createdAt : undefined,
    },
    {
      id: 'ach-fast-responder',
      key: 'fast_responder',
      title: 'Fast Responder',
      description: 'Actively responds to customer service requests with clear quotations.',
      ruleLabel: 'Submitted quotation responses or urgent availability enabled',
      earned: quotesCount >= 1 || provider.urgentAvailable,
      progressCurrent: quotesCount >= 1 || provider.urgentAvailable ? 1 : 0,
      progressTarget: 1,
      earnedAt: quotesCount >= 1 || provider.urgentAvailable ? provider.createdAt : undefined,
    },
    {
      id: 'ach-customer-fav',
      key: 'customer_favourite',
      title: 'Customer Favourite',
      description: 'Saved to favourites by households or top household review volume.',
      ruleLabel: 'Saved by customers or 25+ household reviews',
      earned: favCount >= 1 || reviewCount >= 25,
      progressCurrent: Math.min(Math.max(favCount, reviewCount >= 25 ? 1 : 0), 1),
      progressTarget: 1,
      earnedAt: favCount >= 1 || reviewCount >= 25 ? provider.createdAt : undefined,
    },
    {
      id: 'ach-verified-pro',
      key: 'verified_professional',
      title: 'Verified Professional',
      description: 'Admin-approved Identity, Skill, and Profile verification checks.',
      ruleLabel: 'Identity + Skill + Profile verification active',
      earned: allVerified,
      progressCurrent:
        (provider.identityVerified ? 1 : 0) +
        (provider.skillVerified ? 1 : 0) +
        (provider.profileVerified ? 1 : 0),
      progressTarget: 3,
      earnedAt: allVerified ? provider.createdAt : undefined,
    },
    {
      id: 'ach-experienced',
      key: 'experienced_expert',
      title: 'Experienced Expert',
      description: 'Over 8 years of documented craft and field service experience.',
      ruleLabel: '8+ years experience',
      earned: provider.experienceYears >= 8,
      progressCurrent: Math.min(provider.experienceYears, 8),
      progressTarget: 8,
      earnedAt: provider.experienceYears >= 8 ? provider.createdAt : undefined,
    },
    {
      id: 'ach-trusted-local',
      key: 'trusted_local',
      title: 'Trusted Local Professional',
      description: 'Combined verification, 4.7+ rating, and 50+ completed neighbourhood jobs.',
      ruleLabel: 'Verified + 4.7★ + 50+ completed jobs',
      earned: allVerified && provider.rating >= 4.7 && totalJobs >= 50,
      progressCurrent:
        (allVerified ? 1 : 0) + (provider.rating >= 4.7 ? 1 : 0) + (totalJobs >= 50 ? 1 : 0),
      progressTarget: 3,
      earnedAt:
        allVerified && provider.rating >= 4.7 && totalJobs >= 50 ? provider.createdAt : undefined,
    },
  ];
}

export function getSeasonalRecommendations() {
  const month = new Date().getMonth(); // 0-11
  if (month >= 5 && month <= 8) {
    // June - Sept: Kerala Southwest Monsoon
    return {
      seasonTitle: 'Kerala Monsoon Readiness',
      seasonSubtitle: 'Protect your home from heavy rains, roof leaks, and ELCB tripping.',
      items: [
        { categoryId: 'home-services', subcategoryId: 'electrician', title: 'ELCB & Earthing Safety Audit', note: 'Prevent monsoon voltage surges and inverter faults' },
        { categoryId: 'construction', subcategoryId: 'general-construction', title: 'Terrace Waterproofing & Sealant', note: 'Stop damp walls before peak rain' },
        { categoryId: 'home-services', subcategoryId: 'pest-control', title: 'Monsoon Ant & Termite Shield', note: 'Herbal perimeter protection for woodwork' },
      ],
    };
  }
  if (month >= 9 && month <= 11) {
    // Oct - Dec: Post-monsoon / Festive & Wedding Season
    return {
      seasonTitle: 'Festive & Wedding Season Picks',
      seasonSubtitle: 'Popular home prep, painting, catering, and bridal services across Kerala.',
      items: [
        { categoryId: 'home-services', subcategoryId: 'painting', title: 'Post-Rain Exterior Painting', note: 'Fresh weather-coat protection & bright interiors' },
        { categoryId: 'beauty-grooming', subcategoryId: 'mehendi', title: 'Bridal Mehendi & Home Salon', note: 'Home-visit specialists for family celebrations' },
        { categoryId: 'event-services', subcategoryId: 'catering', title: 'Sadya Catering & Courtyard Decor', note: 'Zero-commission event booking in your district' },
      ],
    };
  }
  // Jan - May: Summer & Exam Prep
  return {
    seasonTitle: 'Kerala Summer & Exam Season Picks',
    seasonSubtitle: 'Stay cool and prepared with timely AC servicing, water delivery, and tuition.',
    items: [
      { categoryId: 'appliance-repair', subcategoryId: 'ac-repair', title: 'Split AC Jet Wash & Cooling Check', note: 'Improve cooling efficiency before peak afternoon heat' },
      { categoryId: 'daily-needs', subcategoryId: 'water-delivery', title: 'Clean Tanker Water & Well Motor Check', note: 'Reliable doorstep water and pump servicing' },
      { categoryId: 'education-tuition', subcategoryId: 'home-tuition', title: 'Board Exam & Maths Revision Tutors', note: 'Focused home & online coaching in your town' },
    ],
  };
}

