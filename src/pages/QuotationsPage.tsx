import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Clock, PlusCircle, ShieldCheck, Star, XCircle } from 'lucide-react';
import type { Quotation, ServiceRequest } from '../../shared/types.ts';
import { useApp } from '../context/AppContext.tsx';
import { apiFetch } from '../lib/api.ts';

interface RequestWithQuotes extends ServiceRequest {
  quotations: Quotation[];
}

export const QuotationsPage: React.FC = () => {
  const { user, route, navigate, showToast, realtimeTick } = useApp();
  const [requests, setRequests] = useState<RequestWithQuotes[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectingId, setSelectingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const res = await apiFetch<{ requests: RequestWithQuotes[] }>('/api/requests');
      setRequests(res.requests);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData, realtimeTick]);

  const handleSelectQuote = async (quotationId: string) => {
    setSelectingId(quotationId);
    try {
      const res = await apiFetch<{ booking: { id: string } }>(
        `/api/quotations/${quotationId}/select`,
        { method: 'POST' }
      );
      showToast('Provider selected & booking confirmed!', 'success');
      navigate({ page: 'booking-details', id: res.booking.id });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to confirm booking', 'error');
    } finally {
      setSelectingId(null);
    }
  };

  const handleDeclineQuote = async (quotationId: string) => {
    try {
      await apiFetch(`/api/quotations/${quotationId}/decline`, { method: 'POST' });
      showToast('Quotation declined', 'info');
      loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to decline quotation', 'error');
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      await apiFetch(`/api/requests/${requestId}/cancel`, { method: 'PATCH' });
      showToast('Service request cancelled', 'info');
      loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to cancel request', 'error');
    }
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12 text-center space-y-4">
        <h1 className="font-display text-2xl font-bold">Requests & Quotations</h1>
        <p className="text-sm text-[#5A605A]">
          Sign in to view your service requests and compare provider quotations.
        </p>
        <button
          type="button"
          onClick={() => navigate({ page: 'login' })}
          className="rounded-lg bg-[#134E3A] px-5 py-2.5 text-sm font-semibold text-white"
        >
          Sign In / Try Demo Customer
        </button>
      </div>
    );
  }

  const orderedRequests = route.requestId
    ? [
        ...requests.filter((r) => r.id === route.requestId),
        ...requests.filter((r) => r.id !== route.requestId),
      ]
    : requests;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#181A18]">
            Service Requests & Quotations
          </h1>
          <p className="text-sm text-[#5A605A] mt-1">
            Compare estimated prices, ratings, experience, and arrival times before confirming.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate({ page: 'request-service' })}
          className="inline-flex items-center gap-2 rounded-lg bg-[#134E3A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0D3B2B]"
        >
          <PlusCircle className="h-4 w-4" />
          <span>New Service Request</span>
        </button>
      </div>

      {loading ? (
        <div className="h-56 rounded-xl border border-[#E4E1D8] bg-white animate-pulse" />
      ) : orderedRequests.length === 0 ? (
        <div className="rounded-xl border border-[#E4E1D8] bg-white p-10 text-center space-y-4">
          <h2 className="font-display text-lg font-bold">No service requests yet</h2>
          <p className="text-sm text-[#5A605A]">
            Post your first request to receive transparent quotations from nearby Kerala specialists.
          </p>
          <button
            type="button"
            onClick={() => navigate({ page: 'request-service' })}
            className="rounded-lg bg-[#134E3A] px-5 py-2.5 text-sm font-semibold text-white"
          >
            Post a Service Request
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {orderedRequests.map((req) => (
            <section
              key={req.id}
              className="rounded-xl border border-[#E4E1D8] bg-white p-6 space-y-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-[#E4E1D8] pb-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-lg font-bold text-[#181A18]">{req.title}</h2>
                    <span className="text-xs font-semibold text-[#134E3A] capitalize">
                      · {req.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-[#5A605A]">{req.description}</p>
                  <div className="text-xs text-[#5A605A] pt-1">
                    {req.locality}, {req.town} ({req.pincode}) · Preferred: {req.preferredDate} at{' '}
                    {req.preferredTime} · {req.notifiedProviderIds.length} provider(s) notified
                  </div>
                </div>

                {req.status !== 'booking_confirmed' &&
                  req.status !== 'service_completed' &&
                  req.status !== 'cancelled' && (
                    <button
                      type="button"
                      onClick={() => handleCancelRequest(req.id)}
                      className="shrink-0 text-xs font-medium text-[#B91C1C] hover:underline"
                    >
                      Cancel Request
                    </button>
                  )}
              </div>

              {/* Quotations Comparison Grid */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-[#5A605A]">
                  Received Quotations ({req.quotations?.length || 0})
                </h3>

                {!req.quotations || req.quotations.length === 0 ? (
                  <div className="rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] p-4 text-sm text-[#5A605A]">
                    Providers have been notified. Quotations will appear here as soon as they
                    respond.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {req.quotations.map((q) => (
                      <div
                        key={q.id}
                        className={`rounded-xl border p-4 flex flex-col justify-between space-y-4 ${
                          q.status === 'accepted'
                            ? 'border-[#134E3A] bg-[#E6F2EC]/40'
                            : q.status === 'declined'
                              ? 'border-[#E4E1D8] bg-[#F8F7F4] opacity-65'
                              : 'border-[#E4E1D8] bg-[#F8F7F4]'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <button
                                type="button"
                                onClick={() =>
                                  navigate({ page: 'provider-profile', id: q.providerId })
                                }
                                className="font-display text-base font-bold text-[#181A18] hover:text-[#134E3A] text-left"
                              >
                                {q.providerName}
                              </button>
                              <div className="text-xs text-[#5A605A]">{q.providerTitle}</div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="font-mono-nums text-lg font-bold text-[#134E3A]">
                                ₹{q.estimatedPrice}
                              </div>
                              <div className="text-[11px] text-[#5A605A]">Quoted estimate</div>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-2 text-xs text-[#5A605A]">
                            <span className="inline-flex items-center gap-1 font-medium text-[#181A18]">
                              <Star className="h-3.5 w-3.5 fill-[#C99B2C] text-[#C99B2C]" />
                              <span className="font-mono-nums">{q.providerRating.toFixed(1)}</span>
                            </span>
                            <span>·</span>
                            <span>{q.providerExperience} yrs exp</span>
                            {q.providerVerified && (
                              <>
                                <span>·</span>
                                <span className="inline-flex items-center gap-1 text-[#134E3A] font-medium">
                                  <ShieldCheck className="h-3.5 w-3.5" /> Verified
                                </span>
                              </>
                            )}
                            {q.providerIsDemo && <span>· Demo</span>}
                          </div>

                          <p className="text-sm text-[#181A18] leading-relaxed">{q.description}</p>
                          <div className="text-xs text-[#5A605A] inline-flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-[#134E3A]" />
                            <span>ETA: {q.estimatedArrival}</span>
                          </div>
                          {q.notes && (
                            <div className="text-xs text-[#5A605A]">Note: {q.notes}</div>
                          )}
                        </div>

                        <div className="pt-3 border-t border-[#E4E1D8] flex items-center justify-between gap-2">
                          {q.status === 'accepted' ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#134E3A]">
                              <CheckCircle2 className="h-4 w-4" /> Selected & Confirmed
                            </span>
                          ) : q.status === 'declined' ? (
                            <span className="inline-flex items-center gap-1.5 text-xs text-[#5A605A]">
                              <XCircle className="h-4 w-4" /> Declined
                            </span>
                          ) : req.status !== 'booking_confirmed' && req.status !== 'cancelled' ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleDeclineQuote(q.id)}
                                className="rounded-lg border border-[#E4E1D8] bg-white px-3 py-2 text-xs font-medium text-[#5A605A] hover:text-[#181A18]"
                              >
                                Decline
                              </button>
                              <button
                                type="button"
                                disabled={selectingId === q.id}
                                onClick={() => handleSelectQuote(q.id)}
                                className="rounded-lg bg-[#134E3A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0D3B2B] disabled:opacity-50"
                              >
                                {selectingId === q.id
                                  ? 'Confirming...'
                                  : 'Select & Confirm Booking'}
                              </button>
                            </>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};
