import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Award,
  Calendar,
  Clock,
  Flag,
  Heart,
  Image as ImageIcon,
  MapPin,
  MessageCircle,
  MessageSquare,
  Phone,
  ShieldCheck,
  Star,
} from 'lucide-react';
import type { Provider, ProviderAchievement, Review } from '../../shared/types.ts';
import { ProviderCard } from '../components/ProviderCard.tsx';
import { useApp } from '../context/AppContext.tsx';
import { apiFetch } from '../lib/api.ts';

export const ProviderProfilePage: React.FC = () => {
  const { user, lowInternetMode, favouriteIds, toggleFavourite, route, navigate, showToast } =
    useApp();

  const [provider, setProvider] = useState<Provider | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [similar, setSimilar] = useState<Provider[]>([]);
  const [achievements, setAchievements] = useState<ProviderAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPortfolioModal, setShowPortfolioModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('Inaccurate pricing or listing');
  const [reportDetails, setReportDetails] = useState('');

  useEffect(() => {
    if (!route.id) return;
    let active = true;
    setLoading(true);
    apiFetch<{
      provider: Provider;
      reviews: Review[];
      similar: Provider[];
      achievements?: ProviderAchievement[];
    }>(`/api/providers/${route.id}`)
      .then((res) => {
        if (!active) return;
        setProvider(res.provider);
        setReviews(res.reviews);
        setSimilar(res.similar);
        setAchievements(res.achievements || []);
      })
      .catch(() => {
        if (active) setProvider(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [route.id]);

  const handleStartChat = async () => {
    if (!provider) return;
    if (!user) {
      showToast('Please sign in to chat with this provider', 'info');
      navigate({ page: 'login' });
      return;
    }
    try {
      const res = await apiFetch<{ conversation: { id: string } }>('/api/conversations/start', {
        method: 'POST',
        body: JSON.stringify({ providerId: provider.id }),
      });
      navigate({ page: 'chat', id: res.conversation.id });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not open chat', 'error');
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provider) return;
    if (!user) {
      showToast('Please sign in to submit a report', 'info');
      navigate({ page: 'login' });
      return;
    }
    try {
      await apiFetch('/api/reports', {
        method: 'POST',
        body: JSON.stringify({
          targetType: 'provider',
          targetId: provider.id,
          targetName: provider.name,
          reason: reportReason,
          details: reportDetails,
        }),
      });
      showToast('Report submitted for administrator review', 'success');
      setShowReportModal(false);
      setReportDetails('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to submit report', 'error');
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
        <div className="h-72 rounded-xl border border-[#E4E1D8] bg-white animate-pulse" />
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-12 text-center space-y-4">
        <h1 className="font-display text-2xl font-bold">Provider Not Found</h1>
        <button
          type="button"
          onClick={() => navigate({ page: 'search' })}
          className="rounded-lg bg-[#134E3A] px-4 py-2 text-sm font-medium text-white"
        >
          Back to Search
        </button>
      </div>
    );
  }

  const isFav = favouriteIds.includes(provider.id);
  const initials = provider.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 space-y-10">
      <button
        type="button"
        onClick={() => navigate({ page: 'search' })}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5A605A] hover:text-[#134E3A]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Back to Professionals</span>
      </button>

      {/* Main Profile Header Card */}
      <section className="rounded-xl border border-[#E4E1D8] bg-white p-6 sm:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex items-start gap-5">
            {!lowInternetMode && provider.avatarUrl ? (
              <img
                src={provider.avatarUrl}
                alt={provider.name}
                referrerPolicy="no-referrer"
                className="h-20 w-20 sm:h-24 sm:w-24 rounded-xl object-cover border border-[#E4E1D8] shrink-0"
              />
            ) : (
              <div className="flex h-20 w-20 sm:h-24 sm:w-24 shrink-0 items-center justify-center rounded-xl bg-[#E6F2EC] font-display text-2xl font-bold text-[#134E3A]">
                {initials}
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#181A18]">
                  {provider.name}
                </h1>
                {provider.isDemo && (
                  <span className="text-xs font-medium text-[#5A605A] border border-[#E4E1D8] rounded px-2 py-0.5">
                    Demo Profile
                  </span>
                )}
              </div>
              <p className="text-sm sm:text-base text-[#5A605A] font-medium">{provider.title}</p>

              {/* Unboxed Metadata */}
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs sm:text-sm text-[#5A605A] pt-1">
                <span className="inline-flex items-center gap-1 font-semibold text-[#181A18]">
                  <Star className="h-4 w-4 fill-[#C99B2C] text-[#C99B2C]" />
                  <span className="font-mono-nums">{provider.rating.toFixed(1)}</span>
                  <span className="font-normal text-[#5A605A]">
                    ({provider.reviewCount} reviews)
                  </span>
                </span>
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {provider.locality}, {provider.town}, {provider.district} ({provider.pincode})
                </span>
                <span>·</span>
                <span>{provider.experienceYears} years experience</span>
                <span>·</span>
                <span className="font-mono-nums">{provider.completedJobs} jobs completed</span>
              </div>

              {/* Verification Status Line */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs font-medium text-[#134E3A]">
                {provider.identityVerified && (
                  <span className="inline-flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Identity Verified {provider.isDemo ? '(Simulated)' : ''}
                  </span>
                )}
                {provider.skillVerified && (
                  <span className="inline-flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Skill Verified
                  </span>
                )}
                {provider.profileVerified && (
                  <span className="inline-flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Profile Verified
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:items-end gap-2 shrink-0">
            <div className="text-xs text-[#5A605A]">Listed starting price (estimate)</div>
            <div className="font-mono-nums text-2xl font-bold text-[#134E3A]">
              ₹{provider.startingPrice}
            </div>
            <div className="text-xs text-[#5A605A]">
              Status:{' '}
              <span className={provider.isAvailable ? 'text-[#134E3A] font-semibold' : 'text-amber-700 font-semibold'}>
                {provider.isAvailable ? 'Available for requests' : 'Currently busy'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="pt-4 border-t border-[#E4E1D8] flex flex-wrap items-center gap-2.5">
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
            className="rounded-lg bg-[#134E3A] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0D3B2B] transition-colors"
          >
            Request Service
          </button>

          <button
            type="button"
            onClick={handleStartChat}
            className="inline-flex items-center gap-2 rounded-lg border border-[#134E3A] bg-white px-4 py-2.5 text-sm font-semibold text-[#134E3A] hover:bg-[#E6F2EC]"
          >
            <MessageSquare className="h-4 w-4" />
            <span>Chat</span>
          </button>

          <a
            href={`tel:${provider.phone.replace(/\s+/g, '')}`}
            className="inline-flex items-center gap-2 rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] px-4 py-2.5 text-sm font-medium text-[#181A18] hover:bg-[#F1EFE9]"
          >
            <Phone className="h-4 w-4 text-[#134E3A]" />
            <span>Call</span>
          </a>

          <a
            href={`https://wa.me/${provider.whatsapp}?text=${encodeURIComponent(
              `Hello ${provider.name}, I found your profile on LocalConnect and would like to enquire about a service.`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] px-4 py-2.5 text-sm font-medium text-[#181A18] hover:bg-[#F1EFE9]"
          >
            <MessageCircle className="h-4 w-4 text-[#134E3A]" />
            <span>WhatsApp</span>
          </a>

          <button
            type="button"
            onClick={() => setShowPortfolioModal(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-[#E4E1D8] bg-white px-4 py-2.5 text-sm font-medium text-[#181A18] hover:bg-[#F1EFE9]"
          >
            <ImageIcon className="h-4 w-4" />
            <span>View Portfolio ({provider.portfolioImages.length})</span>
          </button>

          <button
            type="button"
            onClick={() => toggleFavourite(provider.id)}
            className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
              isFav
                ? 'border-[#134E3A]/30 bg-[#E6F2EC] text-[#134E3A]'
                : 'border-[#E4E1D8] bg-white text-[#181A18]'
            }`}
          >
            <Heart className={`h-4 w-4 ${isFav ? 'fill-[#134E3A]' : ''}`} />
            <span>{isFav ? 'Saved' : 'Save Favourite'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowReportModal(true)}
            className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-[#5A605A] hover:text-[#B91C1C]"
          >
            <Flag className="h-3.5 w-3.5" />
            <span>Report Provider</span>
          </button>
        </div>
      </section>

      {/* Details Split: About + Hours & Radius + Services Offered */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-xl border border-[#E4E1D8] bg-white p-6 space-y-3">
            <h2 className="font-display text-lg font-bold text-[#181A18]">About</h2>
            <p className="text-sm text-[#5A605A] leading-relaxed">{provider.bio}</p>
          </div>

          <div className="rounded-xl border border-[#E4E1D8] bg-white p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-[#181A18]">Services & Starting Prices</h2>
              <span className="text-xs text-[#5A605A]">Estimates only; final via quotation</span>
            </div>
            <div className="divide-y divide-[#E4E1D8]">
              {provider.services.map((srv) => (
                <div key={srv.id} className="py-3.5 flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-[#181A18]">{srv.name}</div>
                    <p className="text-xs text-[#5A605A] mt-0.5">{srv.description}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono-nums text-sm font-bold text-[#134E3A]">
                      ₹{srv.startingPrice}
                    </div>
                    <div className="text-[11px] text-[#5A605A]">per {srv.priceUnit}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-xl border border-[#E4E1D8] bg-white p-6 space-y-4">
            <h2 className="font-display text-lg font-bold text-[#181A18]">
              Working Hours & Service Area
            </h2>
            <div className="space-y-3 text-sm text-[#5A605A]">
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-[#134E3A] shrink-0" />
                <span>Working hours: <strong className="text-[#181A18]">{provider.workingHours}</strong></span>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-[#134E3A] shrink-0" />
                <span>Days: <strong className="text-[#181A18]">{provider.availableDays.join(', ')}</strong></span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-[#134E3A] shrink-0" />
                <span>
                  Covers up to <strong className="font-mono-nums text-[#181A18]">{provider.serviceRadiusKm} km</strong> around {provider.town}
                </span>
              </div>
            </div>
          </div>

          {/* Earned Achievement Badges */}
          <div className="rounded-xl border border-[#E4E1D8] bg-white p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-[#181A18] flex items-center gap-2">
                <Award className="h-4 w-4 text-[#B68A1E]" />
                <span>Verified Achievements</span>
              </h2>
              <button
                type="button"
                data-compact="true"
                onClick={() => navigate({ page: 'achievements', providerId: provider.id })}
                className="text-xs font-semibold text-[#134E3A] hover:underline"
              >
                All Milestones
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {achievements.filter((a) => a.earned).length === 0 ? (
                <p className="text-xs text-[#5A605A]">
                  Building verified job milestones on LocalConnect.
                </p>
              ) : (
                achievements
                  .filter((a) => a.earned)
                  .map((badge) => (
                    <span
                      key={badge.id}
                      title={badge.ruleLabel}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#134E3A]/20 bg-[#E6F2EC]/70 px-2.5 py-1 text-xs font-semibold text-[#134E3A]"
                    >
                      <Star className="h-3 w-3 fill-[#C99B2C] text-[#C99B2C]" />
                      <span>{badge.title}</span>
                    </span>
                  ))
              )}
            </div>
          </div>

          {/* Portfolio Preview */}
          {!lowInternetMode && provider.portfolioImages.length > 0 && (
            <div className="rounded-xl border border-[#E4E1D8] bg-white p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-bold text-[#181A18]">Work Portfolio</h2>
                <button
                  type="button"
                  onClick={() => setShowPortfolioModal(true)}
                  className="text-xs font-semibold text-[#134E3A] hover:underline"
                >
                  Expand
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {provider.portfolioImages.map((img, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setShowPortfolioModal(true)}
                    className="aspect-[4/3] rounded-lg overflow-hidden border border-[#E4E1D8] bg-[#F1EFE9]"
                  >
                    <img
                      src={img}
                      alt={`${provider.name} work sample ${i + 1}`}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Customer Reviews */}
      <section className="rounded-xl border border-[#E4E1D8] bg-white p-6 space-y-5">
        <h2 className="font-display text-xl font-bold text-[#181A18]">
          Customer Reviews ({reviews.length})
        </h2>
        {reviews.length === 0 ? (
          <p className="text-sm text-[#5A605A]">
            No written reviews yet. Complete a booking with {provider.name} to leave the first verified review.
          </p>
        ) : (
          <div className="divide-y divide-[#E4E1D8]">
            {reviews.map((r) => (
              <div key={r.id} className="py-4 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[#181A18]">{r.customerName}</span>
                    <span className="text-xs text-[#5A605A]">· {r.serviceName}</span>
                  </div>
                  <div className="flex items-center gap-0.5 text-[#C99B2C]">
                    {Array.from({ length: r.rating }).map((_, idx) => (
                      <Star key={idx} className="h-3.5 w-3.5 fill-[#C99B2C]" />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-[#5A605A] leading-relaxed">{r.comment}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Similar Providers */}
      {similar.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-display text-xl font-bold text-[#181A18]">
            Other Professionals in This Category
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {similar.map((s) => (
              <ProviderCard key={s.id} provider={s} />
            ))}
          </div>
        </section>
      )}

      {/* Portfolio Modal */}
      {showPortfolioModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-3xl rounded-xl bg-white p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold">{provider.name} — Work Portfolio</h3>
              <button
                type="button"
                onClick={() => setShowPortfolioModal(false)}
                className="rounded-lg border border-[#E4E1D8] px-3 py-1.5 text-xs font-medium"
              >
                Close
              </button>
            </div>
            {provider.portfolioImages.length === 0 ? (
              <p className="text-sm text-[#5A605A] py-8 text-center">
                No portfolio images uploaded yet.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {provider.portfolioImages.map((img, i) => (
                  <img
                    key={i}
                    src={img}
                    alt={`${provider.name} work ${i + 1}`}
                    referrerPolicy="no-referrer"
                    className="w-full aspect-[4/3] object-cover rounded-lg border border-[#E4E1D8]"
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={handleReportSubmit}
            className="w-full max-w-md rounded-xl bg-white p-6 space-y-4 border border-[#E4E1D8]"
          >
            <h3 className="font-display text-lg font-bold text-[#181A18]">
              Report {provider.name}
            </h3>
            <p className="text-xs text-[#5A605A]">
              Reports are reviewed by LocalConnect administrators to maintain community trust.
            </p>
            <div>
              <label className="block text-xs font-semibold text-[#5A605A] mb-1">Reason</label>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full rounded-lg border border-[#E4E1D8] px-3 py-2 text-sm"
              >
                <option>Inaccurate pricing or listing</option>
                <option>Suspicious account or impersonation</option>
                <option>Unprofessional conduct</option>
                <option>No-show after confirmation</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#5A605A] mb-1">Details</label>
              <textarea
                required
                rows={3}
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder="Describe what happened..."
                className="w-full rounded-lg border border-[#E4E1D8] px-3 py-2 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="rounded-lg border border-[#E4E1D8] px-4 py-2 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-[#B91C1C] px-4 py-2 text-xs font-semibold text-white"
              >
                Submit Report
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
