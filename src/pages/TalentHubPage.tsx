import React, { useCallback, useEffect, useState } from 'react';
import {
  Briefcase,
  CheckCircle2,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { KERALA_LOCATIONS } from '../../shared/keralaData.ts';
import type { TalentProfile } from '../../shared/types.ts';
import { useApp } from '../context/AppContext.tsx';
import { apiFetch } from '../lib/api.ts';

const SKILL_CATEGORIES = [
  'All',
  'Tailor',
  'Artist',
  'Photographer',
  'Tutor',
  'Designer',
  'Mechanic',
  'Electrician',
  'Carpenter',
  'Musician',
];

export const TalentHubPage: React.FC = () => {
  const { user, selectedLocation, navigate, showToast } = useApp();
  const [talents, setTalents] = useState<TalentProfile[]>([]);
  const [q, setQ] = useState('');
  const [skill, setSkill] = useState('All');
  const [district, setDistrict] = useState('All');
  const [loading, setLoading] = useState(true);
  const [selectedTalent, setSelectedTalent] = useState<TalentProfile | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Create showcase profile form state
  const [formName, setFormName] = useState(user?.name || '');
  const [formHeadline, setFormHeadline] = useState('');
  const [formSkillCat, setFormSkillCat] = useState('Tailor');
  const [formBio, setFormBio] = useState('');
  const [formQualsCsv, setFormQualsCsv] = useState('');
  const [formCertsCsv, setFormCertsCsv] = useState('');
  const [formLanguagesCsv, setFormLanguagesCsv] = useState('Malayalam, English');
  const [formExpYears, setFormExpYears] = useState('3');
  const [formTown, setFormTown] = useState(user?.town || selectedLocation.town);
  const [formDistrict, setFormDistrict] = useState(user?.district || selectedLocation.district);
  const [formPhone, setFormPhone] = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);

  const loadTalents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      if (skill !== 'All') params.set('skill', skill);
      if (district !== 'All') params.set('district', district);
      const res = await apiFetch<{ talents: TalentProfile[] }>(`/api/talent?${params.toString()}`);
      setTalents(res.talents);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [q, skill, district]);

  useEffect(() => {
    loadTalents();
  }, [loadTalents]);

  const districts = ['All', ...Array.from(new Set(KERALA_LOCATIONS.map((l) => l.district)))];

  const handleCreateTalent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showToast('Please sign in to publish a Local Talent profile.', 'info');
      navigate({ page: 'login' });
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch<{ talent: TalentProfile }>('/api/talent', {
        method: 'POST',
        body: JSON.stringify({
          name: formName || user.name,
          headline: formHeadline,
          skillCategory: formSkillCat,
          bio: formBio,
          experienceYears: Number(formExpYears) || 1,
          languages: formLanguagesCsv
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          selfReportedQualifications: formQualsCsv
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          certificates: formCertsCsv
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          district: formDistrict,
          town: formTown,
          locality: user.locality || formTown,
          phone: formPhone || user.phone,
        }),
      });
      setTalents((prev) => [res.talent, ...prev]);
      setShowCreateForm(false);
      setFormHeadline('');
      setFormBio('');
      setFormQualsCsv('');
      setFormCertsCsv('');
      showToast('Your Local Talent Hub showcase profile is live!', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to save profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-[#E4E1D8] bg-white p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#134E3A]">
            <Users className="h-4 w-4 text-[#B68A1E]" />
            <span>Kerala Local Talent Hub</span>
          </div>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-[#181A18]">
            Discover Skilled Craftspeople, Artists & Specialists
          </h1>
          <p className="mt-1.5 text-sm text-[#5A605A] max-w-2xl">
            Showcase directory for tailors, mural artists, photographers, tutors, carpenters, musicians, and independent craftspeople across Kerala. Self-reported qualifications are clearly separated from platform-verified credentials.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (!user) {
              showToast('Sign in to create your Local Talent showcase profile.', 'info');
              navigate({ page: 'login' });
              return;
            }
            setFormName(user.name);
            setFormPhone(user.phone);
            setShowCreateForm((v) => !v);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#134E3A] px-5 py-3 text-sm font-semibold text-white hover:bg-[#0D3B2B] shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>{showCreateForm ? 'Close Form' : 'List My Talent'}</span>
        </button>
      </div>

      {/* Create Talent Form */}
      {showCreateForm && (
        <form
          onSubmit={handleCreateTalent}
          className="rounded-xl border border-[#134E3A]/30 bg-white p-6 space-y-4"
        >
          <h2 className="font-display text-lg font-bold text-[#181A18]">
            Create Local Talent Showcase Profile
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#5A605A] mb-1">Display Name</label>
              <input
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full rounded-lg border border-[#E4E1D8] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#5A605A] mb-1">Skill Category</label>
              <select
                value={formSkillCat}
                onChange={(e) => setFormSkillCat(e.target.value)}
                className="w-full rounded-lg border border-[#E4E1D8] px-3 py-2 text-sm bg-white"
              >
                {SKILL_CATEGORIES.filter((s) => s !== 'All').map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#5A605A] mb-1">Years of Experience</label>
              <input
                type="number"
                min={0}
                max={60}
                value={formExpYears}
                onChange={(e) => setFormExpYears(e.target.value)}
                className="w-full rounded-lg border border-[#E4E1D8] px-3 py-2 text-sm font-mono-nums"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#5A605A] mb-1">
                Professional Headline
              </label>
              <input
                required
                placeholder="e.g., Bespoke Kasavu & Bridal Tailor"
                value={formHeadline}
                onChange={(e) => setFormHeadline(e.target.value)}
                className="w-full rounded-lg border border-[#E4E1D8] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#5A605A] mb-1">
                Languages Spoken (comma separated)
              </label>
              <input
                placeholder="e.g., Malayalam, English, Hindi"
                value={formLanguagesCsv}
                onChange={(e) => setFormLanguagesCsv(e.target.value)}
                className="w-full rounded-lg border border-[#E4E1D8] px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#5A605A] mb-1">
                Self-Reported Qualifications (comma separated)
              </label>
              <input
                placeholder="e.g., Diploma in Fashion Design, KGTE Garment Making"
                value={formQualsCsv}
                onChange={(e) => setFormQualsCsv(e.target.value)}
                className="w-full rounded-lg border border-[#E4E1D8] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#5A605A] mb-1">
                Certificates / Workshops (comma separated)
              </label>
              <input
                placeholder="e.g., District Crafts Guild Showcase 2024"
                value={formCertsCsv}
                onChange={(e) => setFormCertsCsv(e.target.value)}
                className="w-full rounded-lg border border-[#E4E1D8] px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5A605A] mb-1">About Your Work</label>
            <textarea
              rows={3}
              value={formBio}
              onChange={(e) => setFormBio(e.target.value)}
              placeholder="Describe your craft, service area, and typical projects..."
              className="w-full rounded-lg border border-[#E4E1D8] px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-[#5A605A] mb-1">Town</label>
              <input
                value={formTown}
                onChange={(e) => setFormTown(e.target.value)}
                className="w-full rounded-lg border border-[#E4E1D8] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#5A605A] mb-1">District</label>
              <input
                value={formDistrict}
                onChange={(e) => setFormDistrict(e.target.value)}
                className="w-full rounded-lg border border-[#E4E1D8] px-3 py-2 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="rounded-lg border border-[#E4E1D8] px-4 py-2 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-[#134E3A] px-5 py-2 text-xs font-semibold text-white hover:bg-[#0D3B2B]"
              >
                {saving ? 'Publishing...' : 'Publish Profile'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Search & Filter Controls */}
      <div className="rounded-xl border border-[#E4E1D8] bg-white p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="h-4 w-4 text-[#5A605A] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search skills, crafts, or Kerala town..."
            className="w-full rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] pl-9 pr-3 py-2.5 text-sm focus:border-[#134E3A] focus:bg-white focus:outline-none"
          />
        </div>
        <select
          aria-label="Filter by skill category"
          value={skill}
          onChange={(e) => setSkill(e.target.value)}
          className="rounded-lg border border-[#E4E1D8] bg-white px-3 py-2.5 text-sm"
        >
          {SKILL_CATEGORIES.map((s) => (
            <option key={s} value={s}>
              {s === 'All' ? 'All Skill Categories' : s}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by Kerala district"
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          className="rounded-lg border border-[#E4E1D8] bg-white px-3 py-2.5 text-sm"
        >
          {districts.map((d) => (
            <option key={d} value={d}>
              {d === 'All' ? 'All Kerala Districts' : d}
            </option>
          ))}
        </select>
      </div>

      {/* Talent Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-56 rounded-xl border border-[#E4E1D8] bg-white animate-pulse" />
          ))}
        </div>
      ) : talents.length === 0 ? (
        <div className="rounded-xl border border-[#E4E1D8] bg-white p-8 text-center text-sm text-[#5A605A]">
          No local talent profiles match that filter. Try clearing your filters or be the first to publish!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {talents.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-[#E4E1D8] bg-white p-5 flex flex-col justify-between gap-4 hover:border-[#134E3A]/50 transition-colors"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#134E3A]">
                      <span>{item.skillCategory}</span>
                      {item.isFeatured && (
                        <span className="inline-flex items-center gap-0.5 text-[#B68A1E]">
                          · <Sparkles className="h-3 w-3" /> Featured
                        </span>
                      )}
                      {item.isDemo && (
                        <span className="text-[#5A605A] font-normal">· Demo</span>
                      )}
                    </div>
                    <h3 className="mt-0.5 font-display text-lg font-bold text-[#181A18]">
                      {item.name}
                    </h3>
                    <p className="text-xs text-[#5A605A]">{item.headline}</p>
                  </div>
                  <span className="font-mono-nums text-xs font-semibold text-[#134E3A] shrink-0">
                    {item.experienceYears} yrs exp
                  </span>
                </div>

                <p className="text-xs text-[#5A605A] line-clamp-3 leading-relaxed">{item.bio}</p>

                <div className="text-[11px] text-[#5A605A]">
                  Languages: <span className="text-[#181A18] font-medium">{item.languages.join(' · ')}</span>
                </div>
              </div>

              <div className="space-y-3 border-t border-[#E4E1D8] pt-3">
                <div className="flex items-center justify-between text-xs text-[#5A605A]">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {item.town}, {item.district}
                  </span>
                  {item.platformVerified ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-[#134E3A]">
                      <ShieldCheck className="h-3.5 w-3.5" /> Platform Verified
                    </span>
                  ) : (
                    <span>Self-Listed Member</span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedTalent(item)}
                  className="w-full rounded-lg border border-[#134E3A] py-2 text-xs font-semibold text-[#134E3A] hover:bg-[#E6F2EC]"
                >
                  Inspect Portfolio & Contact
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Talent Detail Modal */}
      {selectedTalent && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-[#E4E1D8] bg-white p-6 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-[#E4E1D8] pb-4">
              <div>
                <div className="text-xs font-semibold text-[#134E3A]">
                  {selectedTalent.skillCategory} · {selectedTalent.locality}, {selectedTalent.town},{' '}
                  {selectedTalent.district} · {selectedTalent.experienceYears} years experience
                </div>
                <h2 className="mt-0.5 font-display text-2xl font-bold text-[#181A18]">
                  {selectedTalent.name}
                </h2>
                <p className="text-sm text-[#5A605A]">{selectedTalent.headline}</p>
              </div>
              <button
                type="button"
                data-compact="true"
                onClick={() => setSelectedTalent(null)}
                aria-label="Close modal"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E4E1D8]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-sm text-[#181A18] leading-relaxed">{selectedTalent.bio}</p>

            {/* Transparent Credential Separation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] p-3.5 space-y-1.5">
                <div className="font-semibold text-[#181A18] flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5 text-[#5A605A]" />
                  <span>Self-Reported Qualifications & Certificates</span>
                </div>
                {selectedTalent.selfReportedQualifications.length === 0 &&
                selectedTalent.certificates.length === 0 ? (
                  <p className="text-[#5A605A]">Not specified by member</p>
                ) : (
                  <ul className="list-disc pl-4 space-y-1 text-[#5A605A]">
                    {[
                      ...selectedTalent.selfReportedQualifications,
                      ...selectedTalent.certificates,
                    ].map((q, idx) => (
                      <li key={idx}>{q}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] p-3.5 space-y-1.5">
                <div className="font-semibold text-[#181A18] flex items-center gap-1.5">
                  <CheckCircle2
                    className={`h-3.5 w-3.5 ${
                      selectedTalent.platformVerified ? 'text-[#134E3A]' : 'text-[#5A605A]'
                    }`}
                  />
                  <span>Platform Verification Status</span>
                </div>
                <p className="text-[#5A605A]">
                  {selectedTalent.platformVerified
                    ? 'Identity & profile verified by LocalConnect Administrators.'
                    : 'Independent Talent Hub listing — qualifications listed at left are self-reported.'}
                </p>
                <p className="text-[#181A18] font-medium pt-1">
                  Languages: {selectedTalent.languages.join(', ')}
                </p>
              </div>
            </div>

            {selectedTalent.workSamples.length > 0 && (
              <div className="space-y-2.5">
                <h3 className="text-sm font-semibold text-[#181A18]">Work Samples</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedTalent.workSamples.map((ws, idx) => (
                    <div
                      key={`${ws.title}-${idx}`}
                      className="rounded-lg border border-[#E4E1D8] overflow-hidden bg-[#F8F7F4]"
                    >
                      {ws.imageUrl && (
                        <img
                          src={ws.imageUrl}
                          alt={ws.title}
                          referrerPolicy="no-referrer"
                          className="h-32 w-full object-cover"
                        />
                      )}
                      <div className="p-2.5">
                        <div className="text-xs font-semibold text-[#181A18]">{ws.title}</div>
                        <div className="text-[11px] text-[#5A605A] mt-0.5">{ws.notes}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2.5 border-t border-[#E4E1D8] pt-4">
              <a
                href={`tel:${selectedTalent.phone.replace(/\s+/g, '')}`}
                className="inline-flex items-center gap-2 rounded-lg bg-[#134E3A] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#0D3B2B]"
              >
                <Phone className="h-3.5 w-3.5" />
                <span>Call {selectedTalent.phone}</span>
              </a>
              <a
                href={`https://wa.me/${selectedTalent.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                  `Hello ${selectedTalent.name}, I saw your work on LocalConnect Talent Hub.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#E4E1D8] px-4 py-2.5 text-xs font-semibold text-[#181A18] hover:border-[#134E3A]"
              >
                <MessageCircle className="h-3.5 w-3.5 text-[#134E3A]" />
                <span>WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
