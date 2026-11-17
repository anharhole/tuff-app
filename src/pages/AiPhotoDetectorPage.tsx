import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Camera,
  CheckCircle2,
  HelpCircle,
  ShieldAlert,
  Upload,
} from 'lucide-react';
import type { PhotoAnalysisResult } from '../../shared/types.ts';
import { useApp } from '../context/AppContext.tsx';
import { apiFetch } from '../lib/api.ts';

export const AiPhotoDetectorPage: React.FC = () => {
  const { categories, selectedLocation, navigate, showToast } = useApp();
  const [imagePreview, setImagePreview] = useState<string>('');
  const [mimeType, setMimeType] = useState<string>('image/jpeg');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PhotoAnalysisResult | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4_000_000) {
      showToast('Please select an image smaller than 4 MB.', 'error');
      return;
    }
    setMimeType(file.type || 'image/jpeg');
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImagePreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const analyzeProblem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imagePreview && !note.trim()) {
      showToast('Upload a problem photo or enter a short visual note.', 'info');
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch<{ analysis: PhotoAnalysisResult; usedFallback?: boolean }>(
        '/api/ai/analyze-photo',
        {
          method: 'POST',
          body: JSON.stringify({
            imageBase64: imagePreview || undefined,
            mimeType,
            note: note.trim() || undefined,
          }),
        }
      );
      setResult(res.analysis);
      setUsedFallback(Boolean(res.usedFallback));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Photo analysis failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const matchedCat = result
    ? categories.find((c) => c.id === result.suggestedCategoryId)
    : undefined;
  const matchedSub = matchedCat?.subcategories.find(
    (s) => s.id === result?.suggestedSubcategoryId
  );

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-6">
      <div className="rounded-xl border border-[#E4E1D8] bg-white p-6 sm:p-8">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#134E3A]">
          <Camera className="h-4 w-4 text-[#B68A1E]" />
          <span>AI Photo Problem Detector</span>
        </div>
        <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-[#181A18]">
          Inspect a household issue from a photograph
        </h1>
        <p className="mt-1.5 text-sm text-[#5A605A] max-w-2xl">
          Upload a clear photo of an appliance, leak, wiring fault, damp wall, or carpentry issue. LocalConnect AI will suggest possible issues, recommend the right Kerala specialist category, and share safe questions to ask — never unsafe DIY repair steps.
        </p>

        <form onSubmit={analyzeProblem} className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className="block rounded-xl border-2 border-dashed border-[#E4E1D8] bg-[#F8F7F4] p-6 text-center cursor-pointer hover:border-[#134E3A] transition-colors">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Uploaded issue preview"
                  className="mx-auto max-h-56 rounded-lg object-contain"
                />
              ) : (
                <div className="space-y-2 py-6">
                  <Upload className="mx-auto h-8 w-8 text-[#134E3A]" />
                  <div className="text-sm font-semibold text-[#181A18]">
                    Upload problem photograph
                  </div>
                  <div className="text-xs text-[#5A605A]">
                    JPG, PNG, or WebP up to 4 MB (AC unit, pipe leak, switchboard, crack, appliance)
                  </div>
                </div>
              )}
            </label>

            {imagePreview && (
              <button
                type="button"
                data-compact="true"
                onClick={() => setImagePreview('')}
                className="text-xs font-medium text-[#B91C1C] hover:underline"
              >
                Remove image
              </button>
            )}
          </div>

          <div className="flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[#181A18]">
                Additional Observation / Symptom Note
              </label>
              <textarea
                rows={4}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g., Water dripping from split AC indoor unit and blinking timer light, or dampness near bathroom wall..."
                className="w-full rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] p-3 text-sm text-[#181A18] focus:border-[#134E3A] focus:bg-white focus:outline-none"
              />
              <div className="flex flex-wrap gap-2 pt-1">
                {[
                  'AC indoor unit dripping water',
                  'Bathroom tap pipe leaking under sink',
                  'Wall switchboard sparking / tripping MCB',
                ].map((sample) => (
                  <button
                    key={sample}
                    type="button"
                    data-compact="true"
                    onClick={() => setNote(sample)}
                    className="rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] px-2.5 py-1 text-xs text-[#5A605A] hover:text-[#181A18]"
                  >
                    {sample}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[#134E3A] py-3 text-sm font-semibold text-white hover:bg-[#0D3B2B] disabled:opacity-60"
            >
              {loading ? 'Analyzing Problem Image...' : 'Analyze Issue & Suggest Specialists'}
            </button>
          </div>
        </form>
      </div>

      {result && (
        <div className="rounded-xl border border-[#E4E1D8] bg-white p-6 space-y-6">
          {usedFallback && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900">
              Preliminary symptom-based assessment active — live Gemini Vision analysis activates automatically when GEMINI_API_KEY is configured.
            </div>
          )}
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E4E1D8] pb-4">
            <div>
              <span className="inline-block rounded bg-[#E6F2EC] px-2.5 py-1 text-xs font-semibold text-[#134E3A]">
                Suggested Category: {matchedCat?.name || result.suggestedCategoryId}
                {matchedSub ? ` · ${matchedSub.name}` : ''}
              </span>
              <h2 className="mt-2 font-display text-xl font-bold text-[#181A18]">
                Visual Assessment Summary
              </h2>
            </div>
            <button
              type="button"
              onClick={() =>
                navigate({
                  page: 'request-service',
                  categoryId: result.suggestedCategoryId,
                  subcategoryId: result.suggestedSubcategoryId,
                  draftTitle: result.draftTitle,
                  draftDescription: result.draftDescription,
                  draftTown: selectedLocation.town,
                })
              }
              className="inline-flex items-center gap-2 rounded-lg bg-[#134E3A] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#0D3B2B]"
            >
              <span>Create Service Request (Confirmation Required)</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {result.observations.length > 0 && (
            <div className="rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] p-4 space-y-1.5">
              <div className="text-xs font-semibold uppercase tracking-wide text-[#5A605A]">
                Key Visual Observations
              </div>
              <ul className="space-y-1 text-sm text-[#181A18] list-disc pl-4">
                {result.observations.map((obs: string, idx: number) => (
                  <li key={idx}>{obs}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#181A18]">
                <CheckCircle2 className="h-4 w-4 text-[#134E3A]" />
                <span>Possible Problems (Preliminary)</span>
              </div>
              <ul className="space-y-1.5 text-xs text-[#5A605A] list-disc pl-4">
                {result.possibleProblems.map((issue: string, idx: number) => (
                  <li key={idx}>{issue}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#181A18]">
                <HelpCircle className="h-4 w-4 text-[#B68A1E]" />
                <span>Questions to Ask Providers</span>
              </div>
              <ul className="space-y-1.5 text-xs text-[#5A605A] list-disc pl-4">
                {result.recommendedQuestions.map((q: string, idx: number) => (
                  <li key={idx}>{q}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-950 flex gap-2.5">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-700" />
              <div>
                <div className="font-semibold">Uncertainty Notice</div>
                <p className="mt-0.5 leading-relaxed">{result.uncertaintyNote}</p>
              </div>
            </div>

            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-950 flex gap-2.5">
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-[#B91C1C]" />
              <div>
                <div className="font-semibold">Safety First — No Unsafe DIY</div>
                <p className="mt-0.5 leading-relaxed">{result.safetyWarning}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={() =>
                navigate({
                  page: 'search',
                  categoryId: result.suggestedCategoryId,
                  subcategoryId: result.suggestedSubcategoryId,
                })
              }
              className="rounded-lg border border-[#E4E1D8] px-4 py-2 text-xs font-semibold text-[#181A18] hover:border-[#134E3A]"
            >
              Browse Matching Specialists
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
