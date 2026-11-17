import React, { useEffect, useState } from 'react';
import { Award, CheckCircle2, Lock, ShieldCheck, Star } from 'lucide-react';
import type { Provider, ProviderAchievement } from '../../shared/types.ts';
import { useApp } from '../context/AppContext.tsx';
import { apiFetch } from '../lib/api.ts';

export const AchievementsPage: React.FC<{ providerId?: string }> = ({ providerId }) => {
  const { providerProfile, navigate } = useApp();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedId, setSelectedId] = useState<string>(
    providerId || providerProfile?.id || 'prov-1'
  );
  const [selectedName, setSelectedName] = useState<string>('');
  const [achievements, setAchievements] = useState<ProviderAchievement[]>([]);
  const [earnedCount, setEarnedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ providers: Provider[] }>('/api/providers?limit=25')
      .then((res) => setProviders(res.providers))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    apiFetch<{
      providerName: string;
      achievements: ProviderAchievement[];
      earnedCount: number;
    }>(`/api/providers/${selectedId}/achievements`)
      .then((res) => {
        setSelectedName(res.providerName);
        setAchievements(res.achievements);
        setEarnedCount(res.earnedCount);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedId]);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 space-y-6">
      <div className="rounded-xl border border-[#E4E1D8] bg-white p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#134E3A]">
            <Award className="h-4 w-4 text-[#B68A1E]" />
            <span>Provider Achievement Centre</span>
          </div>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-[#181A18]">
            Verified Performance Milestones
          </h1>
          <p className="mt-1.5 text-sm text-[#5A605A] max-w-2xl">
            Every badge below is computed automatically from real database activity (completed bookings, verified reviews, quotations, favourites, and admin verification). Providers cannot assign badges to themselves.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
          <select
            aria-label="Inspect provider achievements"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] px-3 py-2 text-sm text-[#181A18]"
          >
            {providers.length === 0 ? (
              <option value={selectedId}>{selectedName || 'Selected Provider'}</option>
            ) : (
              providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.town})
                </option>
              ))
            )}
          </select>
          <button
            type="button"
            onClick={() => navigate({ page: 'provider-profile', id: selectedId })}
            className="rounded-lg border border-[#134E3A] px-3.5 py-2 text-xs font-semibold text-[#134E3A] hover:bg-[#E6F2EC]"
          >
            View Profile
          </button>
        </div>
      </div>

      {/* Summary Bar */}
      <div className="rounded-xl border border-[#E4E1D8] bg-[#E6F2EC]/50 p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#134E3A] text-white">
            <ShieldCheck className="h-6 w-6 text-[#C99B2C]" />
          </div>
          <div>
            <div className="font-display text-lg font-bold text-[#181A18]">
              {selectedName || 'Local Professional'}
            </div>
            <div className="text-xs text-[#5A605A]">
              {earnedCount} of {achievements.length} automatic achievements earned
            </div>
          </div>
        </div>
        <div className="font-mono-nums text-sm font-bold text-[#134E3A]">
          {achievements.length > 0 ? Math.round((earnedCount / achievements.length) * 100) : 0}% Milestone Completion
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-32 rounded-xl border border-[#E4E1D8] bg-white animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {achievements.map((badge) => {
            const pct = Math.min(100, Math.round((badge.progressCurrent / Math.max(1, badge.progressTarget)) * 100));
            return (
              <div
                key={badge.id}
                className={`rounded-xl border p-5 space-y-3 ${
                  badge.earned
                    ? 'border-[#134E3A]/40 bg-white'
                    : 'border-[#E4E1D8] bg-[#F8F7F4]/70'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                        badge.earned ? 'bg-[#E6F2EC] text-[#134E3A]' : 'bg-[#E4E1D8]/60 text-[#5A605A]'
                      }`}
                    >
                      {badge.earned ? (
                        <Star className="h-5 w-5 fill-[#C99B2C] text-[#C99B2C]" />
                      ) : (
                        <Lock className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-display text-base font-bold text-[#181A18]">
                        {badge.title}
                      </h3>
                      <p className="text-xs text-[#5A605A]">{badge.description}</p>
                    </div>
                  </div>
                  <span
                    className={`rounded px-2 py-0.5 text-[11px] font-semibold shrink-0 ${
                      badge.earned
                        ? 'bg-[#E6F2EC] text-[#134E3A]'
                        : 'bg-white border border-[#E4E1D8] text-[#5A605A]'
                    }`}
                  >
                    {badge.earned ? 'Earned' : 'In Progress'}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#5A605A]">Eligibility: {badge.ruleLabel}</span>
                    <span className="font-mono-nums font-semibold text-[#181A18]">
                      {badge.progressCurrent}/{badge.progressTarget}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#E4E1D8] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        badge.earned ? 'bg-[#134E3A]' : 'bg-[#B68A1E]'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {badge.earned && (
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#134E3A]">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Automatically verified from marketplace database</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
