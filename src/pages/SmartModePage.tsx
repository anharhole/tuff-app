import React, { useState } from 'react';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  MapPin,
  Mic,
  MicOff,
  Sparkles,
  Star,
  Wallet,
} from 'lucide-react';
import type { Provider, SmartModeExtraction } from '../../shared/types.ts';
import { useApp } from '../context/AppContext.tsx';
import { apiFetch } from '../lib/api.ts';

const SMART_EXAMPLES = [
  'Need an AC technician tomorrow morning in Tirur under ₹700',
  'Plumber needed in Kochi for leaking kitchen pipe today evening',
  'House cleaning service in Kozhikode this weekend',
  'തിരുരിൽ ഇലക്ട്രീഷ്യനെ ആവശ്യമുണ്ട്',
];

export const SmartModePage: React.FC = () => {
  const { selectedLocation, categories, navigate, showToast } = useApp();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [extraction, setExtraction] = useState<SmartModeExtraction | null>(null);
  const [providers, setProviders] = useState<Array<Provider & { distanceKm?: number }>>([]);
  const [summary, setSummary] = useState('');
  const [usedFallback, setUsedFallback] = useState(false);

  const runSmartSearch = async (textOverride?: string) => {
    const q = (textOverride ?? query).trim();
    if (!q) {
      showToast('Describe what you need in a sentence first.', 'info');
      return;
    }
    setQuery(q);
    setLoading(true);
    try {
      const res = await apiFetch<{
        extraction: SmartModeExtraction;
        providers: Array<Provider & { distanceKm?: number }>;
        total: number;
        usedFallback?: boolean;
      }>('/api/ai/smart-mode', {
        method: 'POST',
        body: JSON.stringify({
          query: q,
          userLat: selectedLocation.lat,
          userLng: selectedLocation.lng,
        }),
      });
      setExtraction(res.extraction);
      setProviders(res.providers || []);
      setSummary(res.extraction.explanation || '');
      setUsedFallback(Boolean(res.usedFallback));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Smart Mode failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceInput = () => {
    const win = window as unknown as {
      SpeechRecognition?: new () => {
        lang: string;
        onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
        onerror: (() => void) | null;
        onend: (() => void) | null;
        start: () => void;
      };
      webkitSpeechRecognition?: new () => {
        lang: string;
        onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
        onerror: (() => void) | null;
        onend: (() => void) | null;
        start: () => void;
      };
    };
    const Rec = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!Rec) {
      showToast('Voice recognition is unavailable in this browser. Type your request below.', 'info');
      return;
    }
    const rec = new Rec();
    rec.lang = 'en-IN';
    rec.onresult = (e) => {
      const text = e.results?.[0]?.[0]?.transcript?.trim();
      setListening(false);
      if (text) runSmartSearch(text);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    setListening(true);
    rec.start();
  };

  const categoryName = extraction?.categoryId
    ? categories.find((c) => c.id === extraction.categoryId)?.name || extraction.categoryId
    : undefined;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-8">
      <div className="rounded-xl border border-[#E4E1D8] bg-white p-6 sm:p-8 space-y-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#134E3A]">
              <Sparkles className="h-4 w-4 text-[#B68A1E]" />
              <span>LocalConnect Smart Mode</span>
            </div>
            <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-[#181A18]">
              Describe your need in one sentence
            </h1>
            <p className="mt-1.5 text-sm text-[#5A605A] max-w-2xl">
              Speak or write naturally in English, Malayalam, or Hindi. Smart Mode extracts the service, Kerala location, preferred timing, and budget, then matches verified local providers and prepares a quotation request for your confirmation.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate({ page: 'ai-photo' })}
            className="rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] px-3.5 py-2 text-xs font-semibold text-[#181A18] hover:border-[#134E3A]"
          >
            Prefer uploading a photo? Try Photo Detector
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            runSmartSearch();
          }}
          className="space-y-3"
        >
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g., Need an AC technician tomorrow morning in Tirur under ₹700"
                className="w-full rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] px-4 py-3 text-sm text-[#181A18] focus:border-[#134E3A] focus:bg-white focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleVoiceInput}
                title="Speak your request"
                className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium ${
                  listening
                    ? 'border-[#B91C1C] bg-[#B91C1C] text-white'
                    : 'border-[#E4E1D8] bg-white text-[#134E3A] hover:bg-[#E6F2EC]'
                }`}
              >
                {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                <span className="sm:hidden lg:inline">{listening ? 'Listening...' : 'Speak'}</span>
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 sm:flex-none rounded-lg bg-[#134E3A] px-6 py-3 text-sm font-semibold text-white hover:bg-[#0D3B2B] disabled:opacity-60"
              >
                {loading ? 'Analyzing...' : 'Find Matches'}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs font-medium text-[#5A605A]">Try:</span>
            {SMART_EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                data-compact="true"
                onClick={() => runSmartSearch(ex)}
                className="rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] px-2.5 py-1 text-xs text-[#181A18] hover:border-[#134E3A]"
              >
                {ex}
              </button>
            ))}
          </div>
        </form>
      </div>

      {extraction && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Extracted Intent Card */}
          <div className="rounded-xl border border-[#134E3A]/30 bg-[#E6F2EC]/50 p-5 space-y-4">
            <div className="flex items-center justify-between gap-2 text-sm font-semibold text-[#134E3A]">
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>Understood Request Details</span>
              </span>
              {usedFallback && (
                <span className="text-[10px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                  Local Parser
                </span>
              )}
            </div>
            <p className="text-xs text-[#181A18] leading-relaxed">{summary}</p>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between border-b border-[#134E3A]/15 pb-1.5">
                <span className="text-[#5A605A]">Service Needed</span>
                <span className="font-semibold text-[#181A18]">
                  {extraction.serviceQuery || categoryName || 'General Service'}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-[#134E3A]/15 pb-1.5">
                <span className="text-[#5A605A] flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> Location
                </span>
                <span className="font-semibold text-[#181A18]">
                  {extraction.town || selectedLocation.town}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-[#134E3A]/15 pb-1.5">
                <span className="text-[#5A605A] flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Timing
                </span>
                <span className="font-semibold text-[#181A18]">
                  {extraction.preferredDate || 'Flexible'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#5A605A] flex items-center gap-1">
                  <Wallet className="h-3 w-3" /> Max Budget
                </span>
                <span className="font-mono-nums font-semibold text-[#134E3A]">
                  {extraction.budgetMax ? `Up to ₹${extraction.budgetMax}` : 'Open to quotes'}
                </span>
              </div>
            </div>

            {extraction.missingInfo.length > 0 && (
              <div className="rounded-lg bg-white/80 border border-[#E4E1D8] p-3 text-xs text-[#5A605A]">
                <strong className="text-[#181A18]">Optional details you can clarify:</strong>{' '}
                {extraction.missingInfo.join(', ')}.
              </div>
            )}

            <button
              type="button"
              onClick={() =>
                navigate({
                  page: 'request-service',
                  categoryId: extraction.categoryId,
                  subcategoryId: extraction.subcategoryId,
                  draftTitle: extraction.serviceQuery
                    ? `${extraction.serviceQuery} request`
                    : 'LocalConnect Smart Request',
                  draftDescription: query,
                  draftTown: extraction.town || selectedLocation.town,
                  draftDate: extraction.preferredDate,
                })
              }
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#134E3A] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#0D3B2B]"
            >
              <span>Review & Confirm Service Request</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Matching Real Providers */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-[#181A18]">
                Matching Kerala Professionals ({providers.length})
              </h2>
              <button
                type="button"
                onClick={() =>
                  navigate({
                    page: 'search',
                    q: extraction.serviceQuery || query,
                    categoryId: extraction.categoryId,
                    subcategoryId: extraction.subcategoryId,
                  })
                }
                className="text-xs font-semibold text-[#134E3A] hover:underline"
              >
                Open Full Search & Map
              </button>
            </div>

            {providers.length === 0 ? (
              <div className="rounded-xl border border-[#E4E1D8] bg-white p-6 text-sm text-[#5A605A]">
                No exact provider match was found for those strict filters. Submit a Service Request above to broadcast to nearby professionals across {extraction.town || selectedLocation.town}, or broaden your search.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {providers.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-xl border border-[#E4E1D8] bg-white p-4 flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-display font-bold text-[#181A18]">{p.name}</h3>
                          <p className="text-xs text-[#5A605A]">{p.title}</p>
                        </div>
                        <span className="font-mono-nums text-xs font-semibold text-[#134E3A] bg-[#E6F2EC] px-2 py-0.5 rounded">
                          Starts ₹{p.startingPrice}
                        </span>
                      </div>
                      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#5A605A]">
                        <span className="inline-flex items-center gap-1 font-medium text-[#181A18]">
                          <Star className="h-3.5 w-3.5 fill-[#C99B2C] text-[#C99B2C]" />
                          {p.rating.toFixed(1)} ({p.reviewCount})
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {p.town}
                          {typeof p.distanceKm === 'number' ? ` · ${p.distanceKm} km` : ''}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-[#E4E1D8]">
                      <button
                        type="button"
                        onClick={() => navigate({ page: 'provider-profile', id: p.id })}
                        className="flex-1 rounded-lg border border-[#E4E1D8] py-2 text-xs font-semibold text-[#181A18] hover:border-[#134E3A]"
                      >
                        View Profile
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          navigate({
                            page: 'request-service',
                            providerId: p.id,
                            categoryId: extraction.categoryId || p.categoryIds[0],
                            subcategoryId: extraction.subcategoryId || p.subcategoryIds[0],
                            draftTitle: `${extraction.serviceQuery || p.title} for ${p.name}`,
                            draftDescription: query,
                            draftTown: extraction.town || p.town,
                            draftDate: extraction.preferredDate,
                          })
                        }
                        className="flex-1 rounded-lg bg-[#134E3A] py-2 text-xs font-semibold text-white hover:bg-[#0D3B2B]"
                      >
                        Request Quote
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
