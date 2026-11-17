import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Heart, MapPin, ShieldCheck, Star } from 'lucide-react';
import { t } from '../../shared/i18n.ts';
import type { Provider } from '../../shared/types.ts';
import { useApp } from '../context/AppContext.tsx';

interface ProviderCardProps {
  provider: Provider & { distanceKm?: number };
  reasonText?: string;
}

export const ProviderCard: React.FC<ProviderCardProps> = ({ provider, reasonText }) => {
  const { language, lowInternetMode, favouriteIds, toggleFavourite, navigate } = useApp();
  const [imgError, setImgError] = useState(false);
  const strings = t(language);
  const isFav = favouriteIds.includes(provider.id);
  const isVerified = provider.identityVerified && provider.profileVerified;

  const initials = provider.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');

  return (
    <motion.article
      whileHover={{ y: -3 }}
      transition={{ type: 'spring', stiffness: 360, damping: 26 }}
      className="group relative overflow-hidden flex flex-col justify-between rounded-xl border border-[#E4E1D8] bg-white p-5 transition-[border-color,box-shadow] duration-200 hover:border-[#134E3A]/45 hover:shadow-md"
    >
      {/* Expanding Kerala brass accent hairline on hover */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-[#134E3A] via-[#C99B2C] to-[#134E3A] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out"
      />
      <div>
        {/* Top Row: Avatar + Name + Favourite */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3.5 min-w-0">
            {!lowInternetMode && provider.avatarUrl && !imgError ? (
              <img
                src={provider.avatarUrl}
                alt={provider.name}
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="h-12 w-12 rounded-lg object-cover shrink-0 border border-[#E4E1D8]"
              />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#E6F2EC] font-display text-sm font-bold text-[#134E3A]">
                {initials}
              </div>
            )}

            <div className="min-w-0">
              <button
                type="button"
                onClick={() => navigate({ page: 'provider-profile', id: provider.id })}
                className="text-left font-display text-base font-semibold text-[#181A18] hover:text-[#134E3A] transition-colors truncate block w-full"
              >
                {provider.name}
              </button>
              <p className="text-xs text-[#5A605A] line-clamp-1 mt-0.5">{provider.title}</p>
            </div>
          </div>

          <motion.button
            type="button"
            whileTap={{ scale: 0.82 }}
            whileHover={{ scale: 1.06 }}
            onClick={() => toggleFavourite(provider.id)}
            aria-label={isFav ? 'Remove from favourites' : 'Save to favourites'}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors ${
              isFav
                ? 'border-[#134E3A]/30 bg-[#E6F2EC] text-[#134E3A]'
                : 'border-[#E4E1D8] text-[#5A605A] hover:text-[#181A18]'
            }`}
          >
            <Heart className={`h-4 w-4 ${isFav ? 'fill-[#134E3A]' : ''}`} />
          </motion.button>
        </div>

        {/* Clean Unboxed Metadata Line (Zero-Pill Discipline) */}
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#5A605A]">
          <span className="inline-flex items-center gap-1 font-medium text-[#181A18]">
            <Star className="h-3.5 w-3.5 fill-[#C99B2C] text-[#C99B2C]" />
            <span className="font-mono-nums">{provider.rating.toFixed(1)}</span>
            <span className="text-[#5A605A]">({provider.reviewCount})</span>
          </span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            <span>
              {provider.town}, {provider.district}
            </span>
          </span>
          {typeof provider.distanceKm === 'number' && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-mono-nums">{provider.distanceKm} km away</span>
            </>
          )}
          <span aria-hidden="true">·</span>
          <span>{provider.experienceYears} yrs exp</span>
        </div>

        {/* Trust & Demo Status Line */}
        <div className="mt-2 flex flex-wrap items-center gap-x-2 text-xs">
          {isVerified && (
            <span className="inline-flex items-center gap-1 font-medium text-[#134E3A]">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>{strings.verifiedLabel}</span>
            </span>
          )}
          <span className={provider.isAvailable ? 'text-[#134E3A]' : 'text-amber-700'}>
            {provider.isAvailable ? 'Available' : 'Busy'}
          </span>
          {provider.isDemo && (
            <>
              <span aria-hidden="true" className="text-[#5A605A]">·</span>
              <span className="text-[#5A605A]">{strings.demoLabel}</span>
            </>
          )}
        </div>

        {reasonText && (
          <p className="mt-2.5 text-xs text-[#134E3A] bg-[#E6F2EC]/60 rounded-md px-2.5 py-1.5">
            {reasonText}
          </p>
        )}

        <p className="mt-3 text-sm text-[#5A605A] line-clamp-2 leading-relaxed">{provider.bio}</p>
      </div>

      {/* Bottom Price & Action Footer */}
      <div className="mt-5 pt-4 border-t border-[#E4E1D8] flex items-center justify-between gap-3">
        <div>
          <span className="block text-[11px] text-[#5A605A]">{strings.startingAt} (est.)</span>
          <span className="font-mono-nums text-base font-semibold text-[#181A18]">
            ₹{provider.startingPrice}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate({ page: 'provider-profile', id: provider.id })}
            className="rounded-lg border border-[#E4E1D8] px-3 py-2 text-xs font-medium text-[#181A18] hover:bg-[#F1EFE9] transition-colors whitespace-nowrap"
          >
            {strings.viewProfile}
          </button>
          <button
            type="button"
            onClick={() =>
              navigate({
                page: 'request-service',
                providerId: provider.id,
                categoryId: provider.categoryIds[0],
                subcategoryId: provider.subcategoryIds[0],
              })
            }
            className="rounded-lg bg-[#134E3A] px-3.5 py-2 text-xs font-medium text-white hover:bg-[#0D3B2B] transition-colors whitespace-nowrap"
          >
            {strings.requestService}
          </button>
        </div>
      </div>
    </motion.article>
  );
};
