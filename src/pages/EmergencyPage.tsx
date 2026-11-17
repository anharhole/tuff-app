import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Lock,
  MapPin,
  Navigation,
  Phone,
  PhoneCall,
  ShieldAlert,
} from 'lucide-react';
import { EMERGENCY_SERVICE_TYPES, KERALA_DISTRICTS } from '../../shared/keralaData.ts';
import type { EmergencyRequest, Provider } from '../../shared/types.ts';
import { useApp } from '../context/AppContext.tsx';
import { apiFetch } from '../lib/api.ts';

export const EmergencyPage: React.FC = () => {
  const { user, language, locations, selectedLocation, navigate, showToast } = useApp();

  const [tab, setTab] = useState<'urgent' | 'safety'>('urgent');
  const [serviceType, setServiceType] = useState(EMERGENCY_SERVICE_TYPES[0].id);
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [district, setDistrict] = useState(user?.district || selectedLocation.district);
  const [town, setTown] = useState(user?.town || selectedLocation.town);
  const [pincode, setPincode] = useState(user?.pincode || selectedLocation.pincode);
  const [description, setDescription] = useState('');
  const [locationShared, setLocationShared] = useState(false);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [eligibleProviders, setEligibleProviders] = useState<Provider[]>([]);
  const [history, setHistory] = useState<EmergencyRequest[]>([]);
  const [submittedRecord, setSubmittedRecord] = useState<EmergencyRequest | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirm112Modal, setConfirm112Modal] = useState(false);
  const [call112Confirmed, setCall112Confirmed] = useState(false);

  const loadEligible = useCallback(async () => {
    try {
      const res = await apiFetch<{ providers: Provider[] }>(
        `/api/emergency/eligible?serviceType=${encodeURIComponent(serviceType)}&town=${encodeURIComponent(town)}`
      );
      setEligibleProviders(res.providers);
    } catch {
      setEligibleProviders([]);
    }
  }, [serviceType, town]);

  const loadHistory = useCallback(async () => {
    try {
      const res = await apiFetch<{ requests: EmergencyRequest[] }>('/api/emergency');
      setHistory(res.requests);
    } catch {
      setHistory([]);
    }
  }, []);

  useEffect(() => {
    loadEligible();
  }, [loadEligible]);

  useEffect(() => {
    if (user) {
      setCustomerName((prev) => prev || user.name);
      setPhone((prev) => prev || user.phone);
      setDistrict(user.district);
      setTown(user.town);
      setPincode(user.pincode);
      loadHistory();
    } else {
      setDistrict(selectedLocation.district);
      setTown(selectedLocation.town);
      setPincode(selectedLocation.pincode);
    }
  }, [user, selectedLocation, loadHistory]);

  const requestLocationPermission = () => {
    if (!navigator.geolocation) {
      showToast('Browser geolocation is unavailable', 'info');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationShared(true);
        showToast('Location shared for this urgent request only', 'success');
      },
      () => {
        setLocationShared(false);
        showToast('Location permission denied. Using selected Kerala town.', 'info');
      }
    );
  };

  const handleUrgentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await apiFetch<{ emergency: EmergencyRequest; eligibleProviders: Provider[] }>(
        '/api/emergency',
        {
          method: 'POST',
          body: JSON.stringify({
            customerName,
            phone,
            serviceType,
            description,
            district,
            town,
            pincode,
            lat: gpsCoords?.lat,
            lng: gpsCoords?.lng,
            locationShared,
          }),
        }
      );
      setSubmittedRecord(res.emergency);
      setEligibleProviders(res.eligibleProviders);
      setDescription('');
      showToast('Urgent local request logged and eligible providers notified', 'success');
      if (user) loadHistory();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to submit urgent request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 space-y-8">
      {/* Banner */}
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 space-y-3">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-6 w-6 text-[#B91C1C] shrink-0 mt-0.5" />
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#181A18]">
              Emergency & Urgent Assistance
            </h1>
            <p className="text-sm text-[#5A605A] mt-1 leading-relaxed">
              Choose between <strong>Urgent Local Household Repairs</strong> (independent tradespeople)
              or <strong>Personal Safety Emergency (India 112)</strong>. LocalConnect is a local
              services marketplace — never an official police, fire, or ambulance dispatch authority.
            </p>
          </div>
        </div>

        {/* Two Distinct Mode Tabs */}
        <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => setTab('urgent')}
            className={`rounded-lg border px-4 py-3 text-left transition-colors ${
              tab === 'urgent'
                ? 'border-[#134E3A] bg-[#134E3A] text-white'
                : 'border-[#E4E1D8] bg-white text-[#181A18] hover:border-[#134E3A]'
            }`}
          >
            <div className="text-sm font-bold">A. Urgent Local Service</div>
            <div
              className={`text-xs mt-0.5 ${
                tab === 'urgent' ? 'text-white/85' : 'text-[#5A605A]'
              }`}
            >
              Electrician, Plumbing, AC & Appliance, Home Maintenance, Water Delivery
            </div>
          </button>

          <button
            type="button"
            onClick={() => setTab('safety')}
            className={`rounded-lg border px-4 py-3 text-left transition-colors ${
              tab === 'safety'
                ? 'border-[#B91C1C] bg-[#B91C1C] text-white'
                : 'border-red-200 bg-white text-[#B91C1C] hover:bg-red-50'
            }`}
          >
            <div className="text-sm font-bold">B. Personal Safety Emergency (Call 112)</div>
            <div
              className={`text-xs mt-0.5 ${
                tab === 'safety' ? 'text-white/85' : 'text-[#5A605A]'
              }`}
            >
              Immediate life, medical, fire, or police emergency in India
            </div>
          </button>
        </div>
      </div>

      {tab === 'safety' ? (
        <section className="rounded-xl border border-red-200 bg-white p-6 sm:p-8 space-y-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#B91C1C] text-white">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <h2 className="font-display text-2xl font-bold text-[#181A18]">
                National Emergency Number — India 112
              </h2>
              <p className="text-sm text-[#5A605A] leading-relaxed">
                If someone is in immediate danger, injured, experiencing a fire, medical crisis, or
                crime, call India’s official unified emergency response number <strong>112</strong>{' '}
                immediately.
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] p-4 text-sm text-[#181A18] space-y-1.5">
            <div className="font-semibold">Important Authority Notice:</div>
            <p className="text-xs text-[#5A605A] leading-relaxed">
              LocalConnect is an independent local services marketplace, <strong>not</strong> an
              emergency-response authority. Ordinary marketplace technicians and providers on
              LocalConnect are never substitutes for Police (100/112), Fire & Rescue (101/112), or
              Ambulance (108/112) services.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => {
                setCall112Confirmed(false);
                setConfirm112Modal(true);
              }}
              className="inline-flex items-center gap-2.5 rounded-lg bg-[#B91C1C] px-6 py-3.5 text-base font-bold text-white hover:bg-[#991B1B]"
            >
              <PhoneCall className="h-5 w-5" />
              <span>Call 112 (Emergency Services)</span>
            </button>
            <div className="text-xs text-[#5A605A]">
              Police: 112 / 100 · Ambulance: 108 · Fire: 101 · Women Helpline: 1091
            </div>
          </div>
        </section>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Urgent Local Service Form */}
          <form
            onSubmit={handleUrgentSubmit}
            className="lg:col-span-7 rounded-xl border border-[#E4E1D8] bg-white p-6 space-y-5"
          >
            <div>
              <h2 className="font-display text-xl font-bold text-[#181A18]">
                Submit Urgent Local Service Request
              </h2>
              <p className="text-xs text-[#5A605A] mt-1">
                Estimated response windows are estimates based on listed provider availability, not
                guarantees.
              </p>
            </div>

            {submittedRecord && (
              <div className="rounded-lg border border-[#134E3A]/30 bg-[#E6F2EC] p-4 space-y-1">
                <div className="flex items-center gap-2 text-sm font-bold text-[#134E3A]">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Urgent Request Logged ({submittedRecord.id})</span>
                </div>
                <p className="text-xs text-[#181A18]">
                  Status: {submittedRecord.status} · {submittedRecord.estimatedResponseWindow}
                </p>
                <p className="text-xs text-[#5A605A]">
                  You can also call any eligible provider listed on the right directly.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#5A605A]">
                Select Urgent Service Category
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {EMERGENCY_SERVICE_TYPES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setServiceType(item.id)}
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      serviceType === item.id
                        ? 'border-[#134E3A] bg-[#E6F2EC]/60'
                        : 'border-[#E4E1D8] bg-[#F8F7F4]'
                    }`}
                  >
                    <div className="text-sm font-semibold text-[#181A18]">
                      {language === 'ml'
                        ? item.labelMl
                        : language === 'hi'
                          ? item.labelHi
                          : item.label}
                    </div>
                    <div className="text-[11px] text-[#5A605A] mt-0.5">{item.description}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#5A605A] mb-1">
                  Contact Name
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Your name"
                  className="w-full rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5A605A] mb-1">
                  Callback Phone Number
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98470 00000"
                  className="w-full rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5A605A] mb-1">
                Describe the Urgent Problem
              </label>
              <textarea
                required
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Main distribution box tripped and kitchen line has burning smell; power shut off."
                className="w-full rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] px-3 py-2 text-sm"
              />
            </div>

            {/* Location & Privacy Controls */}
            <div className="rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-semibold text-[#181A18] inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-[#134E3A]" />
                  <span>Location & Privacy Control</span>
                </div>
                <button
                  type="button"
                  onClick={requestLocationPermission}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#134E3A]/40 bg-white px-3 py-1.5 text-xs font-semibold text-[#134E3A]"
                >
                  <Navigation className="h-3.5 w-3.5" />
                  <span>
                    {locationShared ? 'GPS Location Shared ✓' : 'Share GPS With Permission'}
                  </span>
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <select
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="rounded-lg border border-[#E4E1D8] bg-white px-3 py-2 text-xs"
                >
                  {KERALA_DISTRICTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
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
                  className="rounded-lg border border-[#E4E1D8] bg-white px-3 py-2 text-xs"
                >
                  {locations.map((l) => (
                    <option key={l.id} value={l.town}>
                      {l.town}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  placeholder="PIN"
                  className="rounded-lg border border-[#E4E1D8] bg-white px-3 py-2 text-xs font-mono-nums"
                />
              </div>
              <p className="text-[11px] text-[#5A605A] inline-flex items-center gap-1.5">
                <Lock className="h-3 w-3 shrink-0" />
                <span>
                  Your coordinates are only shared with eligible providers notified for this urgent
                  request and are never publicly listed.
                </span>
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-[#B91C1C] py-3 text-sm font-semibold text-white hover:bg-[#991B1B] disabled:opacity-60"
            >
              {submitting ? 'Submitting Urgent Request...' : 'Submit Urgent Service Request'}
            </button>
          </form>

          {/* Right Column: Eligible Providers + Request History */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-xl border border-[#E4E1D8] bg-white p-6 space-y-4">
              <div>
                <h2 className="font-display text-lg font-bold text-[#181A18]">
                  Eligible Providers ({eligibleProviders.length})
                </h2>
                <p className="text-xs text-[#5A605A] mt-0.5">
                  Estimated response: 30–75 mins (estimate only, subject to provider acceptance).
                </p>
              </div>

              {eligibleProviders.length === 0 ? (
                <p className="text-xs text-[#5A605A]">
                  No providers flagged urgent in this exact town right now. Submit the form to alert
                  nearby district providers.
                </p>
              ) : (
                <div className="space-y-3">
                  {eligibleProviders.map((p) => (
                    <div
                      key={p.id}
                      className="rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] p-3.5 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <button
                            type="button"
                            onClick={() => navigate({ page: 'provider-profile', id: p.id })}
                            className="text-sm font-bold text-[#181A18] hover:text-[#134E3A] text-left"
                          >
                            {p.name}
                          </button>
                          <div className="text-xs text-[#5A605A]">
                            {p.town} · {p.workingHours} {p.isDemo ? '· Demo' : ''}
                          </div>
                        </div>
                        <span className="font-mono-nums text-xs font-semibold text-[#134E3A]">
                          Est. ₹{p.startingPrice}+
                        </span>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <a
                          href={`tel:${p.phone.replace(/\s+/g, '')}`}
                          className="inline-flex items-center gap-1 rounded-md bg-[#134E3A] px-3 py-1.5 text-xs font-semibold text-white"
                        >
                          <Phone className="h-3 w-3" />
                          <span>Call Now</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => navigate({ page: 'provider-profile', id: p.id })}
                          className="rounded-md border border-[#E4E1D8] bg-white px-3 py-1.5 text-xs font-medium"
                        >
                          Profile
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Emergency Request History */}
            <div className="rounded-xl border border-[#E4E1D8] bg-white p-6 space-y-3">
              <h3 className="font-display text-base font-bold text-[#181A18] inline-flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#134E3A]" />
                <span>Emergency Request History</span>
              </h3>
              {history.length === 0 ? (
                <p className="text-xs text-[#5A605A]">
                  {user
                    ? 'No urgent local requests submitted yet.'
                    : 'Sign in to view your emergency request history.'}
                </p>
              ) : (
                <div className="space-y-2.5">
                  {history.map((h) => (
                    <div
                      key={h.id}
                      className="rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] p-3 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between font-semibold text-[#181A18]">
                        <span className="capitalize">{h.serviceType.replace(/-/g, ' ')}</span>
                        <span className="text-[#134E3A] capitalize">{h.status}</span>
                      </div>
                      <p className="text-[#5A605A]">{h.description}</p>
                      <div className="text-[11px] text-[#5A605A]">
                        {h.town} ({h.pincode}) · {new Date(h.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal Before Initiating Call 112 */}
      {confirm112Modal && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 space-y-4 border border-red-200 shadow-2xl">
            <div className="flex items-center gap-2.5 text-[#B91C1C]">
              <ShieldAlert className="h-6 w-6" />
              <h3 className="font-display text-lg font-bold">Confirm Emergency Call to 112</h3>
            </div>
            <p className="text-sm text-[#5A605A] leading-relaxed">
              You are about to dial <strong>112</strong> (India Unified Emergency Response — Police,
              Fire & Ambulance). LocalConnect does not operate or dispatch emergency services.
            </p>
            {call112Confirmed ? (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-900 space-y-2">
                <div>Dialing link ready for your device:</div>
                <a
                  href="tel:112"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#B91C1C] py-2.5 text-sm font-bold text-white"
                >
                  <PhoneCall className="h-4 w-4" />
                  <span>Tap to Dial 112 Now</span>
                </a>
              </div>
            ) : (
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirm112Modal(false)}
                  className="rounded-lg border border-[#E4E1D8] px-4 py-2 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setCall112Confirmed(true)}
                  className="rounded-lg bg-[#B91C1C] px-4 py-2 text-xs font-semibold text-white"
                >
                  Yes, Confirm Call 112
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
