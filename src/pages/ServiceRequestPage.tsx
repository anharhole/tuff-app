import React, { useEffect, useState } from 'react';
import { Bookmark, Camera, CheckCircle2, MapPin, Navigation, Upload, X } from 'lucide-react';
import { KERALA_DISTRICTS } from '../../shared/keralaData.ts';
import type { Provider, UserAddress } from '../../shared/types.ts';
import { useApp } from '../context/AppContext.tsx';
import { apiFetch } from '../lib/api.ts';

export const ServiceRequestPage: React.FC = () => {
  const { user, categories, locations, selectedLocation, route, navigate, showToast } = useApp();

  const initialCatId = route.categoryId || categories[0]?.id || 'home-services';
  const initialCat = categories.find((c) => c.id === initialCatId) || categories[0];
  const initialSubId =
    route.subcategoryId || initialCat?.subcategories[0]?.id || 'electrician';

  const [categoryId, setCategoryId] = useState(initialCatId);
  const [subcategoryId, setSubcategoryId] = useState(initialSubId);
  const [targetProvider, setTargetProvider] = useState<Provider | null>(null);
  const [title, setTitle] = useState(route.draftTitle || '');
  const [description, setDescription] = useState(route.draftDescription || '');
  const [preferredDate, setPreferredDate] = useState(
    route.draftDate || new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  );
  const [preferredTime, setPreferredTime] = useState(route.draftTime || '10:00 AM');
  const [town, setTown] = useState(route.draftTown || user?.town || selectedLocation.town);
  const [district, setDistrict] = useState(user?.district || selectedLocation.district);
  const [locality, setLocality] = useState(user?.locality || selectedLocation.localities[0] || '');
  const [pincode, setPincode] = useState(user?.pincode || selectedLocation.pincode);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [savedAddresses, setSavedAddresses] = useState<UserAddress[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (route.categoryId) setCategoryId(route.categoryId);
    if (route.subcategoryId) setSubcategoryId(route.subcategoryId);
    if (route.draftTitle !== undefined) setTitle(route.draftTitle);
    if (route.draftDescription !== undefined) setDescription(route.draftDescription);
    if (route.draftDate !== undefined) setPreferredDate(route.draftDate);
    if (route.draftTime !== undefined) setPreferredTime(route.draftTime);
    if (route.draftTown !== undefined) {
      setTown(route.draftTown);
      const loc = locations.find((l) => l.town.toLowerCase() === route.draftTown?.toLowerCase());
      if (loc) {
        setDistrict(loc.district);
        setPincode(loc.pincode);
        setLocality(loc.localities[0] || '');
      }
    }
  }, [
    route.categoryId,
    route.subcategoryId,
    route.draftTitle,
    route.draftDescription,
    route.draftDate,
    route.draftTime,
    route.draftTown,
    locations,
  ]);

  useEffect(() => {
    if (route.providerId) {
      apiFetch<{ provider: Provider }>(`/api/providers/${route.providerId}`)
        .then((res) => setTargetProvider(res.provider))
        .catch(() => {});
    } else {
      setTargetProvider(null);
    }
  }, [route.providerId]);

  useEffect(() => {
    if (!user) return;
    if (!route.draftTown) {
      setTown(user.town);
      setDistrict(user.district);
      setLocality(user.locality);
      setPincode(user.pincode);
    }
    apiFetch<{ addresses: UserAddress[] }>('/api/addresses')
      .then((res) => setSavedAddresses(res.addresses))
      .catch(() => {});
  }, [user, route.draftTown]);

  const activeCategory = categories.find((c) => c.id === categoryId) || categories[0];

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files.slice(0, 4 - photos.length)) {
      if (file.size > 1_200_000) {
        showToast(`${file.name} exceeds 1.2 MB limit`, 'error');
        continue;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setPhotos((prev) => [...prev.slice(0, 3), reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const detectGps = () => {
    if (!navigator.geolocation) {
      showToast('Browser geolocation is unavailable on this device', 'info');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        showToast('Current GPS coordinates attached to request', 'success');
      },
      () => {
        showToast('Location permission denied. Using selected Kerala town.', 'info');
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showToast('Please sign in (or click a Demo Account) to submit a service request', 'info');
      navigate({ page: 'login' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiFetch<{ request: { id: string; notifiedProviderIds: string[] } }>(
        '/api/requests',
        {
          method: 'POST',
          body: JSON.stringify({
            categoryId,
            subcategoryId,
            targetProviderId: targetProvider?.id,
            title:
              title.trim() ||
              `${activeCategory?.subcategories.find((s) => s.id === subcategoryId)?.name || 'Service'} request`,
            description,
            photos,
            preferredDate,
            preferredTime,
            district,
            town,
            locality,
            pincode,
            lat: gpsCoords?.lat,
            lng: gpsCoords?.lng,
          }),
        }
      );
      showToast(
        `Request submitted! ${res.request.notifiedProviderIds.length} eligible provider(s) notified.`,
        'success'
      );
      navigate({ page: 'quotations', requestId: res.request.id });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to submit request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#181A18]">
          Request a Local Service
        </h1>
        <p className="text-sm text-[#5A605A] mt-1">
          Describe your requirement once to notify eligible Kerala professionals and compare
          quotations directly.
        </p>
      </div>

      {targetProvider && (
        <div className="rounded-xl border border-[#134E3A]/30 bg-[#E6F2EC]/60 p-4 flex items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-[#134E3A]">Requesting directly from</div>
            <div className="text-sm font-bold text-[#181A18]">{targetProvider.name}</div>
            <div className="text-xs text-[#5A605A]">
              {targetProvider.title} · {targetProvider.town}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setTargetProvider(null)}
            className="text-xs font-medium text-[#5A605A] hover:text-[#181A18] underline"
          >
            Broadcast to all nearby instead
          </button>
        </div>
      )}

      {!user && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <span className="text-amber-900">
            Sign in with your account or a Demo Customer account to submit and track requests.
          </span>
          <button
            type="button"
            onClick={() => navigate({ page: 'login' })}
            className="rounded-lg bg-[#134E3A] px-3.5 py-1.5 text-xs font-semibold text-white"
          >
            Sign In / Demo Login
          </button>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-[#E4E1D8] bg-white p-6 sm:p-8 space-y-6"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#5A605A] mb-1.5">
              Service Category
            </label>
            <select
              value={categoryId}
              onChange={(e) => {
                const nextCat = categories.find((c) => c.id === e.target.value);
                setCategoryId(e.target.value);
                if (nextCat?.subcategories[0]) {
                  setSubcategoryId(nextCat.subcategories[0].id);
                }
              }}
              className="w-full rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] px-3 py-2.5 text-sm"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5A605A] mb-1.5">
              Specific Service
            </label>
            <select
              value={subcategoryId}
              onChange={(e) => setSubcategoryId(e.target.value)}
              className="w-full rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] px-3 py-2.5 text-sm"
            >
              {activeCategory?.subcategories.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.typicalPriceRange})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#5A605A] mb-1.5">
            Request Summary Title
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Bedroom split AC water leakage & gas check"
            className="w-full rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] px-3.5 py-2.5 text-sm focus:border-[#134E3A] focus:bg-white focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#5A605A] mb-1.5">
            Problem Description
          </label>
          <textarea
            required
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the issue, appliance brand/model, floor level, or specific requirements..."
            className="w-full rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] px-3.5 py-2.5 text-sm focus:border-[#134E3A] focus:bg-white focus:outline-none"
          />
        </div>

        {/* Photo Attachments */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-[#5A605A]">
            Upload Relevant Photographs (optional, up to 4 images, max 1.2 MB each)
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <label className="cursor-pointer inline-flex items-center gap-2 rounded-lg border border-dashed border-[#134E3A]/50 bg-[#F8F7F4] px-4 py-2.5 text-xs font-semibold text-[#134E3A] hover:bg-[#E6F2EC]">
              <Upload className="h-4 w-4" />
              <span>Attach Photos</span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </label>
            <span className="text-xs text-[#5A605A] inline-flex items-center gap-1">
              <Camera className="h-3.5 w-3.5" />
              Helps technicians quote accurately before arriving
            </span>
          </div>
          {photos.length > 0 && (
            <div className="flex flex-wrap gap-3 pt-2">
              {photos.map((src, idx) => (
                <div key={idx} className="relative h-20 w-24 rounded-lg overflow-hidden border border-[#E4E1D8]">
                  <img src={src} alt={`Upload ${idx + 1}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setPhotos((prev) => prev.filter((_, i) => i !== idx))}
                    aria-label="Remove photo"
                    className="absolute top-1 right-1 rounded-full bg-black/70 p-0.5 text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Preferred Date & Time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#5A605A] mb-1.5">
              Preferred Date
            </label>
            <input
              type="date"
              required
              value={preferredDate}
              onChange={(e) => setPreferredDate(e.target.value)}
              className="w-full rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] px-3 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#5A605A] mb-1.5">
              Preferred Time Slot
            </label>
            <select
              value={preferredTime}
              onChange={(e) => setPreferredTime(e.target.value)}
              className="w-full rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] px-3 py-2.5 text-sm"
            >
              <option>08:30 AM</option>
              <option>10:00 AM</option>
              <option>12:00 PM</option>
              <option>03:00 PM</option>
              <option>05:30 PM</option>
              <option>Flexible / Anytime</option>
            </select>
          </div>
        </div>

        {/* Location */}
        <div className="space-y-3 border-t border-[#E4E1D8] pt-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-[#181A18] inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-[#134E3A]" />
              <span>Service Location in Kerala</span>
            </h2>
            <button
              type="button"
              onClick={detectGps}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] px-3 py-1.5 text-xs font-medium text-[#134E3A] hover:bg-[#E6F2EC]"
            >
              <Navigation className="h-3.5 w-3.5" />
              <span>{gpsCoords ? 'GPS Coordinates Attached ✓' : 'Share GPS Location'}</span>
            </button>
          </div>

          {savedAddresses.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-[#5A605A] inline-flex items-center gap-1">
                <Bookmark className="h-3.5 w-3.5 text-[#134E3A]" />
                Saved Addresses:
              </span>
              {savedAddresses.map((addr) => (
                <button
                  key={addr.id}
                  type="button"
                  data-compact="true"
                  onClick={() => {
                    setDistrict(addr.district);
                    setTown(addr.town);
                    setLocality(addr.addressLine ? `${addr.locality} (${addr.addressLine})` : addr.locality);
                    setPincode(addr.pincode);
                    showToast(`Applied "${addr.label}" address`, 'info');
                  }}
                  className="rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] px-2.5 py-1 text-xs font-medium text-[#181A18] hover:border-[#134E3A]"
                >
                  {addr.label} · {addr.town}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  const found = locations.find((l) => l.town === e.target.value);
                  setTown(e.target.value);
                  if (found) {
                    setDistrict(found.district);
                    setPincode(found.pincode);
                    setLocality(found.localities[0] || '');
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
                Locality / Landmark
              </label>
              <input
                type="text"
                required
                value={locality}
                onChange={(e) => setLocality(e.target.value)}
                placeholder="e.g. Payyanangadi, near Juma Masjid"
                className="w-full rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#5A605A] mb-1">PIN Code</label>
              <input
                type="text"
                required
                pattern="[0-9]{6}"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                placeholder="676101"
                className="w-full rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] px-3 py-2 text-sm font-mono-nums"
              />
            </div>
          </div>
        </div>

        <div className="pt-2 flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs text-[#5A605A] inline-flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-[#134E3A]" />
            <span>Free to post · Zero commission</span>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-[#134E3A] px-6 py-3 text-sm font-semibold text-white hover:bg-[#0D3B2B] disabled:opacity-60"
          >
            {submitting ? 'Submitting Request...' : 'Submit Service Request'}
          </button>
        </div>
      </form>
    </div>
  );
};
