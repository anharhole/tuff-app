import React, { useCallback, useEffect, useState } from 'react';
import {
  Award,
  BellRing,
  Briefcase,
  CheckCircle2,
  Eye,
  Heart,
  History,
  MapPin,
  MessageSquare,
  Plus,
  PlusCircle,
  ShieldCheck,
  Star,
  Trash2,
  Upload,
} from 'lucide-react';
import { KERALA_DISTRICTS } from '../../shared/keralaData.ts';
import type {
  Booking,
  LanguageCode,
  Provider,
  ProviderAchievement,
  ProviderService,
  Quotation,
  Review,
  ServiceReminder,
  ServiceRequest,
  UserAddress,
} from '../../shared/types.ts';
import { ProviderCard } from '../components/ProviderCard.tsx';
import { useApp } from '../context/AppContext.tsx';
import { apiFetch } from '../lib/api.ts';

interface RequestWithQuotes extends ServiceRequest {
  quotations: Quotation[];
}

// 1. CUSTOMER DASHBOARD
export const CustomerDashboardPage: React.FC = () => {
  const { user, selectedLocation, refreshAuth, navigate, switchRole, showToast, realtimeTick } =
    useApp();
  const [requests, setRequests] = useState<RequestWithQuotes[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [recommendations, setRecommendations] = useState<
    Array<{ provider: Provider; reason: string }>
  >([]);
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [reminders, setReminders] = useState<ServiceReminder[]>([]);
  const [newAddrLabel, setNewAddrLabel] = useState('');
  const [newAddrLocality, setNewAddrLocality] = useState('');
  const [newRemTitle, setNewRemTitle] = useState('');
  const [newRemDate, setNewRemDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  );

  useEffect(() => {
    if (!user) return;
    Promise.all([
      apiFetch<{ requests: RequestWithQuotes[] }>('/api/requests'),
      apiFetch<{ bookings: Booking[] }>('/api/bookings'),
      apiFetch<{ recommendations: Array<{ provider: Provider; reason: string }> }>(
        `/api/providers/recommendations?town=${encodeURIComponent(selectedLocation.town)}`
      ),
      apiFetch<{ addresses: UserAddress[] }>('/api/addresses'),
      apiFetch<{ reminders: ServiceReminder[] }>('/api/reminders'),
    ])
      .then(([reqRes, bookRes, recRes, addrRes, remRes]) => {
        setRequests(reqRes.requests);
        setBookings(bookRes.bookings);
        setRecommendations(recRes.recommendations.slice(0, 3));
        setAddresses(addrRes.addresses);
        setReminders(remRes.reminders);
      })
      .catch(() => {});
  }, [user, selectedLocation, realtimeTick]);

  const addAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddrLabel.trim() || !newAddrLocality.trim()) return;
    try {
      const res = await apiFetch<{ address: UserAddress }>('/api/addresses', {
        method: 'POST',
        body: JSON.stringify({
          label: newAddrLabel.trim(),
          town: selectedLocation.town,
          district: selectedLocation.district,
          locality: newAddrLocality.trim(),
          addressLine: `${newAddrLocality.trim()}, ${selectedLocation.town}`,
          pincode: selectedLocation.pincode,
        }),
      });
      setAddresses((prev) => [res.address, ...prev]);
      setNewAddrLabel('');
      setNewAddrLocality('');
      showToast('Address saved', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to save address', 'error');
    }
  };

  const deleteAddress = async (id: string) => {
    await apiFetch(`/api/addresses/${id}`, { method: 'DELETE' }).catch(() => {});
    setAddresses((prev) => prev.filter((a) => a.id !== id));
  };

  const addReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRemTitle.trim()) return;
    try {
      const res = await apiFetch<{ reminder: ServiceReminder }>('/api/reminders', {
        method: 'POST',
        body: JSON.stringify({
          title: newRemTitle.trim(),
          dueDate: newRemDate,
          cadence: 'yearly',
        }),
      });
      setReminders((prev) => [res.reminder, ...prev]);
      setNewRemTitle('');
      showToast('Service reminder added', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to add reminder', 'error');
    }
  };

  const toggleReminder = async (rem: ServiceReminder) => {
    const res = await apiFetch<{ reminder: ServiceReminder }>(`/api/reminders/${rem.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ completed: !rem.completed }),
    });
    setReminders((prev) => prev.map((r) => (r.id === rem.id ? res.reminder : r)));
  };

  const clearSearchHistory = async () => {
    await apiFetch('/api/auth/search-history', { method: 'DELETE' });
    await refreshAuth();
    showToast('Search history cleared', 'info');
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center space-y-4">
        <h1 className="font-display text-2xl font-bold">Customer Dashboard</h1>
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

  const totalQuotes = requests.reduce((acc, r) => acc + (r.quotations?.length || 0), 0);
  const activeBookings = bookings.filter(
    (b) => b.status !== 'service_completed' && b.status !== 'cancelled'
  );

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#181A18]">
            Welcome, {user.name.split(' ')[0]}
          </h1>
          <p className="text-sm text-[#5A605A]">
            {user.locality}, {user.town}, {user.district} ({user.pincode})
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => navigate({ page: 'request-service' })}
            className="inline-flex items-center gap-2 rounded-lg bg-[#134E3A] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#0D3B2B]"
          >
            <PlusCircle className="h-4 w-4" />
            <span>New Request</span>
          </button>
          {user.canSwitchToProvider && (
            <button
              type="button"
              onClick={() => switchRole('provider')}
              className="rounded-lg border border-[#E4E1D8] bg-white px-4 py-2.5 text-xs font-semibold text-[#181A18] hover:border-[#134E3A]"
            >
              Switch to Provider Mode
            </button>
          )}
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Service Requests', value: requests.length, page: 'quotations' as const },
          { label: 'Quotations Received', value: totalQuotes, page: 'quotations' as const },
          { label: 'Active Bookings', value: activeBookings.length, page: 'booking-history' as const },
          { label: 'Completed Jobs', value: bookings.filter((b) => b.status === 'service_completed').length, page: 'booking-history' as const },
        ].map((kpi) => (
          <button
            key={kpi.label}
            type="button"
            onClick={() => navigate({ page: kpi.page })}
            className="text-left rounded-xl border border-[#E4E1D8] bg-white p-5 hover:border-[#134E3A] transition-colors"
          >
            <div className="text-xs text-[#5A605A]">{kpi.label}</div>
            <div className="font-mono-nums text-2xl font-bold text-[#134E3A] mt-1">
              {kpi.value}
            </div>
          </button>
        ))}
      </div>

      {/* Active Requests & Bookings Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-xl border border-[#E4E1D8] bg-white p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">My Requests & Quotations</h2>
            <button
              type="button"
              onClick={() => navigate({ page: 'quotations' })}
              className="text-xs font-semibold text-[#134E3A] hover:underline"
            >
              Compare All →
            </button>
          </div>
          {requests.length === 0 ? (
            <p className="text-sm text-[#5A605A]">No active requests yet.</p>
          ) : (
            <div className="space-y-3">
              {requests.slice(0, 4).map((r) => (
                <div
                  key={r.id}
                  onClick={() => navigate({ page: 'quotations', requestId: r.id })}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') navigate({ page: 'quotations', requestId: r.id });
                  }}
                  className="cursor-pointer rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] p-3.5 flex items-center justify-between gap-3 hover:border-[#134E3A]"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[#181A18] truncate">{r.title}</div>
                    <div className="text-xs text-[#5A605A] capitalize">
                      {r.status.replace(/_/g, ' ')} · {r.preferredDate}
                    </div>
                  </div>
                  <span className="font-mono-nums text-xs font-semibold text-[#134E3A] shrink-0">
                    {r.quotations?.length || 0} quotes
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-[#E4E1D8] bg-white p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Bookings</h2>
            <button
              type="button"
              onClick={() => navigate({ page: 'booking-history' })}
              className="text-xs font-semibold text-[#134E3A] hover:underline"
            >
              View History →
            </button>
          </div>
          {bookings.length === 0 ? (
            <p className="text-sm text-[#5A605A]">No bookings confirmed yet.</p>
          ) : (
            <div className="space-y-3">
              {bookings.slice(0, 4).map((b) => (
                <div
                  key={b.id}
                  onClick={() => navigate({ page: 'booking-details', id: b.id })}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') navigate({ page: 'booking-details', id: b.id });
                  }}
                  className="cursor-pointer rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] p-3.5 flex items-center justify-between gap-3 hover:border-[#134E3A]"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[#181A18] truncate">
                      {b.serviceTitle}
                    </div>
                    <div className="text-xs text-[#5A605A]">
                      {b.providerName} · {b.status.replace(/_/g, ' ')}
                    </div>
                  </div>
                  <span className="font-mono-nums text-sm font-bold text-[#134E3A] shrink-0">
                    ₹{b.agreedPrice}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Saved Addresses, Service Reminders & Search History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="rounded-xl border border-[#E4E1D8] bg-white p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-[#181A18]">
            <MapPin className="h-4 w-4 text-[#134E3A]" />
            <span>Saved Kerala Addresses</span>
          </div>
          <div className="space-y-2">
            {addresses.map((a) => (
              <div
                key={a.id}
                className="rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] p-2.5 flex items-center justify-between gap-2 text-xs"
              >
                <div>
                  <div className="font-semibold text-[#181A18]">{a.label}</div>
                  <div className="text-[#5A605A]">
                    {a.locality}, {a.town} ({a.pincode})
                  </div>
                </div>
                <button
                  type="button"
                  data-compact="true"
                  onClick={() => deleteAddress(a.id)}
                  aria-label="Delete saved address"
                  className="text-[#B91C1C] p-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <form onSubmit={addAddress} className="space-y-2 pt-2 border-t border-[#E4E1D8]">
            <input
              type="text"
              placeholder="Label (e.g. Home, Office)"
              value={newAddrLabel}
              onChange={(e) => setNewAddrLabel(e.target.value)}
              className="w-full rounded-lg border border-[#E4E1D8] px-3 py-1.5 text-xs"
            />
            <div className="flex gap-2">
              <input
                type="text"
                placeholder={`Locality in ${selectedLocation.town}`}
                value={newAddrLocality}
                onChange={(e) => setNewAddrLocality(e.target.value)}
                className="flex-1 rounded-lg border border-[#E4E1D8] px-3 py-1.5 text-xs"
              />
              <button
                type="submit"
                className="rounded-lg bg-[#134E3A] px-3 py-1.5 text-xs font-semibold text-white"
              >
                Add
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-xl border border-[#E4E1D8] bg-white p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-[#181A18]">
            <BellRing className="h-4 w-4 text-[#B68A1E]" />
            <span>Service Reminders</span>
          </div>
          <div className="space-y-2">
            {reminders.map((rem) => (
              <div
                key={rem.id}
                className="rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] p-2.5 flex items-center justify-between gap-2 text-xs"
              >
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rem.completed}
                    onChange={() => toggleReminder(rem)}
                    className="mt-0.5 accent-[#134E3A]"
                  />
                  <div>
                    <div
                      className={`font-semibold ${
                        rem.completed ? 'line-through text-[#5A605A]' : 'text-[#181A18]'
                      }`}
                    >
                      {rem.title}
                    </div>
                    <div className="text-[#5A605A]">Due: {rem.dueDate}</div>
                  </div>
                </label>
                <button
                  type="button"
                  data-compact="true"
                  onClick={() =>
                    navigate({
                      page: 'request-service',
                      categoryId: rem.categoryId,
                      draftTitle: rem.title,
                    })
                  }
                  className="text-[#134E3A] font-semibold hover:underline shrink-0"
                >
                  Book
                </button>
              </div>
            ))}
          </div>
          <form onSubmit={addReminder} className="space-y-2 pt-2 border-t border-[#E4E1D8]">
            <input
              type="text"
              placeholder="e.g. Annual AC gas & filter check"
              value={newRemTitle}
              onChange={(e) => setNewRemTitle(e.target.value)}
              className="w-full rounded-lg border border-[#E4E1D8] px-3 py-1.5 text-xs"
            />
            <div className="flex gap-2">
              <input
                type="date"
                value={newRemDate}
                onChange={(e) => setNewRemDate(e.target.value)}
                className="flex-1 rounded-lg border border-[#E4E1D8] px-3 py-1.5 text-xs"
              />
              <button
                type="submit"
                className="rounded-lg bg-[#134E3A] px-3 py-1.5 text-xs font-semibold text-white"
              >
                Save
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-xl border border-[#E4E1D8] bg-white p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-[#181A18]">
              <History className="h-4 w-4 text-[#134E3A]" />
              <span>Recent Search History</span>
            </div>
            {user.searchHistory.length > 0 && (
              <button
                type="button"
                data-compact="true"
                onClick={clearSearchHistory}
                className="text-xs font-medium text-[#B91C1C] hover:underline"
              >
                Clear
              </button>
            )}
          </div>
          {user.searchHistory.length === 0 ? (
            <p className="text-xs text-[#5A605A]">
              Your recent service searches will appear here so you can repeat them in one tap.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {user.searchHistory.map((term) => (
                <button
                  key={term}
                  type="button"
                  data-compact="true"
                  onClick={() => navigate({ page: 'search', q: term })}
                  className="rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] px-3 py-1.5 text-xs font-medium text-[#181A18] hover:border-[#134E3A]"
                >
                  {term}
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-display text-xl font-bold text-[#181A18]">
            Recommended Professionals
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {recommendations.map(({ provider, reason }) => (
              <ProviderCard key={provider.id} provider={provider} reasonText={reason} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

// 2. PROVIDER DASHBOARD
export const ProviderDashboardPage: React.FC = () => {
  const { user, providerProfile, navigate, switchRole, showToast, realtimeTick } = useApp();
  const [requests, setRequests] = useState<RequestWithQuotes[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [myQuotes, setMyQuotes] = useState<Quotation[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [achievements, setAchievements] = useState<ProviderAchievement[]>([]);
  const [quotingReqId, setQuotingReqId] = useState<string | null>(null);
  const [quotePrice, setQuotePrice] = useState('450');
  const [quoteEta, setQuoteEta] = useState('On requested slot');
  const [quoteDesc, setQuoteDesc] = useState('');

  const loadAll = useCallback(async () => {
    if (!user || !providerProfile) return;
    try {
      const [reqRes, bookRes, qRes, revRes, achRes] = await Promise.all([
        apiFetch<{ requests: RequestWithQuotes[] }>('/api/requests'),
        apiFetch<{ bookings: Booking[] }>('/api/bookings'),
        apiFetch<{ quotations: Quotation[] }>('/api/quotations'),
        apiFetch<{ reviews: Review[] }>(`/api/reviews?providerId=${providerProfile.id}`),
        apiFetch<{ achievements: ProviderAchievement[] }>(
          `/api/providers/${providerProfile.id}/achievements`
        ),
      ]);
      setRequests(reqRes.requests);
      setBookings(bookRes.bookings);
      setMyQuotes(qRes.quotations);
      setReviews(revRes.reviews);
      setAchievements(achRes.achievements);
    } catch {
      // ignore
    }
  }, [user, providerProfile]);

  useEffect(() => {
    loadAll();
  }, [loadAll, realtimeTick]);

  const submitQuote = async (e: React.FormEvent, requestId: string) => {
    e.preventDefault();
    try {
      await apiFetch('/api/quotations', {
        method: 'POST',
        body: JSON.stringify({
          requestId,
          estimatedPrice: Number(quotePrice),
          estimatedArrival: quoteEta,
          description: quoteDesc,
        }),
      });
      showToast('Quotation sent to customer!', 'success');
      setQuotingReqId(null);
      setQuoteDesc('');
      loadAll();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to submit quotation', 'error');
    }
  };

  const declineRequest = async (requestId: string) => {
    try {
      await apiFetch(`/api/requests/${requestId}/decline`, { method: 'POST' });
      showToast('Service request declined', 'info');
      if (quotingReqId === requestId) setQuotingReqId(null);
      loadAll();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to decline request', 'error');
    }
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center space-y-4">
        <h1 className="font-display text-2xl font-bold">Provider Dashboard</h1>
        <button
          type="button"
          onClick={() => navigate({ page: 'login' })}
          className="rounded-lg bg-[#134E3A] px-5 py-2.5 text-sm font-semibold text-white"
        >
          Sign In / Try Demo Provider
        </button>
      </div>
    );
  }

  const acceptedQuotesCount = myQuotes.filter((q) => q.status === 'accepted').length;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#181A18]">
            Provider Workspace — {providerProfile?.name || user.name}
          </h1>
          <p className="text-sm text-[#5A605A]">
            {providerProfile?.title} · {providerProfile?.town}, {providerProfile?.district}
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => navigate({ page: 'provider-profile-manage' })}
            className="rounded-lg bg-[#134E3A] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#0D3B2B]"
          >
            Manage Profile & Services
          </button>
          <button
            type="button"
            onClick={() => switchRole('customer')}
            className="rounded-lg border border-[#E4E1D8] bg-white px-4 py-2.5 text-xs font-semibold text-[#181A18]"
          >
            Switch to Customer View
          </button>
        </div>
      </div>

      {/* Real Stored Provider Analytics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="rounded-xl border border-[#E4E1D8] bg-white p-4">
          <div className="text-xs text-[#5A605A]">Matching Requests</div>
          <div className="font-mono-nums text-2xl font-bold text-[#181A18] mt-1">
            {requests.length}
          </div>
        </div>
        <div className="rounded-xl border border-[#E4E1D8] bg-white p-4">
          <div className="text-xs text-[#5A605A]">Accepted Quotes</div>
          <div className="font-mono-nums text-2xl font-bold text-[#134E3A] mt-1">
            {acceptedQuotesCount}
          </div>
        </div>
        <div className="rounded-xl border border-[#E4E1D8] bg-white p-4">
          <div className="text-xs text-[#5A605A]">Completed Services</div>
          <div className="font-mono-nums text-2xl font-bold text-[#134E3A] mt-1">
            {providerProfile?.completedJobs ?? 0}
          </div>
        </div>
        <div className="rounded-xl border border-[#E4E1D8] bg-white p-4">
          <div className="text-xs text-[#5A605A]">Average Rating</div>
          <div className="font-mono-nums text-2xl font-bold text-[#181A18] mt-1 inline-flex items-center gap-1">
            <Star className="h-4 w-4 fill-[#C99B2C] text-[#C99B2C]" />
            {(providerProfile?.rating ?? 5).toFixed(1)}
          </div>
        </div>
        <div className="rounded-xl border border-[#E4E1D8] bg-white p-4">
          <div className="text-xs text-[#5A605A]">Profile Views</div>
          <div className="font-mono-nums text-2xl font-bold text-[#181A18] mt-1 inline-flex items-center gap-1.5">
            <Eye className="h-4 w-4 text-[#5A605A]" />
            {providerProfile?.profileViews ?? 0}
          </div>
        </div>
      </div>

      {/* Automatic Achievements Strip */}
      {providerProfile && (
        <section className="rounded-xl border border-[#134E3A]/25 bg-[#E6F2EC]/50 p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-bold text-[#181A18]">
              <Award className="h-4 w-4 text-[#B68A1E]" />
              <span>
                Verified Achievement Badges ({achievements.filter((a) => a.earned).length}/
                {achievements.length || 10} earned)
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {achievements
                .filter((a) => a.earned)
                .slice(0, 6)
                .map((b) => (
                  <span
                    key={b.id}
                    className="rounded border border-[#134E3A]/20 bg-white px-2 py-0.5 text-[11px] font-semibold text-[#134E3A]"
                  >
                    ★ {b.title}
                  </span>
                ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate({ page: 'achievements', providerId: providerProfile.id })}
            className="rounded-lg bg-[#134E3A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0D3B2B]"
          >
            Inspect All Milestones
          </button>
        </section>
      )}

      {/* Incoming Customer Requests */}
      <section className="rounded-xl border border-[#E4E1D8] bg-white p-6 space-y-5">
        <h2 className="font-display text-xl font-bold text-[#181A18]">
          Customer Service Requests ({requests.length})
        </h2>

        {requests.length === 0 ? (
          <p className="text-sm text-[#5A605A]">
            No matching requests right now. Make sure your availability and service subcategories are
            up to date.
          </p>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => {
              const alreadyQuoted = myQuotes.find((q) => q.requestId === req.id);
              const isDeclinedByMe =
                providerProfile && req.declinedByProviderIds?.includes(providerProfile.id);
              return (
                <div
                  key={req.id}
                  className="rounded-xl border border-[#E4E1D8] bg-[#F8F7F4] p-5 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div>
                      <h3 className="font-display text-base font-bold text-[#181A18]">
                        {req.title}
                      </h3>
                      <p className="text-sm text-[#5A605A] mt-1">{req.description}</p>
                      <div className="text-xs text-[#5A605A] mt-1.5">
                        Customer: {req.customerName} · {req.locality}, {req.town} · Preferred:{' '}
                        {req.preferredDate} ({req.preferredTime})
                      </div>
                    </div>

                    {alreadyQuoted ? (
                      <div className="shrink-0 text-right">
                        <div className="font-mono-nums text-sm font-bold text-[#134E3A]">
                          Quoted ₹{alreadyQuoted.estimatedPrice}
                        </div>
                        <div className="text-xs text-[#5A605A] capitalize">
                          Status: {alreadyQuoted.status}
                        </div>
                      </div>
                    ) : isDeclinedByMe ? (
                      <span className="shrink-0 text-xs font-semibold text-[#5A605A] px-2.5 py-1 rounded border border-[#E4E1D8] bg-white">
                        Declined
                      </span>
                    ) : req.status !== 'cancelled' && req.status !== 'booking_confirmed' ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => declineRequest(req.id)}
                          className="rounded-lg border border-[#E4E1D8] bg-white px-3.5 py-2 text-xs font-medium text-[#5A605A] hover:text-[#B91C1C] hover:border-red-200"
                        >
                          Decline
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setQuotingReqId(quotingReqId === req.id ? null : req.id)
                          }
                          className="rounded-lg bg-[#134E3A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0D3B2B]"
                        >
                          {quotingReqId === req.id ? 'Close Form' : 'Submit Quotation'}
                        </button>
                      </div>
                    ) : null}
                  </div>

                  {quotingReqId === req.id && (
                    <form
                      onSubmit={(e) => submitQuote(e, req.id)}
                      className="border-t border-[#E4E1D8] pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white rounded-lg p-4"
                    >
                      <div>
                        <label className="block text-xs font-semibold text-[#5A605A] mb-1">
                          Estimated Price (₹)
                        </label>
                        <input
                          type="number"
                          required
                          min={50}
                          value={quotePrice}
                          onChange={(e) => setQuotePrice(e.target.value)}
                          className="w-full rounded-lg border border-[#E4E1D8] px-3 py-2 text-sm font-mono-nums"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#5A605A] mb-1">
                          Estimated Arrival Window
                        </label>
                        <input
                          type="text"
                          required
                          value={quoteEta}
                          onChange={(e) => setQuoteEta(e.target.value)}
                          className="w-full rounded-lg border border-[#E4E1D8] px-3 py-2 text-sm"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-[#5A605A] mb-1">
                          Work Scope & Notes
                        </label>
                        <textarea
                          required
                          rows={2}
                          value={quoteDesc}
                          onChange={(e) => setQuoteDesc(e.target.value)}
                          placeholder="Explain what is included in the estimate and any spare part notes..."
                          className="w-full rounded-lg border border-[#E4E1D8] px-3 py-2 text-sm"
                        />
                      </div>
                      <div className="sm:col-span-2 flex justify-end">
                        <button
                          type="submit"
                          className="rounded-lg bg-[#134E3A] px-5 py-2 text-xs font-semibold text-white"
                        >
                          Send Quotation
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Active Bookings & Recent Reviews */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-xl border border-[#E4E1D8] bg-white p-6 space-y-4">
          <h2 className="font-display text-lg font-bold">Assigned Bookings ({bookings.length})</h2>
          {bookings.length === 0 ? (
            <p className="text-sm text-[#5A605A]">No confirmed bookings yet.</p>
          ) : (
            <div className="space-y-3">
              {bookings.map((b) => (
                <div
                  key={b.id}
                  onClick={() => navigate({ page: 'booking-details', id: b.id })}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') navigate({ page: 'booking-details', id: b.id });
                  }}
                  className="cursor-pointer rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] p-3.5 flex items-center justify-between gap-3 hover:border-[#134E3A]"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[#181A18] truncate">
                      {b.serviceTitle}
                    </div>
                    <div className="text-xs text-[#5A605A]">
                      {b.customerName} · {b.status.replace(/_/g, ' ')}
                    </div>
                  </div>
                  <span className="font-mono-nums text-sm font-bold text-[#134E3A]">
                    ₹{b.agreedPrice}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-[#E4E1D8] bg-white p-6 space-y-4">
          <h2 className="font-display text-lg font-bold">
            Customer Feedback ({reviews.length})
          </h2>
          {reviews.length === 0 ? (
            <p className="text-sm text-[#5A605A]">No customer reviews yet.</p>
          ) : (
            <div className="space-y-3">
              {reviews.map((r) => (
                <div key={r.id} className="rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] p-3.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span>{r.customerName}</span>
                    <span className="text-[#C99B2C]">{r.rating} ★</span>
                  </div>
                  <p className="text-xs text-[#5A605A] mt-1">{r.comment}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

// 3. CUSTOMER PROFILE MANAGEMENT
export const CustomerProfilePage: React.FC = () => {
  const {
    user,
    locations,
    language,
    setLanguage,
    lowInternetMode,
    setLowInternetMode,
    refreshAuth,
    switchRole,
    showToast,
    navigate,
  } = useApp();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [district, setDistrict] = useState(user?.district || 'Malappuram');
  const [town, setTown] = useState(user?.town || 'Tirur');
  const [locality, setLocality] = useState(user?.locality || '');
  const [pincode, setPincode] = useState(user?.pincode || '');
  const [allowRecs, setAllowRecs] = useState(user?.allowRecommendations ?? true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setPhone(user.phone);
      setDistrict(user.district);
      setTown(user.town);
      setLocality(user.locality);
      setPincode(user.pincode);
      setAllowRecs(user.allowRecommendations);
    }
  }, [user]);

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center space-y-4">
        <h1 className="font-display text-2xl font-bold">Profile Settings</h1>
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch('/api/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          name,
          phone,
          district,
          town,
          locality,
          pincode,
          language,
          allowRecommendations: allowRecs,
        }),
      });
      await refreshAuth();
      showToast('Profile settings saved', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#181A18]">
          Account Profile & Preferences
        </h1>
        <p className="text-sm text-[#5A605A] mt-1">
          Manage your contact details, Kerala location, language, and recommendation privacy.
        </p>
      </div>

      <form
        onSubmit={handleSave}
        className="rounded-xl border border-[#E4E1D8] bg-white p-6 space-y-5"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#5A605A] mb-1">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#5A605A] mb-1">Phone</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#5A605A] mb-1">District</label>
            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="w-full rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] px-3 py-2 text-sm"
            >
              {KERALA_DISTRICTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#5A605A] mb-1">Town</label>
            <select
              value={town}
              onChange={(e) => {
                const loc = locations.find((l) => l.town === e.target.value);
                setTown(e.target.value);
                if (loc) {
                  setDistrict(loc.district);
                  setPincode(loc.pincode);
                }
              }}
              className="w-full rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] px-3 py-2 text-sm"
            >
              {locations.map((l) => (
                <option key={l.id} value={l.town}>
                  {l.town}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#5A605A] mb-1">Locality</label>
            <input
              type="text"
              value={locality}
              onChange={(e) => setLocality(e.target.value)}
              className="w-full rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#5A605A] mb-1">PIN Code</label>
            <input
              type="text"
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
              className="w-full rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] px-3 py-2 text-sm font-mono-nums"
            />
          </div>
        </div>

        <div className="border-t border-[#E4E1D8] pt-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-[#5A605A] mb-1.5">
              Preferred Language
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as LanguageCode)}
              className="w-full sm:w-60 rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] px-3 py-2 text-sm"
            >
              <option value="en">English</option>
              <option value="ml">മലയാളം (Malayalam)</option>
              <option value="hi">हिन्दी (Hindi)</option>
            </select>
          </div>

          <label className="flex items-center gap-2.5 text-sm text-[#181A18] cursor-pointer">
            <input
              type="checkbox"
              checked={allowRecs}
              onChange={(e) => setAllowRecs(e.target.checked)}
              className="h-4 w-4 accent-[#134E3A]"
            />
            <span>Personalize recommendations using my search history (privacy controllable)</span>
          </label>

          <label className="flex items-center gap-2.5 text-sm text-[#181A18] cursor-pointer">
            <input
              type="checkbox"
              checked={lowInternetMode}
              onChange={(e) => setLowInternetMode(e.target.checked)}
              className="h-4 w-4 accent-[#134E3A]"
            />
            <span>Enable Low-Internet Mode (lightweight data-saving UI)</span>
          </label>
        </div>

        <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
          {user.canSwitchToProvider && (
            <button
              type="button"
              onClick={() => switchRole(user.activeMode === 'provider' ? 'customer' : 'provider')}
              className="rounded-lg border border-[#E4E1D8] px-4 py-2 text-xs font-semibold text-[#134E3A]"
            >
              Switch to {user.activeMode === 'provider' ? 'Customer' : 'Service Provider'} Account
            </button>
          )}
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-[#134E3A] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0D3B2B]"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

// 4. PROVIDER PROFILE MANAGEMENT
export const ProviderManagePage: React.FC = () => {
  const { user, providerProfile, categories, locations, refreshAuth, showToast, navigate } =
    useApp();

  const [title, setTitle] = useState(providerProfile?.title || '');
  const [bio, setBio] = useState(providerProfile?.bio || '');
  const [workingHours, setWorkingHours] = useState(providerProfile?.workingHours || '8:30 AM – 7:00 PM');
  const [isAvailable, setIsAvailable] = useState(providerProfile?.isAvailable ?? true);
  const [urgentAvailable, setUrgentAvailable] = useState(providerProfile?.urgentAvailable ?? false);
  const [town, setTown] = useState(providerProfile?.town || 'Tirur');
  const [district, setDistrict] = useState(providerProfile?.district || 'Malappuram');
  const [locality, setLocality] = useState(providerProfile?.locality || '');
  const [pincode, setPincode] = useState(providerProfile?.pincode || '676101');
  const [radiusKm, setRadiusKm] = useState(String(providerProfile?.serviceRadiusKm || 20));
  const [services, setServices] = useState<ProviderService[]>(providerProfile?.services || []);
  const [portfolio, setPortfolio] = useState<string[]>(providerProfile?.portfolioImages || []);
  const [newSvcName, setNewSvcName] = useState('');
  const [newSvcPrice, setNewSvcPrice] = useState('400');
  const [newSvcUnit, setNewSvcUnit] = useState('visit');
  const [newSvcCat, setNewSvcCat] = useState(categories[0]?.id || 'home-services');
  const [newSvcSub, setNewSvcSub] = useState(categories[0]?.subcategories[0]?.id || 'electrician');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (providerProfile) {
      setTitle(providerProfile.title);
      setBio(providerProfile.bio);
      setWorkingHours(providerProfile.workingHours);
      setIsAvailable(providerProfile.isAvailable);
      setUrgentAvailable(providerProfile.urgentAvailable);
      setTown(providerProfile.town);
      setDistrict(providerProfile.district);
      setLocality(providerProfile.locality);
      setPincode(providerProfile.pincode);
      setRadiusKm(String(providerProfile.serviceRadiusKm));
      setServices(providerProfile.services);
      setPortfolio(providerProfile.portfolioImages);
    }
  }, [providerProfile]);

  if (!user || !providerProfile) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center space-y-4">
        <h1 className="font-display text-2xl font-bold">Provider Profile Management</h1>
        <p className="text-sm text-[#5A605A]">
          Switch to Provider mode or register as a Service Provider to manage listings.
        </p>
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

  const addService = () => {
    if (!newSvcName.trim()) return;
    setServices((prev) => [
      ...prev,
      {
        id: `srv-${Date.now()}`,
        categoryId: newSvcCat,
        subcategoryId: newSvcSub,
        name: newSvcName.trim(),
        startingPrice: Math.max(50, Number(newSvcPrice) || 300),
        priceUnit: newSvcUnit,
        description: 'Added by provider',
      },
    ]);
    setNewSvcName('');
  };

  const handlePortfolioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1_200_000) {
      showToast('Photo exceeds 1.2 MB limit', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPortfolio((prev) => [...prev.slice(0, 5), reader.result as string]);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const catIds = Array.from(new Set(services.map((s) => s.categoryId)));
    const subIds = Array.from(new Set(services.map((s) => s.subcategoryId)));
    try {
      await apiFetch(`/api/providers/${providerProfile.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title,
          bio,
          workingHours,
          isAvailable,
          urgentAvailable,
          district,
          town,
          locality,
          pincode,
          serviceRadiusKm: Number(radiusKm),
          services,
          categoryIds: catIds.length ? catIds : providerProfile.categoryIds,
          subcategoryIds: subIds.length ? subIds : providerProfile.subcategoryIds,
          portfolioImages: portfolio,
        }),
      });
      await refreshAuth();
      showToast('Provider profile updated live!', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const requestVerification = async (type: 'identity' | 'skill' | 'profile') => {
    try {
      await apiFetch('/api/verifications', {
        method: 'POST',
        body: JSON.stringify({
          type,
          summary: `Provider requested ${type} verification for ${town}, ${district}.`,
          experienceClaim: `${providerProfile.experienceYears} years experience`,
        }),
      });
      showToast(`${type} verification request submitted to Admin`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not submit verification request', 'error');
    }
  };

  const activeCat = categories.find((c) => c.id === newSvcCat) || categories[0];

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#181A18]">
            Manage Provider Profile
          </h1>
          <p className="text-sm text-[#5A605A]">
            Configure your services, pricing, service radius, availability, and portfolio.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate({ page: 'provider-profile', id: providerProfile.id })}
          className="rounded-lg border border-[#E4E1D8] bg-white px-4 py-2 text-xs font-semibold text-[#134E3A]"
        >
          Preview Public Profile →
        </button>
      </div>

      <form
        onSubmit={handleSave}
        className="rounded-xl border border-[#E4E1D8] bg-white p-6 space-y-6"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#5A605A] mb-1">
              Professional Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#5A605A] mb-1">
              Professional Bio & Description
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#5A605A] mb-1">
                Working Hours
              </label>
              <input
                type="text"
                value={workingHours}
                onChange={(e) => setWorkingHours(e.target.value)}
                className="w-full rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#5A605A] mb-1">
                Service Town
              </label>
              <select
                value={town}
                onChange={(e) => {
                  const loc = locations.find((l) => l.town === e.target.value);
                  setTown(e.target.value);
                  if (loc) {
                    setDistrict(loc.district);
                    setPincode(loc.pincode);
                  }
                }}
                className="w-full rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] px-3 py-2 text-sm"
              >
                {locations.map((l) => (
                  <option key={l.id} value={l.town}>
                    {l.town}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#5A605A] mb-1">
                Service Radius (km)
              </label>
              <input
                type="number"
                min={2}
                max={150}
                value={radiusKm}
                onChange={(e) => setRadiusKm(e.target.value)}
                className="w-full rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] px-3 py-2 text-sm font-mono-nums"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-6 pt-1">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={isAvailable}
                onChange={(e) => setIsAvailable(e.target.checked)}
                className="h-4 w-4 accent-[#134E3A]"
              />
              <span>Available for new requests</span>
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={urgentAvailable}
                onChange={(e) => setUrgentAvailable(e.target.checked)}
                className="h-4 w-4 accent-[#134E3A]"
              />
              <span>Accept urgent local service calls</span>
            </label>
          </div>
        </div>

        {/* Services & Prices */}
        <div className="border-t border-[#E4E1D8] pt-5 space-y-4">
          <h2 className="font-display text-base font-bold text-[#181A18]">
            Services Offered & Starting Prices
          </h2>
          <div className="space-y-2">
            {services.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] px-3.5 py-2.5 text-sm"
              >
                <div>
                  <span className="font-semibold">{s.name}</span>{' '}
                  <span className="text-xs text-[#5A605A]">
                    · ₹{s.startingPrice} / {s.priceUnit}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setServices((prev) => prev.filter((x) => x.id !== s.id))}
                  className="text-[#B91C1C] hover:opacity-80"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-[#E4E1D8] p-4 space-y-3 bg-[#F8F7F4]">
            <div className="text-xs font-semibold text-[#5A605A]">Add Another Service</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select
                value={newSvcCat}
                onChange={(e) => {
                  setNewSvcCat(e.target.value);
                  const c = categories.find((x) => x.id === e.target.value);
                  if (c?.subcategories[0]) setNewSvcSub(c.subcategories[0].id);
                }}
                className="rounded-lg border border-[#E4E1D8] bg-white px-3 py-2 text-xs"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select
                value={newSvcSub}
                onChange={(e) => setNewSvcSub(e.target.value)}
                className="rounded-lg border border-[#E4E1D8] bg-white px-3 py-2 text-xs"
              >
                {activeCat?.subcategories.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={newSvcName}
                onChange={(e) => setNewSvcName(e.target.value)}
                placeholder="Service title"
                className="rounded-lg border border-[#E4E1D8] bg-white px-3 py-2 text-xs"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  value={newSvcPrice}
                  onChange={(e) => setNewSvcPrice(e.target.value)}
                  placeholder="₹ Price"
                  className="w-24 rounded-lg border border-[#E4E1D8] bg-white px-3 py-2 text-xs font-mono-nums"
                />
                <input
                  type="text"
                  value={newSvcUnit}
                  onChange={(e) => setNewSvcUnit(e.target.value)}
                  placeholder="visit / hour"
                  className="flex-1 rounded-lg border border-[#E4E1D8] bg-white px-3 py-2 text-xs"
                />
                <button
                  type="button"
                  onClick={addService}
                  className="inline-flex items-center gap-1 rounded-lg bg-[#134E3A] px-3 py-2 text-xs font-semibold text-white"
                >
                  <Plus className="h-3.5 w-3.5" /> Add
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Portfolio Upload */}
        <div className="border-t border-[#E4E1D8] pt-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-[#181A18]">
              Portfolio Photographs ({portfolio.length}/6)
            </h2>
            <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-[#134E3A]/40 px-3 py-1.5 text-xs font-semibold text-[#134E3A]">
              <Upload className="h-3.5 w-3.5" />
              <span>Upload Work Photo</span>
              <input
                type="file"
                accept="image/*"
                onChange={handlePortfolioUpload}
                className="hidden"
              />
            </label>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {portfolio.map((img, i) => (
              <div key={i} className="relative aspect-[4/3] rounded-lg overflow-hidden border border-[#E4E1D8]">
                <img src={img} alt={`Portfolio ${i + 1}`} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setPortfolio((prev) => prev.filter((_, idx) => idx !== i))}
                  className="absolute top-1.5 right-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-[#134E3A] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#0D3B2B]"
          >
            {saving ? 'Saving Profile...' : 'Save Provider Profile'}
          </button>
        </div>
      </form>

      {/* Verification Request Box */}
      <section className="rounded-xl border border-[#E4E1D8] bg-white p-6 space-y-4">
        <div className="flex items-center gap-2 text-[#134E3A]">
          <ShieldCheck className="h-5 w-5" />
          <h2 className="font-display text-lg font-bold">Trust & Verification Status</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {(
            [
              { key: 'identity', label: 'Identity Verification', ok: providerProfile.identityVerified },
              { key: 'skill', label: 'Skill Verification', ok: providerProfile.skillVerified },
              { key: 'profile', label: 'Profile Verification', ok: providerProfile.profileVerified },
            ] as const
          ).map((item) => (
            <div
              key={item.key}
              className="rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] p-3.5 flex flex-col justify-between gap-2"
            >
              <div className="font-semibold text-[#181A18]">{item.label}</div>
              {item.ok ? (
                <span className="inline-flex items-center gap-1 text-[#134E3A] font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => requestVerification(item.key)}
                  className="rounded border border-[#134E3A] px-2.5 py-1 text-[11px] font-semibold text-[#134E3A] hover:bg-[#E6F2EC] w-fit"
                >
                  Request Review
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
