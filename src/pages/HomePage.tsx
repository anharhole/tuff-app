import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  ArrowRight,
  Award,
  Camera,
  CheckCircle2,
  CloudRain,
  GraduationCap,
  Hammer,
  Home,
  Leaf,
  MapPin,
  Mic,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Truck,
  Users,
  Wrench,
} from 'lucide-react';
import { t } from '../../shared/i18n.ts';
import type { Provider, Review } from '../../shared/types.ts';
import { ProviderCard } from '../components/ProviderCard.tsx';
import { useApp } from '../context/AppContext.tsx';
import { apiFetch } from '../lib/api.ts';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Wrench,
  Home,
  Hammer,
  Truck,
  Leaf,
  Sparkles,
  Camera,
  GraduationCap,
};

interface PublicRequestSummary {
  id: string;
  title: string;
  categoryId: string;
  subcategoryId: string;
  town: string;
  district: string;
  preferredDate: string;
  status: string;
  quotationsCount: number;
}

export const HomePage: React.FC = () => {
  const {
    user,
    language,
    lowInternetMode,
    categories,
    locations,
    selectedLocation,
    setSelectedLocation,
    navigate,
    setAiDrawerOpen,
  } = useApp();

  const strings = t(language);
  const [searchQuery, setSearchQuery] = useState('');
  const [nearby, setNearby] = useState<Array<Provider & { distanceKm?: number }>>([]);
  const [recommended, setRecommended] = useState<Array<{ provider: Provider; reason: string }>>([]);
  const [recentProviders, setRecentProviders] = useState<Provider[]>([]);
  const [topRated, setTopRated] = useState<Provider[]>([]);
  const [localRequests, setLocalRequests] = useState<PublicRequestSummary[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [seasonal, setSeasonal] = useState<{
    seasonTitle: string;
    seasonSubtitle: string;
    items: Array<{
      title: string;
      note: string;
      categoryId: string;
      subcategoryId: string;
    }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      apiFetch<{ providers: Array<Provider & { distanceKm?: number }> }>(
        `/api/providers?sortBy=nearest&userLat=${selectedLocation.lat}&userLng=${selectedLocation.lng}&limit=6`
      ),
      apiFetch<{ recommendations: Array<{ provider: Provider; reason: string }> }>(
        `/api/providers/recommendations?town=${encodeURIComponent(selectedLocation.town)}&district=${encodeURIComponent(selectedLocation.district)}`
      ),
      apiFetch<{ providers: Provider[] }>('/api/providers?sortBy=recently_added&limit=3'),
      apiFetch<{ providers: Provider[] }>('/api/providers?sortBy=highest_rated&limit=3'),
      apiFetch<{ requests: PublicRequestSummary[] }>('/api/requests?scope=public'),
      apiFetch<{ reviews: Review[] }>('/api/reviews'),
      apiFetch<{
        seasonTitle: string;
        seasonSubtitle: string;
        items: Array<{
          title: string;
          note: string;
          categoryId: string;
          subcategoryId: string;
        }>;
      }>('/api/seasonal'),
    ])
      .then(([nearRes, recRes, recentRes, topRes, reqRes, revRes, seaRes]) => {
        if (!active) return;
        setNearby(nearRes.providers);
        setRecommended(recRes.recommendations.slice(0, 3));
        setRecentProviders(recentRes.providers);
        setTopRated(topRes.providers);
        setLocalRequests(reqRes.requests.slice(0, 4));
        setReviews(revRes.reviews.slice(0, 3));
        setSeasonal(seaRes);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedLocation]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ page: 'search', q: searchQuery.trim() || undefined });
  };

  const popularSubcategories = [
    { catId: 'home-services', subId: 'electrician', label: 'Electrician' },
    { catId: 'home-services', subId: 'plumber', label: 'Plumber' },
    { catId: 'appliance-repair', subId: 'ac-repair', label: 'AC repair' },
    { catId: 'appliance-repair', subId: 'washing-machine-repair', label: 'Washing machine repair' },
    { catId: 'home-services', subId: 'carpenter', label: 'Carpenter' },
    { catId: 'education-tuition', subId: 'home-tuition', label: 'Home tuition' },
    { catId: 'beauty-grooming', subId: 'mehendi', label: 'Mehendi' },
    { catId: 'event-services', subId: 'catering', label: 'Catering' },
  ];

  return (
    <div className="space-y-16">
      {/* Hero Split Section */}
      <section className="border-b border-[#E4E1D8] bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 lg:py-14 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.48, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-7 flex flex-col justify-center space-y-6"
          >
            <div className="inline-flex w-fit flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-[#134E3A] lc-brass-shimmer rounded-md px-2 py-1 -mx-2">
              <span>Kerala, India</span>
              <span aria-hidden="true">·</span>
              <span>{strings.zeroCommission}</span>
              <span aria-hidden="true">·</span>
              <span>English · മലയാളം · हिन्दी</span>
            </div>

            <h1 className="font-display text-3xl sm:text-4xl lg:text-[2.75rem] font-bold tracking-tight text-[#181A18] leading-[1.12] text-balance">
              {strings.heroHeadline}
            </h1>

            <p className="text-base text-[#5A605A] leading-relaxed max-w-2xl">
              {strings.heroSubhead}
            </p>

            {/* Integrated Location Selector + Search Form */}
            <form
              onSubmit={handleSearch}
              className="rounded-xl border border-[#E4E1D8] bg-[#F8F7F4] p-2 flex flex-col sm:flex-row gap-2"
            >
              <div className="flex items-center gap-2 rounded-lg bg-white border border-[#E4E1D8] px-3 py-2.5 sm:w-52 shrink-0">
                <MapPin className="h-4 w-4 text-[#134E3A] shrink-0" />
                <select
                  aria-label="Select Kerala town"
                  value={selectedLocation.id}
                  onChange={(e) => {
                    const found = locations.find((l) => l.id === e.target.value);
                    if (found) setSelectedLocation(found);
                  }}
                  className="w-full bg-transparent text-sm font-medium text-[#181A18] focus:outline-none"
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.town} ({loc.pincode})
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative flex-1 flex items-center">
                <Search className="absolute left-3 h-4 w-4 text-[#5A605A]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={strings.searchPlaceholder}
                  className="w-full rounded-lg bg-white border border-[#E4E1D8] pl-9 pr-3 py-2.5 text-sm text-[#181A18] placeholder:text-[#5A605A]/75 focus:border-[#134E3A] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="rounded-lg bg-[#134E3A] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0D3B2B] transition-colors whitespace-nowrap shrink-0"
              >
                {strings.searchButton}
              </button>
            </form>

            {/* Primary Actions + Prominent Emergency Button */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => navigate({ page: 'emergency' })}
                className="inline-flex items-center gap-2.5 rounded-lg bg-[#B91C1C] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#991B1B] transition-colors shadow-sm"
              >
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{strings.emergencyCta}</span>
              </button>

              <button
                type="button"
                onClick={() => navigate({ page: 'request-service' })}
                className="inline-flex items-center gap-2 rounded-lg border border-[#134E3A] bg-white px-4 py-2.5 text-sm font-semibold text-[#134E3A] hover:bg-[#E6F2EC] transition-colors"
              >
                <span>{strings.requestService}</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => setAiDrawerOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] px-4 py-2.5 text-sm font-medium text-[#181A18] hover:border-[#134E3A] transition-colors"
              >
                <Sparkles className="h-4 w-4 text-[#C99B2C]" />
                <span>Ask {strings.aiAssistantTitle}</span>
              </button>

              {!user && (
                <button
                  type="button"
                  onClick={() => navigate({ page: 'login' })}
                  className="text-sm font-medium text-[#134E3A] hover:underline px-2 py-2"
                >
                  Try Demo Accounts →
                </button>
              )}
            </div>
          </motion.div>

          {/* Right Editorial Photography */}
          {!lowInternetMode ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.55, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-5 flex flex-col"
            >
              <div className="relative flex-1 min-h-[260px] lg:min-h-[380px] rounded-xl overflow-hidden border border-[#E4E1D8] bg-[#E6F2EC] shadow-sm">
                <img
                  src="/src/assets/images/hero_kerala_craftsman_1794634394731.jpg"
                  alt="Master electrician inspecting a residential distribution board in a Kerala courtyard home"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/45 to-transparent p-5 text-white">
                  <div className="text-xs font-medium text-white/85">
                    Tirur · Malappuram · Kozhikode · Thrissur · Kochi
                  </div>
                  <div className="mt-1 font-display text-lg font-semibold">
                    Direct quotes from local tradespeople — ₹0 marketplace commission
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="lg:col-span-5 rounded-xl border border-[#E4E1D8] bg-[#F8F7F4] p-6 flex flex-col justify-center">
              <div className="text-xs font-semibold text-[#134E3A] mb-2">
                Low-Internet Mode Active
              </div>
              <p className="text-sm text-[#5A605A] leading-relaxed">
                Images are hidden to save mobile data across Kerala. All search filters, quotation
                comparisons, emergency requests, and real-time chat remain fully operational.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Emergency Assistance Callout Strip */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="rounded-xl border border-red-200 bg-red-50/70 p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#B91C1C] text-white">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-[#181A18]">
                Need urgent help right now?
              </h2>
              <p className="text-sm text-[#5A605A] mt-0.5">
                {strings.emergencySub}. Request urgent electricians/plumbers or access confirmed India
                112 safety calling.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate({ page: 'emergency' })}
            className="rounded-lg bg-[#B91C1C] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#991B1B] transition-colors whitespace-nowrap shrink-0"
          >
            Open Emergency Assistance
          </button>
        </div>
      </section>

      {/* AI Smart Tools & Community Hub Bar */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            type="button"
            onClick={() => navigate({ page: 'smart-mode' })}
            className="text-left rounded-xl border border-[#134E3A]/30 bg-white p-4 hover:border-[#134E3A] transition-colors flex items-start gap-3.5"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E6F2EC] text-[#134E3A]">
              <Sparkles className="h-5 w-5 text-[#B68A1E]" />
            </div>
            <div>
              <div className="font-display text-sm font-bold text-[#181A18]">
                LocalConnect Smart Mode
              </div>
              <p className="text-xs text-[#5A605A] mt-0.5">
                Describe your need in 1 sentence to match providers & prepare a request.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate({ page: 'ai-photo' })}
            className="text-left rounded-xl border border-[#E4E1D8] bg-white p-4 hover:border-[#134E3A] transition-colors flex items-start gap-3.5"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E6F2EC] text-[#134E3A]">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display text-sm font-bold text-[#181A18]">
                AI Photo Problem Detector
              </div>
              <p className="text-xs text-[#5A605A] mt-0.5">
                Upload an appliance or repair photo for category & specialist matching.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate({ page: 'ai-voice' })}
            className="text-left rounded-xl border border-[#E4E1D8] bg-white p-4 hover:border-[#134E3A] transition-colors flex items-start gap-3.5"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E6F2EC] text-[#134E3A]">
              <Mic className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display text-sm font-bold text-[#181A18]">
                AI Voice Assistant
              </div>
              <p className="text-xs text-[#5A605A] mt-0.5">
                Speak in English, മലയാളം, or हिन्दी to search local specialists.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate({ page: 'talent-hub' })}
            className="text-left rounded-xl border border-[#E4E1D8] bg-white p-4 hover:border-[#134E3A] transition-colors flex items-start gap-3.5"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E6F2EC] text-[#134E3A]">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display text-sm font-bold text-[#181A18]">
                Local Talent Hub
              </div>
              <p className="text-xs text-[#5A605A] mt-0.5">
                Explore independent Kerala tailors, artists, tutors & craftspeople.
              </p>
            </div>
          </button>
        </div>
      </section>

      {/* 8 Service Categories Grid */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#181A18]">
              {strings.categoriesTitle}
            </h2>
            <p className="text-sm text-[#5A605A] mt-1">
              Browse 42+ specialized services tailored to Kerala households and businesses.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate({ page: 'categories' })}
            className="text-sm font-semibold text-[#134E3A] hover:underline whitespace-nowrap"
          >
            All Categories →
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {categories.map((cat, idx) => {
            const Icon = ICON_MAP[cat.iconName] || Wrench;
            const catTitle =
              language === 'ml' ? cat.nameMl : language === 'hi' ? cat.nameHi : cat.name;
            return (
              <motion.button
                key={cat.id}
                type="button"
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ duration: 0.35, delay: Math.min(idx * 0.04, 0.28), ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -3 }}
                onClick={() => navigate({ page: 'category', categoryId: cat.id })}
                className="group text-left rounded-xl border border-[#E4E1D8] bg-white p-5 hover:border-[#134E3A] hover:shadow-sm transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#E6F2EC] text-[#134E3A] mb-4 group-hover:bg-[#134E3A] group-hover:text-white transition-colors">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-display text-base font-bold text-[#181A18]">{catTitle}</h3>
                  <p className="mt-1.5 text-xs text-[#5A605A] line-clamp-2 leading-relaxed">
                    {cat.description}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-[#E4E1D8] text-xs font-medium text-[#134E3A] flex items-center justify-between">
                  <span>{cat.subcategories.length} subcategories</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Popular Services Quick Links */}
        <div className="pt-2">
          <div className="text-xs font-semibold text-[#5A605A] mb-3">{strings.popularTitle}</div>
          <div className="flex flex-wrap gap-2">
            {popularSubcategories.map((sub) => (
              <button
                key={sub.subId}
                type="button"
                onClick={() =>
                  navigate({
                    page: 'subcategory',
                    categoryId: sub.catId,
                    subcategoryId: sub.subId,
                  })
                }
                className="rounded-lg border border-[#E4E1D8] bg-white px-3.5 py-2 text-xs font-medium text-[#181A18] hover:border-[#134E3A] hover:text-[#134E3A] transition-colors"
              >
                {sub.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Nearby Professionals */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#181A18]">
              {strings.nearbyTitle} near {selectedLocation.town}
            </h2>
            <p className="text-sm text-[#5A605A] mt-1">
              Sorted by proximity to {selectedLocation.town}, {selectedLocation.district} (
              {selectedLocation.pincode}).
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate({ page: 'search', q: selectedLocation.town })}
            className="text-sm font-semibold text-[#134E3A] hover:underline whitespace-nowrap"
          >
            View All Nearby →
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-56 rounded-xl border border-[#E4E1D8] bg-white animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {nearby.map((p) => (
              <ProviderCard key={p.id} provider={p} />
            ))}
          </div>
        )}
      </section>

      {/* Recommended for You */}
      {recommended.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 space-y-6">
          <div>
            <h2 className="font-display text-2xl font-bold text-[#181A18]">
              {strings.recommendedTitle}
            </h2>
            <p className="text-sm text-[#5A605A] mt-1">
              Transparent recommendations based on your selected town, ratings, and privacy-respecting
              search preferences.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {recommended.map(({ provider, reason }) => (
              <ProviderCard key={provider.id} provider={provider} reasonText={reason} />
            ))}
          </div>
        </section>
      )}

      {/* Seasonal Kerala Service Recommendations */}
      {seasonal && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#134E3A]">
                <CloudRain className="h-4 w-4 text-[#B68A1E]" />
                <span>Seasonal Care in Kerala</span>
              </div>
              <h2 className="font-display text-2xl font-bold text-[#181A18] mt-1">
                {seasonal.seasonTitle}
              </h2>
              <p className="text-sm text-[#5A605A] mt-0.5">{seasonal.seasonSubtitle}</p>
            </div>
            <button
              type="button"
              onClick={() => navigate({ page: 'achievements' })}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#134E3A] hover:underline"
            >
              <Award className="h-4 w-4 text-[#B68A1E]" />
              <span>View Verified Provider Achievements →</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {seasonal.items.map((item) => (
              <button
                key={`${item.subcategoryId}-${item.title}`}
                type="button"
                onClick={() =>
                  navigate({
                    page: 'subcategory',
                    categoryId: item.categoryId,
                    subcategoryId: item.subcategoryId,
                  })
                }
                className="text-left rounded-xl border border-[#E4E1D8] bg-white p-5 hover:border-[#134E3A] transition-colors flex flex-col justify-between gap-3"
              >
                <div>
                  <h3 className="font-display text-base font-bold text-[#181A18]">{item.title}</h3>
                  <p className="text-xs text-[#5A605A] mt-1.5 leading-relaxed">{item.note}</p>
                </div>
                <div className="text-xs font-semibold text-[#134E3A] inline-flex items-center gap-1">
                  <span>Find local specialists</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Top-Rated & Recently Added Two-Column Showcase */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold text-[#181A18]">
              {strings.topRatedTitle}
            </h2>
            <button
              type="button"
              onClick={() => navigate({ page: 'search' })}
              className="text-xs font-semibold text-[#134E3A] hover:underline"
            >
              See all
            </button>
          </div>
          <div className="space-y-3">
            {topRated.map((p) => (
              <div
                key={p.id}
                onClick={() => navigate({ page: 'provider-profile', id: p.id })}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') navigate({ page: 'provider-profile', id: p.id });
                }}
                className="cursor-pointer rounded-xl border border-[#E4E1D8] bg-white p-4 flex items-center justify-between gap-4 hover:border-[#134E3A] transition-colors"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-[#181A18] truncate">{p.name}</div>
                  <div className="text-xs text-[#5A605A] truncate">
                    {p.title} · {p.town}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="inline-flex items-center gap-1 text-xs font-semibold text-[#181A18]">
                    <Star className="h-3.5 w-3.5 fill-[#C99B2C] text-[#C99B2C]" />
                    <span className="font-mono-nums">{p.rating.toFixed(1)}</span>
                  </div>
                  <div className="font-mono-nums text-xs text-[#134E3A]">
                    Starts ₹{p.startingPrice}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold text-[#181A18]">{strings.recentTitle}</h2>
            <button
              type="button"
              onClick={() => navigate({ page: 'search' })}
              className="text-xs font-semibold text-[#134E3A] hover:underline"
            >
              Explore directory
            </button>
          </div>
          <div className="space-y-3">
            {recentProviders.map((p) => (
              <div
                key={p.id}
                onClick={() => navigate({ page: 'provider-profile', id: p.id })}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') navigate({ page: 'provider-profile', id: p.id });
                }}
                className="cursor-pointer rounded-xl border border-[#E4E1D8] bg-white p-4 flex items-center justify-between gap-4 hover:border-[#134E3A] transition-colors"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-[#181A18] truncate">{p.name}</div>
                  <div className="text-xs text-[#5A605A] truncate">
                    {p.title} · {p.town}, {p.district}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-medium text-[#134E3A]">
                    {p.isDemo ? 'Demo' : 'Live'}
                  </div>
                  <div className="font-mono-nums text-xs text-[#5A605A]">
                    Starts ₹{p.startingPrice}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Local Service Requests + How It Works */}
      <section className="border-y border-[#E4E1D8] bg-white py-14 px-4 sm:px-6">
        <div className="mx-auto max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Local Requests */}
          <div className="lg:col-span-6 space-y-5">
            <div>
              <h2 className="font-display text-2xl font-bold text-[#181A18]">
                {strings.localRequestsTitle}
              </h2>
              <p className="text-sm text-[#5A605A] mt-1">
                Active household requests across Kerala waiting for or comparing provider quotes.
              </p>
            </div>
            <div className="space-y-3">
              {localRequests.map((req) => (
                <div
                  key={req.id}
                  className="rounded-xl border border-[#E4E1D8] bg-[#F8F7F4] p-4 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[#181A18] truncate">{req.title}</div>
                    <div className="text-xs text-[#5A605A] mt-1">
                      {req.town}, {req.district} · Preferred {req.preferredDate}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono-nums text-xs font-semibold text-[#134E3A]">
                      {req.quotationsCount} quotes
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate({ page: 'request-service', categoryId: req.categoryId, subcategoryId: req.subcategoryId })}
                      className="text-xs text-[#134E3A] hover:underline mt-0.5"
                    >
                      Post similar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* How It Works */}
          <div className="lg:col-span-6 space-y-5">
            <div>
              <h2 className="font-display text-2xl font-bold text-[#181A18]">
                {strings.howItWorksTitle}
              </h2>
              <p className="text-sm text-[#5A605A] mt-1">
                Built around transparent pricing and zero platform commission.
              </p>
            </div>
            <div className="space-y-4">
              {[
                {
                  step: '01. Describe Your Requirement',
                  desc: 'Select a category, add photos and preferred date/time, and notify eligible professionals near your Kerala town.',
                },
                {
                  step: '02. Compare Real Quotations',
                  desc: 'Receive price estimates, arrival windows, and notes directly from local specialists. Chat or call before deciding.',
                },
                {
                  step: '03. Confirm & Verify Completion',
                  desc: 'Track booking stages from arrival to completion with optional 4-digit OTP confirmation and verified reviews.',
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="rounded-xl border border-[#E4E1D8] bg-[#F8F7F4] p-4 flex items-start gap-3.5"
                >
                  <CheckCircle2 className="h-5 w-5 text-[#134E3A] shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-display text-base font-semibold text-[#181A18]">
                      {item.step}
                    </h3>
                    <p className="text-sm text-[#5A605A] mt-1 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Household Reviews */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-[#181A18]">
              {strings.reviewsTitle}
            </h2>
            <p className="text-sm text-[#5A605A] mt-1">
              Authentic feedback from completed local service bookings.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate({ page: 'reviews' })}
            className="text-sm font-semibold text-[#134E3A] hover:underline"
          >
            All Reviews →
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {reviews.map((rev) => (
            <div
              key={rev.id}
              className="rounded-xl border border-[#E4E1D8] bg-white p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-1 text-[#C99B2C]">
                    {Array.from({ length: rev.rating }).map((_, idx) => (
                      <Star key={idx} className="h-3.5 w-3.5 fill-[#C99B2C]" />
                    ))}
                  </div>
                  <span className="text-xs text-[#5A605A]">{rev.serviceName}</span>
                </div>
                <p className="text-sm text-[#181A18] leading-relaxed">“{rev.comment}”</p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#E4E1D8] flex items-center justify-between text-xs text-[#5A605A]">
                <span className="font-medium text-[#181A18]">{rev.customerName}</span>
                <span className="inline-flex items-center gap-1 text-[#134E3A]">
                  <ShieldCheck className="h-3.5 w-3.5" /> Verified
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
