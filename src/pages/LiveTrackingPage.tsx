import React, { useCallback, useEffect, useState } from 'react';
import {
  Clock,
  Info,
  MapPin,
  Navigation,
  RefreshCw,
  ShieldCheck,
  Square,
} from 'lucide-react';
import { KERALA_LOCATIONS } from '../../shared/keralaData.ts';
import type { Booking, Provider } from '../../shared/types.ts';
import { KeralaMap } from '../components/KeralaMap.tsx';
import { useApp } from '../context/AppContext.tsx';
import { apiFetch } from '../lib/api.ts';

function calcKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const LiveTrackingPage: React.FC<{ bookingId?: string }> = ({ bookingId }) => {
  const { user, realtimeTick, navigate, showToast } = useApp();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedId, setSelectedId] = useState<string>(bookingId || '');
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [destLat, setDestLat] = useState<number>(10.9165);
  const [destLng, setDestLng] = useState<number>(75.9245);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const loadBookings = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const res = await apiFetch<{ bookings: Booking[] }>('/api/bookings');
      setBookings(res.bookings);
      const activeList = res.bookings.filter(
        (b) => b.status === 'booking_confirmed' || b.status === 'service_started'
      );
      const chosen =
        res.bookings.find((b) => b.id === (bookingId || selectedId)) ||
        activeList[0] ||
        res.bookings[0] ||
        null;
      if (chosen) {
        setSelectedId(chosen.id);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [user, bookingId, selectedId]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings, realtimeTick]);

  useEffect(() => {
    if (!selectedId || !user) {
      setActiveBooking(null);
      return;
    }
    apiFetch<{
      booking: Booking;
      provider: Provider | null;
      request: { lat?: number; lng?: number; town?: string } | null;
    }>(`/api/bookings/${selectedId}`)
      .then((res) => {
        setActiveBooking(res.booking);
        setProvider(res.provider);
        const townFallback = KERALA_LOCATIONS.find((l) =>
          res.booking.locationLabel.toLowerCase().includes(l.town.toLowerCase())
        );
        const dLat =
          res.booking.customerLiveCoords?.lat ??
          res.request?.lat ??
          townFallback?.lat ??
          10.9165;
        const dLng =
          res.booking.customerLiveCoords?.lng ??
          res.request?.lng ??
          townFallback?.lng ??
          75.9245;
        setDestLat(dLat);
        setDestLng(dLng);
      })
      .catch(() => {});
  }, [selectedId, user, realtimeTick]);

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center space-y-4">
        <Navigation className="mx-auto h-10 w-10 text-[#134E3A]" />
        <h1 className="font-display text-2xl font-bold text-[#181A18]">
          Consent-Based Live Provider Tracking
        </h1>
        <p className="text-sm text-[#5A605A]">
          Please sign in to track an active service booking. Live location is strictly restricted to booking participants.
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

  const isCompletedOrCancelled =
    activeBooking?.status === 'service_completed' || activeBooking?.status === 'cancelled';

  const provLat = activeBooking?.providerLiveCoords?.lat ?? provider?.lat ?? destLat + 0.025;
  const provLng = activeBooking?.providerLiveCoords?.lng ?? provider?.lng ?? destLng + 0.02;
  const distanceKm = activeBooking?.providerTrackingActive
    ? calcKm(provLat, provLng, destLat, destLng)
    : null;
  const etaMinutes =
    distanceKm !== null ? Math.max(2, Math.round((distanceKm / 26) * 60)) : null;

  const updateProviderTracking = async (
    share: boolean,
    lat: number,
    lng: number,
    mode: 'gps' | 'demo_simulation'
  ) => {
    if (!activeBooking) return;
    setUpdating(true);
    try {
      const res = await apiFetch<{ booking: Booking }>(`/api/bookings/${activeBooking.id}/location`, {
        method: 'PATCH',
        body: JSON.stringify({
          providerShare: share,
          lat,
          lng,
          mode,
        }),
      });
      setActiveBooking(res.booking);
      showToast(
        share
          ? mode === 'gps'
            ? 'Live GPS tracking enabled for this booking.'
            : 'Demo Simulation tracking updated.'
          : 'Live location sharing stopped.',
        'success'
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to update tracking', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const shareRealGps = () => {
    if (!navigator.geolocation) {
      showToast('Browser GPS unavailable. Use Demo Simulation Mode instead.', 'info');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        updateProviderTracking(true, pos.coords.latitude, pos.coords.longitude, 'gps');
      },
      () => {
        showToast('Location permission declined. You can use Demo Simulation Mode.', 'info');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const stepDemoCloser = () => {
    if (!activeBooking) return;
    const nextLat = provLat + (destLat - provLat) * 0.45;
    const nextLng = provLng + (destLng - provLng) * 0.45;
    updateProviderTracking(true, nextLat, nextLng, 'demo_simulation');
  };

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#134E3A]">
            <Navigation className="h-4 w-4 text-[#B68A1E]" />
            <span>Consent-Based Live Tracking</span>
          </div>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-[#181A18]">
            Provider Arrival & Live Route
          </h1>
          <p className="text-sm text-[#5A605A]">
            Visible only to booking participants while travelling for an active booking. Automatically stops when the job is completed or cancelled.
          </p>
        </div>

        {bookings.length > 0 && (
          <select
            aria-label="Select booking to track"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="rounded-lg border border-[#E4E1D8] bg-white px-3 py-2 text-sm text-[#181A18]"
          >
            {bookings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.serviceTitle} · {b.status.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <div className="rounded-xl border border-[#E4E1D8] bg-white p-8 text-sm text-[#5A605A]">
          Loading active bookings...
        </div>
      ) : !activeBooking ? (
        <div className="rounded-xl border border-[#E4E1D8] bg-white p-8 text-center space-y-3">
          <p className="text-sm text-[#5A605A]">
            You have no active bookings yet. Confirm a quotation to track provider arrival live.
          </p>
          <button
            type="button"
            onClick={() => navigate({ page: 'quotations' })}
            className="rounded-lg bg-[#134E3A] px-4 py-2 text-xs font-semibold text-white"
          >
            View Requests & Quotations
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {activeBooking.providerTrackingActive && !isCompletedOrCancelled ? (
              <KeralaMap
                providers={[]}
                centerLat={destLat}
                centerLng={destLng}
                heightClass="h-[440px]"
                trackingRoute={{
                  providerLat: provLat,
                  providerLng: provLng,
                  customerLat: destLat,
                  customerLng: destLng,
                  providerLabel: `${activeBooking.providerName} (${
                    activeBooking.providerLiveCoords?.mode === 'gps' ? 'Live GPS' : 'Demo Simulation'
                  })`,
                  customerLabel: `Service Location: ${activeBooking.locationLabel}`,
                }}
              />
            ) : (
              <div className="rounded-xl border border-[#E4E1D8] bg-white p-10 text-center space-y-3">
                <MapPin className="mx-auto h-10 w-10 text-[#5A605A]" />
                <h2 className="font-display text-lg font-bold text-[#181A18]">
                  {isCompletedOrCancelled
                    ? 'Tracking Stopped Automatically'
                    : 'Provider Has Not Enabled Live Location Sharing Yet'}
                </h2>
                <p className="text-xs text-[#5A605A] max-w-md mx-auto">
                  {isCompletedOrCancelled
                    ? `This booking is ${activeBooking.status.replace(/_/g, ' ')}. Location sharing has been closed for privacy.`
                    : 'For privacy, providers share location only with explicit consent when travelling to your doorstep.'}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-[#E4E1D8] bg-white p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-[#5A605A]">Booking Status</span>
                <span className="rounded bg-[#E6F2EC] px-2 py-0.5 text-xs font-semibold text-[#134E3A] capitalize">
                  {activeBooking.status.replace(/_/g, ' ')}
                </span>
              </div>
              <h3 className="font-display text-base font-bold text-[#181A18]">
                {activeBooking.serviceTitle}
              </h3>
              <div className="text-xs text-[#5A605A] space-y-1">
                <div>Provider: <strong className="text-[#181A18]">{activeBooking.providerName}</strong></div>
                <div>Destination: <strong className="text-[#181A18]">{activeBooking.locationLabel}</strong></div>
                <div>Slot: {activeBooking.preferredDate} · {activeBooking.preferredTime}</div>
              </div>

              {activeBooking.providerTrackingActive && activeBooking.providerLiveCoords && (
                <div className="mt-3 rounded-lg border border-[#134E3A]/20 bg-[#E6F2EC]/50 p-3.5 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#134E3A]">
                      {activeBooking.providerLiveCoords.mode === 'gps'
                        ? 'Live Browser GPS Active'
                        : 'Demo Simulation Mode'}
                    </span>
                    <span className="font-mono-nums font-bold text-[#181A18]">
                      ~{etaMinutes} min ETA
                    </span>
                  </div>
                  <div className="text-[#5A605A] flex items-center justify-between">
                    <span>Estimated distance</span>
                    <span className="font-mono-nums font-semibold text-[#181A18]">
                      {distanceKm?.toFixed(1)} km
                    </span>
                  </div>
                  <div className="text-[#5A605A] flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    <span>
                      Last updated:{' '}
                      {new Date(activeBooking.providerLiveCoords.updatedAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {!isCompletedOrCancelled && (
              <div className="rounded-xl border border-[#E4E1D8] bg-white p-5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#181A18]">
                  <ShieldCheck className="h-4 w-4 text-[#134E3A]" />
                  <span>Provider Travelling & Simulation Controls</span>
                </div>
                <p className="text-xs text-[#5A605A] leading-relaxed">
                  Providers can share real browser GPS when travelling, or use the clearly labelled Demo Simulation control for hackathon demonstrations.
                </p>
                <div className="space-y-2">
                  <button
                    type="button"
                    disabled={updating}
                    onClick={shareRealGps}
                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#134E3A] py-2.5 text-xs font-semibold text-white hover:bg-[#0D3B2B] disabled:opacity-60"
                  >
                    <Navigation className="h-3.5 w-3.5" />
                    <span>Share Real Browser GPS</span>
                  </button>
                  <button
                    type="button"
                    disabled={updating}
                    onClick={stepDemoCloser}
                    className="w-full flex items-center justify-center gap-2 rounded-lg border border-[#134E3A] bg-[#E6F2EC] py-2.5 text-xs font-semibold text-[#134E3A] hover:bg-[#d5eadf] disabled:opacity-60"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Move Closer (Demo Simulation)</span>
                  </button>
                  {activeBooking.providerTrackingActive && (
                    <button
                      type="button"
                      disabled={updating}
                      onClick={() => updateProviderTracking(false, provLat, provLng, 'demo_simulation')}
                      className="w-full flex items-center justify-center gap-2 rounded-lg border border-[#B91C1C]/30 py-2 text-xs font-semibold text-[#B91C1C] hover:bg-red-50"
                    >
                      <Square className="h-3.5 w-3.5" />
                      <span>Stop Sharing Location</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="rounded-xl border border-[#E4E1D8] bg-[#F8F7F4] p-4 text-xs text-[#5A605A] flex gap-2">
              <Info className="h-4 w-4 shrink-0 text-[#134E3A] mt-0.5" />
              <span>
                Only coordinates and timestamps needed for arrival coordination are stored. Click{' '}
                <button
                  type="button"
                  data-compact="true"
                  onClick={() => navigate({ page: 'booking-details', id: activeBooking.id })}
                  className="font-semibold text-[#134E3A] underline"
                >
                  Open Booking Details
                </button>{' '}
                to verify the 4-digit OTP on arrival.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
