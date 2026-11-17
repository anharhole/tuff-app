import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { Provider } from '../../shared/types.ts';
import { ProviderCard } from '../components/ProviderCard.tsx';
import { useApp } from '../context/AppContext.tsx';
import { apiFetch } from '../lib/api.ts';

export const AllCategoriesPage: React.FC = () => {
  const { categories, language, navigate } = useApp();

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-[#181A18]">All Service Categories</h1>
        <p className="text-sm text-[#5A605A] mt-1">
          Choose a category to browse subcategories and local Kerala specialists.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {categories.map((cat) => {
          const title =
            language === 'ml' ? cat.nameMl : language === 'hi' ? cat.nameHi : cat.name;
          return (
            <div
              key={cat.id}
              className="rounded-xl border border-[#E4E1D8] bg-white p-6 flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-display text-xl font-bold text-[#181A18]">{title}</h2>
                    <p className="text-sm text-[#5A605A] mt-1 leading-relaxed">{cat.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate({ page: 'category', categoryId: cat.id })}
                    className="shrink-0 rounded-lg bg-[#134E3A] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#0D3B2B]"
                  >
                    Open
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {cat.subcategories.map((sub) => (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() =>
                        navigate({
                          page: 'subcategory',
                          categoryId: cat.id,
                          subcategoryId: sub.id,
                        })
                      }
                      className="rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] px-3 py-1.5 text-xs font-medium text-[#181A18] hover:border-[#134E3A] hover:text-[#134E3A]"
                    >
                      {language === 'ml'
                        ? sub.nameMl
                        : language === 'hi'
                          ? sub.nameHi
                          : sub.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const CategoryDetailPage: React.FC<{ isSubcategory?: boolean }> = ({ isSubcategory }) => {
  const { categories, language, lowInternetMode, selectedLocation, route, navigate } = useApp();
  const [providers, setProviders] = useState<Array<Provider & { distanceKm?: number }>>([]);
  const [sortBy, setSortBy] = useState('relevant');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const category =
    categories.find((c) => c.id === route.categoryId) ||
    categories.find((c) => c.subcategories.some((s) => s.id === route.subcategoryId)) ||
    categories[0];

  const subcategory = isSubcategory
    ? category.subcategories.find((s) => s.id === route.subcategoryId) || category.subcategories[0]
    : undefined;

  useEffect(() => {
    setPage(1);
  }, [category.id, subcategory?.id]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const params = new URLSearchParams();
    params.set('categoryId', category.id);
    if (subcategory) params.set('subcategoryId', subcategory.id);
    if (availableOnly) params.set('availableOnly', 'true');
    params.set('sortBy', sortBy);
    params.set('userLat', String(selectedLocation.lat));
    params.set('userLng', String(selectedLocation.lng));
    params.set('page', String(page));
    params.set('limit', '12');

    apiFetch<{
      providers: Array<Provider & { distanceKm?: number }>;
      total: number;
      totalPages: number;
    }>(`/api/providers?${params.toString()}`)
      .then((res) => {
        if (!active) return;
        setProviders(res.providers);
        setTotal(res.total);
        setTotalPages(res.totalPages);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [category.id, subcategory, availableOnly, sortBy, page, selectedLocation]);

  const catName =
    language === 'ml' ? category.nameMl : language === 'hi' ? category.nameHi : category.name;
  const subName = subcategory
    ? language === 'ml'
      ? subcategory.nameMl
      : language === 'hi'
        ? subcategory.nameHi
        : subcategory.name
    : '';

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-8">
      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-[#5A605A]">
        <button
          type="button"
          onClick={() => navigate({ page: 'categories' })}
          className="inline-flex items-center gap-1 hover:text-[#134E3A]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Categories</span>
        </button>
        <span>/</span>
        <button
          type="button"
          onClick={() => navigate({ page: 'category', categoryId: category.id })}
          className="hover:text-[#134E3A] font-medium"
        >
          {catName}
        </button>
        {subcategory && (
          <>
            <span>/</span>
            <span className="font-semibold text-[#181A18]">{subName}</span>
          </>
        )}
      </div>

      {/* Category Banner */}
      <div className="rounded-xl border border-[#E4E1D8] bg-white overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        <div className="lg:col-span-8 p-6 sm:p-8 flex flex-col justify-center space-y-4">
          <h1 className="font-display text-3xl font-bold text-[#181A18]">
            {subcategory ? subName : catName}
          </h1>
          <p className="text-sm sm:text-base text-[#5A605A] leading-relaxed max-w-2xl">
            {subcategory ? subcategory.description : category.description}
          </p>
          {subcategory && (
            <div className="text-xs text-[#5A605A]">
              Typical Kerala price range (estimate):{' '}
              <span className="font-mono-nums font-semibold text-[#181A18]">
                {subcategory.typicalPriceRange}
              </span>
            </div>
          )}
          <div className="pt-2 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                navigate({
                  page: 'request-service',
                  categoryId: category.id,
                  subcategoryId: subcategory?.id || category.subcategories[0]?.id,
                })
              }
              className="inline-flex items-center gap-2 rounded-lg bg-[#134E3A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0D3B2B]"
            >
              <span>Request {subcategory ? subName : catName}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        {!lowInternetMode && (
          <div className="lg:col-span-4 min-h-[200px] bg-[#E6F2EC]">
            <img
              src={category.accentImage}
              alt={catName}
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
            />
          </div>
        )}
      </div>

      {/* Subcategories Strip */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold text-[#5A605A]">
          Subcategories in {catName}
        </h2>
        <div className="flex flex-wrap gap-2">
          {category.subcategories.map((sub) => {
            const active = subcategory?.id === sub.id;
            return (
              <button
                key={sub.id}
                type="button"
                onClick={() =>
                  navigate({
                    page: 'subcategory',
                    categoryId: category.id,
                    subcategoryId: sub.id,
                  })
                }
                className={`rounded-lg border px-3.5 py-2 text-xs font-medium transition-colors ${
                  active
                    ? 'border-[#134E3A] bg-[#134E3A] text-white'
                    : 'border-[#E4E1D8] bg-white text-[#181A18] hover:border-[#134E3A]'
                }`}
              >
                {language === 'ml' ? sub.nameMl : language === 'hi' ? sub.nameHi : sub.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E4E1D8] pb-4">
        <div className="text-sm text-[#5A605A]">
          <span className="font-mono-nums font-semibold text-[#181A18]">{total}</span>{' '}
          providers available
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-medium text-[#181A18] cursor-pointer">
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
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-[#E4E1D8] bg-white px-3 py-2 text-xs font-medium"
          >
            <option value="relevant">Most relevant</option>
            <option value="nearest">Nearest to {selectedLocation.town}</option>
            <option value="highest_rated">Highest rated</option>
            <option value="lowest_price">Lowest price</option>
          </select>
        </div>
      </div>

      {/* Providers Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-52 rounded-xl border border-[#E4E1D8] bg-white animate-pulse" />
          ))}
        </div>
      ) : providers.length === 0 ? (
        <div className="rounded-xl border border-[#E4E1D8] bg-white p-8 text-center space-y-3">
          <p className="text-sm text-[#5A605A]">
            No providers listed directly under this filter yet. You can still submit an open service
            request to notify nearby providers.
          </p>
          <button
            type="button"
            onClick={() =>
              navigate({
                page: 'request-service',
                categoryId: category.id,
                subcategoryId: subcategory?.id,
              })
            }
            className="rounded-lg bg-[#134E3A] px-4 py-2 text-xs font-semibold text-white"
          >
            Post Open Service Request
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {providers.map((p) => (
              <ProviderCard key={p.id} provider={p} />
            ))}
          </div>

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
              <span className="font-mono-nums text-xs text-[#5A605A]">
                Page {page} of {totalPages}
              </span>
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
  );
};
