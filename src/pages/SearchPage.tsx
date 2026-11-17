import React, { useEffect, useState } from 'react';
import { Filter, List, Map as MapIcon, Mic, RotateCcw, Search, Sparkles } from 'lucide-react';
import { KERALA_DISTRICTS } from '../../shared/keralaData.ts';
import type { Provider } from '../../shared/types.ts';
import { KeralaMap } from '../components/KeralaMap.tsx';
import { ProviderCard } from '../components/ProviderCard.tsx';
import { useApp } from '../context/AppContext.tsx';
import { apiFetch } from '../lib/api.ts';

export const SearchPage: React.FC = () => {
  const { categories, selectedLocation, route, navigate, showToast } = useApp();

  const [q, setQ] = useState(route.q || '');
  const [categoryId, setCategoryId] = useState(route.categoryId || '');
  const [subcategoryId, setSubcategoryId] = useState(route.subcategoryId || '');
  const [district, setDistrict] = useState('');
  const [pincode, setPincode] = useState('');
  const [maxDistanceKm, setMaxDistanceKm] = useState<string>('');
  const [minRating, setMinRating] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [minExperience, setMinExperience] = useState<string>('');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<string>('relevant');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(9);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const [providers, setProviders] = useState<Array<Provider & { distanceKm?: number }>>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [correctedQuery, setCorrectedQuery] = useState<string | null>(null);
  const [didYouMean, setDidYouMean] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setQ(route.q || '');
    setCategoryId(route.categoryId || '');
    setSubcategoryId(route.subcategoryId || '');
    setPage(1);
  }, [route.q, route.categoryId, route.subcategoryId]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (categoryId) params.set('categoryId', categoryId);
    if (subcategoryId) params.set('subcategoryId', subcategoryId);
    if (district) params.set('district', district);
    if (pincode.trim()) params.set('pincode', pincode.trim());
    if (maxDistanceKm) params.set('maxDistanceKm', maxDistanceKm);
    if (minRating) params.set('minRating', minRating);
    if (maxPrice) params.set('maxPrice', maxPrice);
    if (minExperience) params.set('minExperience', minExperience);
    if (availableOnly) params.set('availableOnly', 'true');
    if (verifiedOnly) params.set('verifiedOnly', 'true');
    params.set('sortBy', sortBy);
    params.set('userLat', String(selectedLocation.lat));
    params.set('userLng', String(selectedLocation.lng));
    params.set('page', String(viewMode === 'map' ? 1 : page));
    params.set('limit', viewMode === 'map' ? '0' : String(pageSize));

    apiFetch<{
      providers: Array<Provider & { distanceKm?: number }>;
      total: number;
      totalPages: number;
      suggestions: string[];
      correctedQuery?: string;
      didYouMean?: string;
    }>(`/api/providers?${params.toString()}`)
      .then((res) => {
        if (!active) return;
        setProviders(res.providers);
        setTotal(res.total);
        setTotalPages(res.totalPages);
        setSuggestions(res.suggestions);
        setCorrectedQuery(res.correctedQuery || null);
        setDidYouMean(res.didYouMean || null);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [
    q,
    categoryId,
    subcategoryId,
    district,
    pincode,
    maxDistanceKm,
    minRating,
    maxPrice,
    minExperience,
    availableOnly,
    verifiedOnly,
    sortBy,
    page,
    pageSize,
    viewMode,
    selectedLocation,
  ]);

  const activeCategory = categories.find((c) => c.id === categoryId);

  const resetFilters = () => {
    setQ('');
    setCategoryId('');
    setSubcategoryId('');
    setDistrict('');
    setPincode('');
    setMaxDistanceKm('');
    setMinRating('');
    setMaxPrice('');
    setMinExperience('');
    setAvailableOnly(false);
    setVerifiedOnly(false);
    setSortBy('relevant');
    setPage(1);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-6">
      {/* Header + Search Input */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#181A18]">
            Search Local Professionals
          </h1>
          <p className="text-sm text-[#5A605A] mt-1">
            Searching complete database across Kerala · Distance calculated from{' '}
            <span className="font-medium text-[#181A18]">{selectedLocation.town}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg bg-[#F1EFE9] p-1">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                viewMode === 'list' ? 'bg-white text-[#134E3A] shadow-sm' : 'text-[#5A605A]'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              <span>List</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('map')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                viewMode === 'map' ? 'bg-white text-[#134E3A] shadow-sm' : 'text-[#5A605A]'
              }`}
            >
              <MapIcon className="h-3.5 w-3.5" />
              <span>Map View</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setMobileFiltersOpen((v) => !v)}
            className="lg:hidden inline-flex items-center gap-1.5 rounded-lg border border-[#E4E1D8] bg-white px-3 py-2 text-xs font-semibold text-[#181A18]"
          >
            <Filter className="h-3.5 w-3.5" />
            <span>Filters</span>
          </button>
        </div>
      </div>

      {/* Search Bar, Voice Search, Smart Mode & Sort */}
      <div className="rounded-xl border border-[#E4E1D8] bg-white p-3 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 flex items-center">
          <Search className="absolute left-3 h-4 w-4 text-[#5A605A]" />
          <input
            type="text"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search service, provider name, town, district, locality, or PIN code..."
            className="w-full rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] pl-9 pr-11 py-2.5 text-sm text-[#181A18] focus:border-[#134E3A] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#134E3A]/20"
          />
          <button
            type="button"
            data-compact="true"
            title="Voice Search"
            aria-label="Voice Search"
            onClick={() => {
              const win = window as unknown as {
                SpeechRecognition?: new () => {
                  lang: string;
                  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
                  start: () => void;
                };
                webkitSpeechRecognition?: new () => {
                  lang: string;
                  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
                  start: () => void;
                };
              };
              const Rec = win.SpeechRecognition || win.webkitSpeechRecognition;
              if (!Rec) {
                showToast('Voice recognition unavailable in this browser. Type your query.', 'info');
                return;
              }
              const rec = new Rec();
              rec.lang = 'en-IN';
              rec.onresult = (e) => {
                const spoken = e.results?.[0]?.[0]?.transcript?.trim();
                if (spoken) {
                  setQ(spoken);
                  setPage(1);
                }
              };
              rec.start();
            }}
            className="absolute right-2 flex h-8 w-8 items-center justify-center rounded-md text-[#134E3A] hover:bg-[#E6F2EC]"
          >
            <Mic className="h-4 w-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => navigate({ page: 'smart-mode' })}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#134E3A]/30 bg-[#E6F2EC] px-3.5 py-2.5 text-xs font-semibold text-[#134E3A] hover:bg-[#d5eadf] whitespace-nowrap"
        >
          <Sparkles className="h-3.5 w-3.5 text-[#B68A1E]" />
          <span>Try Smart Mode</span>
        </button>

        <select
          aria-label="Sort results"
          value={sortBy}
          onChange={(e) => {
            setSortBy(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] px-3 py-2.5 text-sm font-medium text-[#181A18] focus:border-[#134E3A] focus:bg-white focus:outline-none"
        >
          <option value="relevant">Sort: Most relevant</option>
          <option value="nearest">Sort: Nearest</option>
          <option value="highest_rated">Sort: Highest rated</option>
          <option value="lowest_price">Sort: Lowest price</option>
          <option value="recently_added">Sort: Recently added</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Filters Sidebar */}
        <aside
          className={`lg:col-span-3 rounded-xl border border-[#E4E1D8] bg-white p-5 space-y-5 ${
            mobileFiltersOpen ? 'block' : 'hidden lg:block'
          }`}
        >
          <div className="flex items-center justify-between border-b border-[#E4E1D8] pb-3">
            <h2 className="font-display text-base font-bold text-[#181A18]">Filters</h2>
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#134E3A] hover:underline"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset</span>
            </button>
          </div>

          <div className="space-y-4 text-sm">
            <div>
              <label className="block text-xs font-semibold text-[#5A605A] mb-1">Category</label>
              <select
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  setSubcategoryId('');
                  setPage(1);
                }}
                className="w-full rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] px-3 py-2 text-sm text-[#181A18] focus:border-[#134E3A] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#134E3A]/20"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {activeCategory && (
              <div>
                <label className="block text-xs font-semibold text-[#5A605A] mb-1">
                  Subcategory
                </label>
                <select
                  value={subcategoryId}
                  onChange={(e) => {
                    setSubcategoryId(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] px-3 py-2 text-sm text-[#181A18] focus:border-[#134E3A] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#134E3A]/20"
                >
                  <option value="">All in {activeCategory.name}</option>
                  {activeCategory.subcategories.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#5A605A] mb-1">District</label>
              <select
                value={district}
                onChange={(e) => {
                  setDistrict(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] px-3 py-2 text-sm text-[#181A18] focus:border-[#134E3A] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#134E3A]/20"
              >
                <option value="">All Kerala Districts</option>
                {KERALA_DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5A605A] mb-1">PIN Code</label>
              <input
                type="text"
                value={pincode}
                onChange={(e) => {
                  setPincode(e.target.value);
                  setPage(1);
                }}
                placeholder="e.g. 676101"
                className="w-full rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5A605A] mb-1">
                Max Distance from {selectedLocation.town}
              </label>
              <select
                value={maxDistanceKm}
                onChange={(e) => {
                  setMaxDistanceKm(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] px-3 py-2 text-sm"
              >
                <option value="">Any distance</option>
                <option value="10">Within 10 km</option>
                <option value="25">Within 25 km</option>
                <option value="50">Within 50 km</option>
                <option value="100">Within 100 km</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5A605A] mb-1">
                Minimum Rating
              </label>
              <select
                value={minRating}
                onChange={(e) => {
                  setMinRating(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] px-3 py-2 text-sm"
              >
                <option value="">Any rating</option>
                <option value="4.8">4.8 ★ & above</option>
                <option value="4.5">4.5 ★ & above</option>
                <option value="4.0">4.0 ★ & above</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5A605A] mb-1">
                Max Starting Price (₹)
              </label>
              <select
                value={maxPrice}
                onChange={(e) => {
                  setMaxPrice(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] px-3 py-2 text-sm"
              >
                <option value="">Any budget</option>
                <option value="400">Up to ₹400</option>
                <option value="750">Up to ₹750</option>
                <option value="1500">Up to ₹1,500</option>
                <option value="5000">Up to ₹5,000</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5A605A] mb-1">
                Min Experience
              </label>
              <select
                value={minExperience}
                onChange={(e) => {
                  setMinExperience(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] px-3 py-2 text-sm"
              >
                <option value="">Any experience</option>
                <option value="3">3+ years</option>
                <option value="5">5+ years</option>
                <option value="10">10+ years</option>
              </select>
            </div>

            <div className="space-y-2.5 pt-2 border-t border-[#E4E1D8]">
              <label className="flex items-center gap-2.5 text-sm text-[#181A18] cursor-pointer">
                <input
                  type="checkbox"
                  checked={availableOnly}
                  onChange={(e) => {
                    setAvailableOnly(e.target.checked);
                    setPage(1);
                  }}
                  className="h-4 w-4 accent-[#134E3A]"
                />
                <span>Available now</span>
              </label>

              <label className="flex items-center gap-2.5 text-sm text-[#181A18] cursor-pointer">
                <input
                  type="checkbox"
                  checked={verifiedOnly}
                  onChange={(e) => {
                    setVerifiedOnly(e.target.checked);
                    setPage(1);
                  }}
                  className="h-4 w-4 accent-[#134E3A]"
                />
                <span>Verified profiles only</span>
              </label>
            </div>
          </div>
        </aside>

        {/* Results Column */}
        <div className="lg:col-span-9 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-[#5A605A]">
            <div className="flex flex-wrap items-center gap-2">
              <span>
                Showing <span className="font-mono-nums font-semibold text-[#181A18]">{total}</span>{' '}
                matching professionals
              </span>
              {viewMode === 'list' && total > 9 && (
                <select
                  aria-label="Results per page"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="rounded-md border border-[#E4E1D8] bg-white px-2 py-1 text-xs font-medium text-[#181A18]"
                >
                  <option value={9}>9 / page</option>
                  <option value={18}>18 / page</option>
                  <option value={36}>36 / page</option>
                </select>
              )}
            </div>
            {suggestions.length > 0 && total > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span>Related:</span>
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setQ(s);
                      setPage(1);
                    }}
                    className="text-[#134E3A] hover:underline font-medium"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {(correctedQuery || didYouMean) && q.trim() && (
            <div className="rounded-lg border border-[#134E3A]/25 bg-[#E6F2EC]/60 px-4 py-2.5 text-xs text-[#181A18] flex flex-wrap items-center justify-between gap-2">
              <span>
                {correctedQuery ? (
                  <>
                    Auto-matched spelling for{' '}
                    <strong className="text-[#134E3A]">“{correctedQuery}”</strong>
                  </>
                ) : (
                  <>
                    Did you mean{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setQ(didYouMean || '');
                        setPage(1);
                      }}
                      className="font-bold text-[#134E3A] underline"
                    >
                      {didYouMean}
                    </button>
                    ?
                  </>
                )}
              </span>
              {correctedQuery && correctedQuery.toLowerCase() !== q.trim().toLowerCase() && (
                <button
                  type="button"
                  onClick={() => {
                    setQ(correctedQuery);
                    setPage(1);
                  }}
                  className="font-semibold text-[#134E3A] hover:underline"
                >
                  Use “{correctedQuery}” in search bar
                </button>
              )}
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-52 rounded-xl border border-[#E4E1D8] bg-white animate-pulse"
                />
              ))}
            </div>
          ) : providers.length === 0 ? (
            <div className="rounded-xl border border-[#E4E1D8] bg-white p-8 text-center space-y-4">
              <h3 className="font-display text-lg font-bold text-[#181A18]">
                No matching providers found for these exact filters
              </h3>
              <p className="text-sm text-[#5A605A] max-w-md mx-auto">
                Try broadening your distance radius, clearing the PIN filter, or exploring one of
                these popular searches:
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      resetFilters();
                      setQ(s);
                    }}
                    className="rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] px-3 py-1.5 text-xs font-medium text-[#134E3A] hover:border-[#134E3A]"
                  >
                    {s}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={resetFilters}
                className="rounded-lg bg-[#134E3A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0D3B2B]"
              >
                Clear All Filters
              </button>
            </div>
          ) : viewMode === 'map' ? (
            <KeralaMap
              providers={providers}
              centerLat={selectedLocation.lat}
              centerLng={selectedLocation.lng}
              radiusKm={maxDistanceKm ? Number(maxDistanceKm) : undefined}
              heightClass="h-[520px]"
            />
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {providers.map((p) => (
                  <ProviderCard key={p.id} provider={p} />
                ))}
              </div>

              {/* Numbered Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E4E1D8] pt-4">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="rounded-lg border border-[#E4E1D8] bg-white px-4 py-2 text-xs font-medium text-[#181A18] hover:border-[#134E3A] disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(
                        (n) =>
                          n === 1 || n === totalPages || Math.abs(n - page) <= 1
                      )
                      .reduce<Array<number | 'ellipsis'>>((acc, n, idx, arr) => {
                        if (idx > 0 && n - arr[idx - 1] > 1) acc.push('ellipsis');
                        acc.push(n);
                        return acc;
                      }, [])
                      .map((item, idx) =>
                        item === 'ellipsis' ? (
                          <span key={`e-${idx}`} className="px-1.5 text-xs text-[#5A605A]">
                            …
                          </span>
                        ) : (
                          <button
                            key={item}
                            type="button"
                            data-compact="true"
                            onClick={() => setPage(item)}
                            className={`h-8 min-w-[32px] rounded-md px-2 text-xs font-mono-nums font-semibold transition-colors ${
                              page === item
                                ? 'bg-[#134E3A] text-white'
                                : 'border border-[#E4E1D8] bg-white text-[#181A18] hover:border-[#134E3A]'
                            }`}
                          >
                            {item}
                          </button>
                        )
                      )}
                  </div>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="rounded-lg border border-[#E4E1D8] bg-white px-4 py-2 text-xs font-medium text-[#181A18] hover:border-[#134E3A] disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
