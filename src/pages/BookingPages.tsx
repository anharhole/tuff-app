import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Flag,
  KeyRound,
  MapPin,
  MessageSquare,
  Navigation,
  Phone,
  RotateCcw,
  Star,
} from 'lucide-react';
import type { Booking, BookingStatus, Provider } from '../../shared/types.ts';
import { useApp } from '../context/AppContext.tsx';
import { apiFetch } from '../lib/api.ts';

const BOOKING_STEPS: Array<{ key: BookingStatus; label: string }> = [
  { key: 'request_submitted', label: 'Request submitted' },
  { key: 'providers_notified', label: 'Providers notified' },
  { key: 'quotations_received', label: 'Quotations received' },
  { key: 'provider_selected', label: 'Provider selected' },
  { key: 'booking_confirmed', label: 'Booking confirmed' },
  { key: 'service_started', label: 'Service started' },
  { key: 'service_completed', label: 'Service completed' },
];

export const BookingHistoryPage: React.FC = () => {
  const { user, navigate, realtimeTick } = useApp();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'cancelled'>('all');
  const [loading, setLoading] = useState(true);

  const loadBookings = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const res = await apiFetch<{ bookings: Booking[] }>('/api/bookings');
      setBookings(res.bookings);
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings, realtimeTick]);

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12 text-center space-y-4">
        <h1 className="font-display text-2xl font-bold">Booking History</h1>
        <p className="text-sm text-[#5A605A]">Sign in to view and manage your bookings.</p>
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

  const filtered = bookings.filter((b) => {
    if (filter === 'active') {
      return b.status !== 'service_completed' && b.status !== 'cancelled';
    }
    if (filter === 'completed') return b.status === 'service_completed';
    if (filter === 'cancelled') return b.status === 'cancelled';
    return true;
  });

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#181A18]">
            Bookings & Service History
          </h1>
          <p className="text-sm text-[#5A605A] mt-1">
            Track active jobs, confirm completion, leave reviews, or rebook in one click.
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-[#F1EFE9] p-1">
          {(['all', 'active', 'completed', 'cancelled'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                filter === tab ? 'bg-white text-[#134E3A] shadow-sm' : 'text-[#5A605A]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-48 rounded-xl border border-[#E4E1D8] bg-white animate-pulse" />
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-[#E4E1D8] bg-white p-10 text-center space-y-3">
          <p className="text-sm text-[#5A605A]">No bookings in this view yet.</p>
          <button
            type="button"
            onClick={() => navigate({ page: 'search' })}
            className="rounded-lg bg-[#134E3A] px-4 py-2 text-xs font-semibold text-white"
          >
            Find Local Professionals
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((b) => (
            <div
              key={b.id}
              className="rounded-xl border border-[#E4E1D8] bg-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-base font-bold text-[#181A18]">
                    {b.serviceTitle}
                  </h2>
                  <span className="text-xs font-semibold text-[#134E3A] capitalize">
                    · {b.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="text-xs text-[#5A605A]">
                  {user.activeMode === 'provider'
                    ? `Customer: ${b.customerName}`
                    : `Provider: ${b.providerName}`}{' '}
                  · {b.preferredDate} at {b.preferredTime} · {b.locationLabel}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <span className="font-mono-nums text-base font-bold text-[#134E3A]">
                  ₹{b.agreedPrice}
                </span>
                {b.status === 'service_completed' && user.activeMode === 'customer' && (
                  <button
                    type="button"
                    onClick={() =>
                      navigate({
                        page: 'request-service',
                        providerId: b.providerId,
                        categoryId: b.categoryId,
                        subcategoryId: b.subcategoryId,
                        draftTitle: b.serviceTitle,
                      })
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#E4E1D8] px-3 py-2 text-xs font-medium text-[#181A18] hover:bg-[#F1EFE9]"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Rebook</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => navigate({ page: 'booking-details', id: b.id })}
                  className="rounded-lg bg-[#134E3A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0D3B2B]"
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const BookingDetailsPage: React.FC = () => {
  const { user, route, navigate, showToast, realtimeTick } = useApp();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);
  const [otpInput, setOtpInput] = useState('');
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [complaintText, setComplaintText] = useState('');
  const [showComplaint, setShowComplaint] = useState(false);

  const loadDetail = useCallback(async () => {
    if (!route.id || !user) {
      setLoading(false);
      return;
    }
    try {
      const res = await apiFetch<{ booking: Booking; provider: Provider | null }>(
        `/api/bookings/${route.id}`
      );
      setBooking(res.booking);
      setProvider(res.provider);
    } catch {
      setBooking(null);
    } finally {
      setLoading(false);
    }
  }, [route.id, user]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail, realtimeTick]);

  const updateStatus = async (
    action: 'arrived' | 'start' | 'complete' | 'confirm_complete' | 'cancel',
    extra?: { otp?: string; requireOtp?: boolean; cancellationReason?: string }
  ) => {
    if (!booking) return;
    try {
      const res = await apiFetch<{ booking: Booking }>(`/api/bookings/${booking.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ action, ...extra }),
      });
      setBooking(res.booking);
      showToast('Booking status updated', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Status update failed', 'error');
    }
  };

  const toggleLiveLocation = async () => {
    if (!booking) return;
    const nextShare = !booking.liveLocationShared;
    if (nextShare && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const res = await apiFetch<{ booking: Booking }>(`/api/bookings/${booking.id}/location`, {
            method: 'PATCH',
            body: JSON.stringify({
              share: true,
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            }),
          });
          setBooking(res.booking);
          showToast('Live location sharing enabled for this active booking', 'success');
        },
        async () => {
          const res = await apiFetch<{ booking: Booking }>(`/api/bookings/${booking.id}/location`, {
            method: 'PATCH',
            body: JSON.stringify({ share: true, lat: 10.9165, lng: 75.9245 }),
          });
          setBooking(res.booking);
          showToast('Location sharing enabled using neighbourhood coordinates', 'info');
        }
      );
    } else {
      const res = await apiFetch<{ booking: Booking }>(`/api/bookings/${booking.id}/location`, {
        method: 'PATCH',
        body: JSON.stringify({ share: false }),
      });
      setBooking(res.booking);
      showToast('Live location sharing stopped', 'info');
    }
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking) return;
    try {
      await apiFetch('/api/reviews', {
        method: 'POST',
        body: JSON.stringify({
          providerId: booking.providerId,
          bookingId: booking.id,
          rating,
          comment: reviewText,
          serviceName: booking.serviceTitle,
        }),
      });
      showToast('Thank you! Your verified review has been published.', 'success');
      loadDetail();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to publish review', 'error');
    }
  };

  const submitComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking) return;
    try {
      await apiFetch('/api/reports', {
        method: 'POST',
        body: JSON.stringify({
          targetType: user?.activeMode === 'provider' ? 'customer' : 'provider',
          targetId: booking.id,
          targetName: `${booking.serviceTitle} (${booking.providerName})`,
          reason: 'Booking Complaint',
          details: complaintText,
        }),
      });
      showToast('Complaint submitted to LocalConnect support', 'success');
      setShowComplaint(false);
      setComplaintText('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to submit complaint', 'error');
    }
  };

  const openChat = async () => {
    if (!booking) return;
    const res = await apiFetch<{ conversation: { id: string } }>('/api/conversations/start', {
      method: 'POST',
      body: JSON.stringify({ providerId: booking.providerId, requestId: booking.requestId }),
    });
    navigate({ page: 'chat', id: res.conversation.id });
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8">
        <div className="h-64 rounded-xl border border-[#E4E1D8] bg-white animate-pulse" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12 text-center space-y-4">
        <h1 className="font-display text-2xl font-bold">Booking Not Found</h1>
        <button
          type="button"
          onClick={() => navigate({ page: 'booking-history' })}
          className="rounded-lg bg-[#134E3A] px-4 py-2 text-sm font-semibold text-white"
        >
          Go to Booking History
        </button>
      </div>
    );
  }

  const currentStepIndex = BOOKING_STEPS.findIndex((s) => s.key === booking.status);
  const isProviderUser = user && provider && provider.userId === user.id;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-6">
      <button
        type="button"
        onClick={() => navigate({ page: 'booking-history' })}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5A605A] hover:text-[#134E3A]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Back to Booking History</span>
      </button>

      {/* Summary Header */}
      <section className="rounded-xl border border-[#E4E1D8] bg-white p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="font-display text-2xl font-bold text-[#181A18]">
              {booking.serviceTitle}
            </h1>
            <div className="text-sm text-[#5A605A]">
              Provider: <strong className="text-[#181A18]">{booking.providerName}</strong> ·
              Customer: <strong className="text-[#181A18]">{booking.customerName}</strong>
            </div>
            <div className="text-xs text-[#5A605A] flex flex-wrap items-center gap-x-2">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-[#134E3A]" />
                {booking.locationLabel}
              </span>
              <span>·</span>
              <span>
                Scheduled: {booking.preferredDate} at {booking.preferredTime}
              </span>
            </div>
          </div>

          <div className="sm:text-right">
            <div className="text-xs text-[#5A605A]">Confirmed Quotation</div>
            <div className="font-mono-nums text-2xl font-bold text-[#134E3A]">
              ₹{booking.agreedPrice}
            </div>
            <div className="text-xs font-semibold capitalize text-[#181A18] mt-0.5">
              Status: {booking.status.replace(/_/g, ' ')}
            </div>
          </div>
        </div>

        {/* 8-Stage Progress Tracker */}
        {booking.status !== 'cancelled' ? (
          <div className="pt-4 border-t border-[#E4E1D8]">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {BOOKING_STEPS.map((st, idx) => {
                const done = idx <= currentStepIndex;
                return (
                  <div
                    key={st.key}
                    className={`rounded-lg border p-2.5 text-xs ${
                      done
                        ? 'border-[#134E3A]/40 bg-[#E6F2EC] text-[#134E3A] font-semibold'
                        : 'border-[#E4E1D8] bg-[#F8F7F4] text-[#5A605A]'
                    }`}
                  >
                    <div className="font-mono-nums text-[10px] mb-0.5">0{idx + 1}</div>
                    <div>{st.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
            This booking was cancelled. {booking.cancellationReason || ''}
          </div>
        )}

        {/* Quick Communication & Controls */}
        <div className="pt-4 border-t border-[#E4E1D8] flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={openChat}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#134E3A] bg-white px-4 py-2 text-xs font-semibold text-[#134E3A] hover:bg-[#E6F2EC]"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Open Chat</span>
          </button>

          {provider && (
            <a
              href={`tel:${provider.phone.replace(/\s+/g, '')}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] px-4 py-2 text-xs font-medium text-[#181A18]"
            >
              <Phone className="h-3.5 w-3.5 text-[#134E3A]" />
              <span>Call Provider</span>
            </a>
          )}

          {booking.status !== 'service_completed' && booking.status !== 'cancelled' && (
            <>
              <button
                type="button"
                onClick={() => navigate({ page: 'live-tracking', id: booking.id })}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#E6F2EC] border border-[#134E3A]/30 px-4 py-2 text-xs font-semibold text-[#134E3A] hover:bg-[#d5eadf]"
              >
                <Navigation className="h-3.5 w-3.5" />
                <span>Open Live Arrival Map</span>
              </button>

              <button
                type="button"
                onClick={toggleLiveLocation}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-xs font-medium ${
                  booking.liveLocationShared
                    ? 'border-[#134E3A] bg-[#E6F2EC] text-[#134E3A]'
                    : 'border-[#E4E1D8] bg-white text-[#181A18]'
                }`}
              >
                <MapPin className="h-3.5 w-3.5" />
                <span>
                  {booking.liveLocationShared
                    ? 'Customer Pin Shared ✓'
                    : 'Share My Destination Pin'}
                </span>
              </button>
            </>
          )}

          {booking.status === 'service_completed' && !isProviderUser && (
            <button
              type="button"
              onClick={() =>
                navigate({
                  page: 'request-service',
                  providerId: booking.providerId,
                  categoryId: booking.categoryId,
                  subcategoryId: booking.subcategoryId,
                  draftTitle: booking.serviceTitle,
                })
              }
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#134E3A] px-4 py-2 text-xs font-semibold text-white"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Rebook This Service</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowComplaint((v) => !v)}
            className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-[#5A605A] hover:text-[#B91C1C]"
          >
            <Flag className="h-3.5 w-3.5" />
            <span>Submit Complaint</span>
          </button>
        </div>
      </section>

      {/* Completion & Progress Workflow Actions */}
      {booking.status !== 'service_completed' && booking.status !== 'cancelled' && (
        <section className="rounded-xl border border-[#E4E1D8] bg-white p-6 space-y-4">
          <h2 className="font-display text-lg font-bold text-[#181A18]">
            Service Progress & OTP Verification
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Customer OTP Display */}
            <div className="rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#134E3A]">
                <KeyRound className="h-4 w-4" />
                <span>Optional Service Completion OTP</span>
              </div>
              {!isProviderUser ? (
                <>
                  <div className="font-mono-nums text-2xl font-bold tracking-widest text-[#181A18]">
                    {booking.completionOtp}
                  </div>
                  <p className="text-xs text-[#5A605A]">
                    Share this 4-digit code with {booking.providerName} once work is finished, or
                    confirm completion directly below.
                  </p>
                </>
              ) : (
                <p className="text-xs text-[#5A605A]">
                  Ask {booking.customerName} for their 4-digit completion OTP to verify job sign-off
                  (or complete directly if OTP skipped).
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {isProviderUser ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {!booking.providerArrivedAt && (
                      <button
                        type="button"
                        onClick={() => updateStatus('arrived')}
                        className="rounded-lg border border-[#134E3A] bg-white px-4 py-2 text-xs font-semibold text-[#134E3A]"
                      >
                        Confirm Arrival
                      </button>
                    )}
                    {booking.status === 'booking_confirmed' && (
                      <button
                        type="button"
                        onClick={() => updateStatus('start')}
                        className="rounded-lg bg-[#134E3A] px-4 py-2 text-xs font-semibold text-white"
                      >
                        Start Service
                      </button>
                    )}
                  </div>

                  {booking.status === 'service_started' && (
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        maxLength={4}
                        value={otpInput}
                        onChange={(e) => setOtpInput(e.target.value)}
                        placeholder="Customer 4-digit OTP"
                        className="w-40 rounded-lg border border-[#E4E1D8] px-3 py-2 text-xs font-mono-nums"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          updateStatus('complete', { otp: otpInput.trim(), requireOtp: true })
                        }
                        className="rounded-lg bg-[#134E3A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0D3B2B]"
                      >
                        Verify OTP & Complete
                      </button>
                      <button
                        type="button"
                        onClick={() => updateStatus('complete', { requireOtp: false })}
                        className="rounded-lg border border-[#E4E1D8] bg-white px-3.5 py-2 text-xs font-medium text-[#5A605A] hover:text-[#181A18]"
                      >
                        Skip OTP & Complete
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={() => updateStatus('confirm_complete')}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#134E3A] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#0D3B2B]"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Confirm Service Completed</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateStatus('cancel', { cancellationReason: 'Cancelled by customer' })
                    }
                    className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-semibold text-[#B91C1C]"
                  >
                    Cancel Booking
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Rating & Review Form after Completion */}
      {booking.status === 'service_completed' && !isProviderUser && (
        <section className="rounded-xl border border-[#E4E1D8] bg-white p-6 space-y-4">
          <h2 className="font-display text-lg font-bold text-[#181A18]">
            {booking.reviewed ? 'Your Review Is Published' : 'Rate & Review Completed Service'}
          </h2>
          {booking.reviewed ? (
            <p className="text-sm text-[#134E3A] inline-flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              <span>Thank you! Your feedback helps neighbours across Kerala choose with confidence.</span>
            </p>
          ) : (
            <form onSubmit={submitReview} className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#5A605A]">Your Rating:</span>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    aria-label={`Rate ${n} stars`}
                    className="p-1"
                  >
                    <Star
                      className={`h-5 w-5 ${
                        n <= rating ? 'fill-[#C99B2C] text-[#C99B2C]' : 'text-[#E4E1D8]'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <textarea
                required
                rows={3}
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Share your experience regarding punctuality, pricing transparency, and workmanship..."
                className="w-full rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] px-3.5 py-2.5 text-sm"
              />
              <button
                type="submit"
                className="rounded-lg bg-[#134E3A] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#0D3B2B]"
              >
                Submit Verified Review
              </button>
            </form>
          )}
        </section>
      )}

      {/* Complaint Form */}
      {showComplaint && (
        <form
          onSubmit={submitComplaint}
          className="rounded-xl border border-red-200 bg-white p-6 space-y-4"
        >
          <h3 className="font-display text-base font-bold text-[#B91C1C]">
            Submit Booking Complaint
          </h3>
          <textarea
            required
            rows={3}
            value={complaintText}
            onChange={(e) => setComplaintText(e.target.value)}
            placeholder="Describe the issue for LocalConnect support moderation..."
            className="w-full rounded-lg border border-[#E4E1D8] px-3 py-2 text-sm"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowComplaint(false)}
              className="rounded-lg border border-[#E4E1D8] px-4 py-2 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-[#B91C1C] px-4 py-2 text-xs font-semibold text-white"
            >
              Send Complaint
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
