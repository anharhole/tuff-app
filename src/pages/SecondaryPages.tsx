import React, { useEffect, useState } from 'react';
import { Bell, CheckCheck, Heart, HelpCircle, ShieldCheck, Star } from 'lucide-react';
import type { Provider, Review } from '../../shared/types.ts';
import { ProviderCard } from '../components/ProviderCard.tsx';
import { useApp, type PageId } from '../context/AppContext.tsx';
import { apiFetch } from '../lib/api.ts';

// 1. NOTIFICATIONS PAGE
export const NotificationsPage: React.FC = () => {
  const { user, notifications, markNotificationRead, navigate } = useApp();

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center space-y-4">
        <h1 className="font-display text-2xl font-bold">Notifications</h1>
        <button
          type="button"
          onClick={() => navigate({ page: 'login' })}
          className="rounded-lg bg-[#134E3A] px-5 py-2.5 text-sm font-semibold text-white"
        >
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#181A18]">Notification Centre</h1>
          <p className="text-sm text-[#5A605A]">
            Real-time updates for quotations, bookings, messages, and service completions.
          </p>
        </div>
        {notifications.some((n) => !n.read) && (
          <button
            type="button"
            onClick={() => markNotificationRead()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E4E1D8] bg-white px-3.5 py-2 text-xs font-semibold text-[#134E3A]"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-xl border border-[#E4E1D8] bg-white p-10 text-center text-sm text-[#5A605A]">
          You are all caught up. No notifications yet.
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => {
                markNotificationRead(n.id);
                navigate({
                  page: (n.linkPage as PageId) || 'home',
                  id: n.linkId,
                  requestId: n.linkPage === 'quotations' ? n.linkId : undefined,
                });
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  markNotificationRead(n.id);
                  navigate({ page: (n.linkPage as PageId) || 'home', id: n.linkId });
                }
              }}
              className={`cursor-pointer rounded-xl border p-4 flex items-start justify-between gap-4 transition-colors ${
                n.read
                  ? 'border-[#E4E1D8] bg-white'
                  : 'border-[#134E3A]/35 bg-[#E6F2EC]/40'
              }`}
            >
              <div className="flex items-start gap-3">
                <Bell className="h-4 w-4 text-[#134E3A] shrink-0 mt-1" />
                <div>
                  <div className="text-sm font-semibold text-[#181A18]">{n.title}</div>
                  <p className="text-xs text-[#5A605A] mt-0.5">{n.body}</p>
                  <div className="text-[11px] text-[#5A605A] mt-1">
                    {new Date(n.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
              {!n.read && (
                <span className="text-[11px] font-semibold text-[#134E3A] shrink-0">New</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// 2. FAVOURITES PAGE
export const FavouritesPage: React.FC = () => {
  const { user, favouriteIds, navigate } = useApp();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    apiFetch<{ providers: Provider[] }>('/api/favourites')
      .then((res) => setProviders(res.providers))
      .catch(() => setProviders([]))
      .finally(() => setLoading(false));
  }, [user, favouriteIds]);

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center space-y-4">
        <h1 className="font-display text-2xl font-bold">Saved Favourites</h1>
        <button
          type="button"
          onClick={() => navigate({ page: 'login' })}
          className="rounded-lg bg-[#134E3A] px-5 py-2.5 text-sm font-semibold text-white"
        >
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-center gap-2.5">
        <Heart className="h-5 w-5 text-[#134E3A]" />
        <h1 className="font-display text-2xl font-bold text-[#181A18]">
          Saved Professionals ({providers.length})
        </h1>
      </div>

      {loading ? (
        <div className="h-48 rounded-xl border border-[#E4E1D8] bg-white animate-pulse" />
      ) : providers.length === 0 ? (
        <div className="rounded-xl border border-[#E4E1D8] bg-white p-10 text-center space-y-3">
          <p className="text-sm text-[#5A605A]">
            You haven’t saved any providers yet. Tap the heart icon on any specialist to keep them
            handy.
          </p>
          <button
            type="button"
            onClick={() => navigate({ page: 'search' })}
            className="rounded-lg bg-[#134E3A] px-4 py-2 text-xs font-semibold text-white"
          >
            Explore Professionals
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {providers.map((p) => (
            <ProviderCard key={p.id} provider={p} />
          ))}
        </div>
      )}
    </div>
  );
};

// 3. REVIEWS PAGE
export const ReviewsPage: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const { navigate } = useApp();

  useEffect(() => {
    apiFetch<{ reviews: Review[] }>('/api/reviews')
      .then((res) => setReviews(res.reviews))
      .catch(() => {});
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#181A18]">
          Verified Household Reviews
        </h1>
        <p className="text-sm text-[#5A605A] mt-1">
          Published reviews from completed LocalConnect bookings across Kerala.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {reviews.map((rev) => (
          <div
            key={rev.id}
            className="rounded-xl border border-[#E4E1D8] bg-white p-5 flex flex-col justify-between space-y-4"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-0.5 text-[#C99B2C]">
                  {Array.from({ length: rev.rating }).map((_, idx) => (
                    <Star key={idx} className="h-4 w-4 fill-[#C99B2C]" />
                  ))}
                </div>
                <span className="text-xs text-[#5A605A]">{rev.serviceName}</span>
              </div>
              <p className="text-sm text-[#181A18] leading-relaxed">“{rev.comment}”</p>
            </div>
            <div className="pt-3 border-t border-[#E4E1D8] flex items-center justify-between text-xs text-[#5A605A]">
              <span className="font-medium text-[#181A18]">{rev.customerName}</span>
              <button
                type="button"
                onClick={() => navigate({ page: 'provider-profile', id: rev.providerId })}
                className="inline-flex items-center gap-1 font-semibold text-[#134E3A] hover:underline"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>View Provider</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// 4. HELP CENTRE & SETUP GUIDE PAGE
export const HelpCentrePage: React.FC = () => {
  const { user, navigate, showToast, setAiDrawerOpen } = useApp();
  const [reason, setReason] = useState('Booking assistance');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const faqs = [
    {
      q: 'Does LocalConnect charge any commission?',
      a: 'No. LocalConnect is a free local services marketplace with zero commission for both households and service providers.',
    },
    {
      q: 'What is the difference between a starting price and a quotation?',
      a: 'Listed starting prices on provider profiles are initial estimates for standard inspection or basic visits. After you describe your issue, providers send an explicit quotation with scope and estimated arrival time.',
    },
    {
      q: 'How does the optional 4-digit completion OTP work?',
      a: 'Once a booking is confirmed, the customer receives a 4-digit OTP. When the provider finishes the work, sharing the OTP verifies completion cleanly.',
    },
    {
      q: 'What should I do in a personal safety emergency?',
      a: 'Always dial 112 (India Unified Emergency Number) for Police, Fire, or Ambulance. LocalConnect providers are independent tradespeople and never emergency responders.',
    },
  ];

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showToast('Please sign in to submit a support ticket', 'info');
      navigate({ page: 'login' });
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch('/api/reports', {
        method: 'POST',
        body: JSON.stringify({
          targetType: 'platform',
          targetId: 'support',
          targetName: 'Customer Support Desk',
          reason,
          details,
        }),
      });
      showToast('Support ticket received! Administrators will review it shortly.', 'success');
      setDetails('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to send ticket', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#181A18] inline-flex items-center gap-2.5">
            <HelpCircle className="h-6 w-6 text-[#134E3A]" />
            <span>Help Centre & Configuration Guide</span>
          </h1>
          <p className="text-sm text-[#5A605A] mt-1">
            Booking assistance, FAQs, reporting a problem, and platform setup instructions.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAiDrawerOpen(true)}
          className="rounded-lg bg-[#134E3A] px-4 py-2.5 text-xs font-semibold text-white"
        >
          Ask LocalConnect AI
        </button>
      </div>

      {/* FAQs */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {faqs.map((f) => (
          <div key={f.q} className="rounded-xl border border-[#E4E1D8] bg-white p-5 space-y-2">
            <h2 className="font-display text-base font-bold text-[#181A18]">{f.q}</h2>
            <p className="text-sm text-[#5A605A] leading-relaxed">{f.a}</p>
          </div>
        ))}
      </section>

      {/* Contact Support / Report a Problem */}
      <section className="rounded-xl border border-[#E4E1D8] bg-white p-6 space-y-4">
        <h2 className="font-display text-xl font-bold text-[#181A18]">
          Report a Problem or Contact Support
        </h2>
        <form onSubmit={handleSupportSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#5A605A] mb-1">Topic</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full sm:w-80 rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] px-3 py-2 text-sm"
            >
              <option>Booking assistance</option>
              <option>Report a technical issue</option>
              <option>Suspicious account report</option>
              <option>Provider onboarding help</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#5A605A] mb-1">
              How can we help?
            </label>
            <textarea
              required
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Describe your question or issue..."
              className="w-full rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] px-3.5 py-2.5 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-[#134E3A] px-5 py-2.5 text-sm font-semibold text-white"
          >
            {submitting ? 'Submitting...' : 'Submit Support Request'}
          </button>
        </form>
      </section>

      {/* Setup & Deployment Reference */}
      <section className="rounded-xl border border-[#E4E1D8] bg-white p-6 space-y-3 text-sm text-[#5A605A]">
        <h2 className="font-display text-lg font-bold text-[#181A18]">
          Technical Configuration & Demo Credentials
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed">
          <div className="rounded-lg bg-[#F8F7F4] p-4 space-y-1.5">
            <div className="font-semibold text-[#181A18]">Demo Accounts (Password: Demo@123 / Admin@123)</div>
            <div>Customer: <code>demo.customer@localconnect.in</code></div>
            <div>Provider: <code>demo.provider@localconnect.in</code></div>
            <div>Admin: <code>admin@localconnect.in</code> (Password: <code>Admin@123</code>)</div>
          </div>
          <div className="rounded-lg bg-[#F8F7F4] p-4 space-y-1.5">
            <div className="font-semibold text-[#181A18]">Environment & AI Integration</div>
            <div>
              Server-side Gemini 4 Hydrogen runs via <code>GEMINI_API_KEY</code> in server
              environment variables (never exposed to browser).
            </div>
            <div>
              Maps use Leaflet + OpenStreetMap tiles (zero key required). Persistent store runs in{' '}
              <code>data/localconnect-store.json</code> and can be paired with Firebase when enabled.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
