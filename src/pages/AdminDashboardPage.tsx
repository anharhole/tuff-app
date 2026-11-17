import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FolderPlus,
  Layers,
  Shield,
  ShieldAlert,
  Star,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react';
import type {
  EmergencyRequest,
  Provider,
  PublicUser,
  ReportItem,
  Review,
  ServiceCategory,
  ServiceRequest,
  VerificationRequest,
} from '../../shared/types.ts';
import { useApp } from '../context/AppContext.tsx';
import { apiFetch } from '../lib/api.ts';

interface AdminOverviewData {
  stats: {
    totalUsers: number;
    totalCustomers: number;
    totalProviders: number;
    verifiedProviders: number;
    totalRequests: number;
    totalBookings: number;
    completedBookings: number;
    openReports: number;
    pendingVerifications: number;
  };
  users: PublicUser[];
  providers: Provider[];
  categories: ServiceCategory[];
  serviceRequests: ServiceRequest[];
  verificationRequests: VerificationRequest[];
  reports: ReportItem[];
  reviews: Review[];
  emergencyRequests: EmergencyRequest[];
}

type AdminTab =
  | 'overview'
  | 'providers'
  | 'verifications'
  | 'users'
  | 'reports'
  | 'reviews'
  | 'categories';

export const AdminDashboardPage: React.FC = () => {
  const { user, loginDemo, navigate, showToast } = useApp();
  const [data, setData] = useState<AdminOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<AdminTab>('overview');
  const [busyId, setBusyId] = useState<string | null>(null);

  const [verNotes, setVerNotes] = useState<Record<string, string>>({});
  const [reportNotes, setReportNotes] = useState<Record<string, string>>({});
  const [newCatId, setNewCatId] = useState('home-services');
  const [newSubName, setNewSubName] = useState('');
  const [newSubDesc, setNewSubDesc] = useState('');
  const [newSubPrice, setNewSubPrice] = useState('₹300 – ₹1,500');

  const loadOverview = useCallback(async () => {
    if (!user || user.role !== 'admin') {
      setLoading(false);
      return;
    }
    try {
      const res = await apiFetch<AdminOverviewData>('/api/admin/overview');
      setData(res);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to load admin overview', 'error');
    } finally {
      setLoading(false);
    }
  }, [user, showToast]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  if (!user || user.role !== 'admin') {
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-16">
        <div className="rounded-xl border border-[#E4E1D8] bg-white p-8 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#E6F2EC] text-[#134E3A]">
            <Shield className="h-6 w-6" />
          </div>
          <h1 className="font-display text-2xl font-bold text-[#181A18]">
            Admin Console Access Required
          </h1>
          <p className="text-sm text-[#5A605A] max-w-md mx-auto">
            Sign in with an administrator account to manage providers, verifications, customer
            reports, reviews, and service categories across LocalConnect Kerala.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => loginDemo('admin')}
              className="rounded-lg bg-[#134E3A] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0D3B2B]"
            >
              Sign in as Demo Admin
            </button>
            <button
              type="button"
              onClick={() => navigate({ page: 'home' })}
              className="rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] px-5 py-2.5 text-sm font-medium text-[#181A18] hover:bg-[#F1EFE9]"
            >
              Return Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const toggleProviderFlag = async (
    prov: Provider,
    field: 'isFeatured' | 'identityVerified' | 'skillVerified' | 'profileVerified'
  ) => {
    setBusyId(prov.id + field);
    try {
      await apiFetch(`/api/admin/providers/${prov.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ [field]: !prov[field] }),
      });
      await loadOverview();
      showToast(`Updated ${prov.name}`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Update failed', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleVerification = async (id: string, status: 'approved' | 'rejected') => {
    setBusyId(id);
    try {
      await apiFetch(`/api/admin/verifications/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, adminNote: verNotes[id] || undefined }),
      });
      await loadOverview();
      showToast(`Verification request ${status}`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Action failed', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleReportUpdate = async (
    id: string,
    status: 'open' | 'investigating' | 'resolved' | 'dismissed'
  ) => {
    setBusyId(id);
    try {
      await apiFetch(`/api/admin/reports/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, adminResolution: reportNotes[id] || undefined }),
      });
      await loadOverview();
      showToast(`Report updated to ${status}`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Report update failed', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleReviewModeration = async (
    id: string,
    moderatedStatus: 'published' | 'flagged' | 'hidden'
  ) => {
    setBusyId(id);
    try {
      await apiFetch(`/api/admin/reviews/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ moderatedStatus }),
      });
      await loadOverview();
      showToast(`Review set to ${moderatedStatus}`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Moderation failed', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const toggleUserSuspend = async (u: PublicUser) => {
    setBusyId(u.id);
    try {
      await apiFetch(`/api/admin/users/${u.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isSuspended: !u.isSuspended }),
      });
      await loadOverview();
      showToast(
        `${u.name} ${!u.isSuspended ? 'suspended' : 'restored'}`,
        'success'
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Action failed', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleAddSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubName.trim()) return;
    setBusyId('add-subcat');
    try {
      await apiFetch('/api/admin/categories', {
        method: 'POST',
        body: JSON.stringify({
          categoryId: newCatId,
          subcategoryName: newSubName.trim(),
          description: newSubDesc.trim() || undefined,
          typicalPriceRange: newSubPrice.trim() || undefined,
        }),
      });
      setNewSubName('');
      setNewSubDesc('');
      await loadOverview();
      showToast('Subcategory added to marketplace', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to add subcategory', 'error');
    } finally {
      setBusyId(null);
    }
  };

  if (loading || !data) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 text-sm text-[#5A605A]">
        Loading LocalConnect Admin Console...
      </div>
    );
  }

  const tabs: Array<{ id: AdminTab; label: string; count?: number }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'providers', label: 'Providers', count: data.providers.length },
    {
      id: 'verifications',
      label: 'Verifications',
      count: data.stats.pendingVerifications,
    },
    { id: 'users', label: 'Customers & Users', count: data.users.length },
    { id: 'reports', label: 'Reports', count: data.stats.openReports },
    { id: 'reviews', label: 'Reviews', count: data.reviews.length },
    { id: 'categories', label: 'Categories', count: data.categories.length },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E4E1D8] pb-6">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-[#134E3A]">
            LocalConnect Trust & Operations
          </div>
          <h1 className="mt-1 font-display text-3xl font-bold text-[#181A18]">
            Marketplace Admin Console
          </h1>
          <p className="mt-1 text-sm text-[#5A605A]">
            Moderate professionals, approve verification badges, resolve customer reports, and
            manage Kerala service categories.
          </p>
        </div>
        <button
          type="button"
          onClick={loadOverview}
          className="self-start rounded-lg border border-[#E4E1D8] bg-white px-4 py-2 text-xs font-semibold text-[#181A18] hover:bg-[#F1EFE9]"
        >
          Refresh Metrics
        </button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="rounded-xl border border-[#E4E1D8] bg-white p-4">
          <div className="text-xs text-[#5A605A]">Total Users</div>
          <div className="mt-1 font-mono-nums text-2xl font-bold text-[#181A18]">
            {data.stats.totalUsers}
          </div>
          <div className="text-[11px] text-[#5A605A] mt-0.5">
            {data.stats.totalCustomers} customers
          </div>
        </div>
        <div className="rounded-xl border border-[#E4E1D8] bg-white p-4">
          <div className="text-xs text-[#5A605A]">Providers</div>
          <div className="mt-1 font-mono-nums text-2xl font-bold text-[#134E3A]">
            {data.stats.totalProviders}
          </div>
          <div className="text-[11px] text-[#5A605A] mt-0.5">
            {data.stats.verifiedProviders} verified
          </div>
        </div>
        <div className="rounded-xl border border-[#E4E1D8] bg-white p-4">
          <div className="text-xs text-[#5A605A]">Service Requests</div>
          <div className="mt-1 font-mono-nums text-2xl font-bold text-[#181A18]">
            {data.stats.totalRequests}
          </div>
        </div>
        <div className="rounded-xl border border-[#E4E1D8] bg-white p-4">
          <div className="text-xs text-[#5A605A]">Bookings</div>
          <div className="mt-1 font-mono-nums text-2xl font-bold text-[#181A18]">
            {data.stats.totalBookings}
          </div>
          <div className="text-[11px] text-[#5A605A] mt-0.5">
            {data.stats.completedBookings} completed
          </div>
        </div>
        <div className="rounded-xl border border-[#E4E1D8] bg-white p-4">
          <div className="text-xs text-[#5A605A]">Pending Verifications</div>
          <div className="mt-1 font-mono-nums text-2xl font-bold text-[#C99B2C]">
            {data.stats.pendingVerifications}
          </div>
        </div>
        <div className="rounded-xl border border-[#E4E1D8] bg-white p-4">
          <div className="text-xs text-[#5A605A]">Open Reports</div>
          <div className="mt-1 font-mono-nums text-2xl font-bold text-[#B91C1C]">
            {data.stats.openReports}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 overflow-x-auto border-b border-[#E4E1D8] pb-3">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === item.id
                ? 'bg-[#134E3A] text-white'
                : 'bg-white border border-[#E4E1D8] text-[#5A605A] hover:text-[#181A18]'
            }`}
          >
            {item.label}
            {typeof item.count === 'number' && (
              <span className="ml-1.5 font-mono-nums text-xs opacity-80">({item.count})</span>
            )}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="rounded-xl border border-[#E4E1D8] bg-white p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-[#181A18]">
                Recent Service Requests
              </h2>
              <span className="text-xs text-[#5A605A] font-mono-nums">
                {data.serviceRequests.length} total
              </span>
            </div>
            <div className="divide-y divide-[#E4E1D8]">
              {data.serviceRequests.slice(0, 8).map((r) => (
                <div key={r.id} className="py-3 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[#181A18] truncate">{r.title}</div>
                    <div className="text-xs text-[#5A605A] mt-0.5">
                      {r.customerName} · {r.town} ({r.pincode}) · {r.preferredDate}
                    </div>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-[#134E3A] capitalize">
                    {r.status.replace(/_/g, ' ')}
                  </span>
                </div>
              ))}
              {data.serviceRequests.length === 0 && (
                <p className="py-6 text-sm text-[#5A605A]">No service requests logged yet.</p>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-[#E4E1D8] bg-white p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-[#181A18] flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-[#B91C1C]" />
                <span>Urgent Assistance Log</span>
              </h2>
              <span className="text-xs text-[#5A605A] font-mono-nums">
                {data.emergencyRequests.length} total
              </span>
            </div>
            <div className="divide-y divide-[#E4E1D8]">
              {data.emergencyRequests.slice(0, 8).map((em) => (
                <div key={em.id} className="py-3 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-[#181A18]">
                      {em.serviceType.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs font-medium text-[#B91C1C] capitalize">
                      {em.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-[#5A605A]">{em.description}</p>
                  <div className="text-[11px] text-[#5A605A]">
                    {em.customerName} · {em.town}, {em.district} · {em.eligibleProviderIds.length}{' '}
                    eligible tradespeople notified
                  </div>
                </div>
              ))}
              {data.emergencyRequests.length === 0 && (
                <p className="py-6 text-sm text-[#5A605A]">No urgent service logs yet.</p>
              )}
            </div>
          </section>
        </div>
      )}

      {/* Providers Tab */}
      {tab === 'providers' && (
        <section className="rounded-xl border border-[#E4E1D8] bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F8F7F4] border-b border-[#E4E1D8] text-xs font-semibold text-[#5A605A]">
                <tr>
                  <th className="px-4 py-3">Provider</th>
                  <th className="px-4 py-3">Town</th>
                  <th className="px-4 py-3">Rating / Jobs</th>
                  <th className="px-4 py-3">Identity</th>
                  <th className="px-4 py-3">Skill</th>
                  <th className="px-4 py-3">Profile</th>
                  <th className="px-4 py-3">Featured</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E1D8]">
                {data.providers.map((p) => (
                  <tr key={p.id} className="hover:bg-[#F8F7F4]/60">
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => navigate({ page: 'provider-profile', id: p.id })}
                        className="font-semibold text-[#181A18] hover:text-[#134E3A] text-left"
                      >
                        {p.name}
                      </button>
                      <div className="text-xs text-[#5A605A]">
                        {p.title}
                        {p.isDemo ? ' · Demo' : ''}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#5A605A]">
                      {p.town}, {p.district}
                    </td>
                    <td className="px-4 py-3 font-mono-nums text-xs">
                      {p.rating.toFixed(1)} ★ ({p.reviewCount}) · {p.completedJobs} jobs
                    </td>
                    {(
                      [
                        'identityVerified',
                        'skillVerified',
                        'profileVerified',
                        'isFeatured',
                      ] as const
                    ).map((field) => (
                      <td key={field} className="px-4 py-3">
                        <button
                          type="button"
                          disabled={busyId === p.id + field}
                          onClick={() => toggleProviderFlag(p, field)}
                          className={`rounded-md px-2.5 py-1 text-xs font-medium border transition-colors ${
                            p[field]
                              ? 'bg-[#E6F2EC] border-[#134E3A]/30 text-[#134E3A]'
                              : 'bg-white border-[#E4E1D8] text-[#5A605A]'
                          }`}
                        >
                          {p[field] ? 'Active' : 'Off'}
                        </button>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Verifications Tab */}
      {tab === 'verifications' && (
        <section className="space-y-4">
          {data.verificationRequests.length === 0 ? (
            <div className="rounded-xl border border-[#E4E1D8] bg-white p-8 text-center text-sm text-[#5A605A]">
              No verification requests submitted yet.
            </div>
          ) : (
            data.verificationRequests.map((ver) => (
              <div
                key={ver.id}
                className="rounded-xl border border-[#E4E1D8] bg-white p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-[#134E3A]" />
                    <span className="font-semibold text-[#181A18]">{ver.providerName}</span>
                    <span className="text-xs text-[#5A605A]">· {ver.type} verification</span>
                    <span
                      className={`text-xs font-semibold capitalize ${
                        ver.status === 'approved'
                          ? 'text-[#134E3A]'
                          : ver.status === 'rejected'
                            ? 'text-[#B91C1C]'
                            : 'text-[#C99B2C]'
                      }`}
                    >
                      · {ver.status}
                    </span>
                  </div>
                  <p className="text-sm text-[#5A605A]">{ver.summary}</p>
                  <div className="text-xs text-[#5A605A]">
                    Claimed experience: {ver.experienceClaim}
                    {ver.adminNote ? ` · Note: ${ver.adminNote}` : ''}
                  </div>
                </div>

                {ver.status === 'pending' && (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                    <input
                      type="text"
                      placeholder="Optional admin note..."
                      value={verNotes[ver.id] || ''}
                      onChange={(e) =>
                        setVerNotes((prev) => ({ ...prev, [ver.id]: e.target.value }))
                      }
                      className="rounded-lg border border-[#E4E1D8] px-3 py-2 text-xs text-[#181A18]"
                    />
                    <button
                      type="button"
                      disabled={busyId === ver.id}
                      onClick={() => handleVerification(ver.id, 'approved')}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#134E3A] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#0D3B2B]"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Approve</span>
                    </button>
                    <button
                      type="button"
                      disabled={busyId === ver.id}
                      onClick={() => handleVerification(ver.id, 'rejected')}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-[#B91C1C] hover:bg-red-100"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      <span>Reject</span>
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </section>
      )}

      {/* Users Tab */}
      {tab === 'users' && (
        <section className="rounded-xl border border-[#E4E1D8] bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F8F7F4] border-b border-[#E4E1D8] text-xs font-semibold text-[#5A605A]">
                <tr>
                  <th className="px-4 py-3">Name & Email</th>
                  <th className="px-4 py-3">Role / Active Mode</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">18+ Verified</th>
                  <th className="px-4 py-3">Account Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E1D8]">
                {data.users.map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-[#181A18] flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-[#5A605A]" />
                        <span>{u.name}</span>
                      </div>
                      <div className="text-xs text-[#5A605A]">
                        {u.email} · {u.phone}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#5A605A] capitalize">
                      {u.role} (active: {u.activeMode}) {u.isDemo ? '· Demo' : ''}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#5A605A]">
                      {u.town}, {u.district} ({u.pincode})
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {u.ageVerified ? 'Verified 18+' : 'Unverified'}
                    </td>
                    <td className="px-4 py-3">
                      {u.role === 'admin' ? (
                        <span className="text-xs font-semibold text-[#134E3A]">Admin Protected</span>
                      ) : (
                        <button
                          type="button"
                          disabled={busyId === u.id}
                          onClick={() => toggleUserSuspend(u)}
                          className={`rounded-md px-3 py-1 text-xs font-semibold border ${
                            u.isSuspended
                              ? 'border-red-200 bg-red-50 text-[#B91C1C]'
                              : 'border-[#E4E1D8] bg-[#F8F7F4] text-[#181A18] hover:bg-[#F1EFE9]'
                          }`}
                        >
                          {u.isSuspended ? 'Suspended (Restore)' : 'Active (Suspend)'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Reports Tab */}
      {tab === 'reports' && (
        <section className="space-y-4">
          {data.reports.length === 0 ? (
            <div className="rounded-xl border border-[#E4E1D8] bg-white p-8 text-center text-sm text-[#5A605A]">
              No customer or provider complaints submitted.
            </div>
          ) : (
            data.reports.map((rep) => (
              <div
                key={rep.id}
                className="rounded-xl border border-[#E4E1D8] bg-white p-5 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-[#B91C1C]" />
                    <span className="font-semibold text-[#181A18]">{rep.reason}</span>
                    <span className="text-xs text-[#5A605A]">
                      · Target: {rep.targetName} ({rep.targetType})
                    </span>
                  </div>
                  <span className="text-xs font-semibold capitalize text-[#134E3A]">
                    {rep.status}
                  </span>
                </div>
                <p className="text-sm text-[#5A605A]">{rep.details}</p>
                <div className="text-xs text-[#5A605A]">
                  Reported by {rep.reporterName} on{' '}
                  {new Date(rep.createdAt).toLocaleDateString('en-IN')}
                  {rep.adminResolution ? ` · Resolution: ${rep.adminResolution}` : ''}
                </div>
                <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-[#E4E1D8]">
                  <input
                    type="text"
                    placeholder="Add resolution note..."
                    value={reportNotes[rep.id] || ''}
                    onChange={(e) =>
                      setReportNotes((prev) => ({ ...prev, [rep.id]: e.target.value }))
                    }
                    className="flex-1 rounded-lg border border-[#E4E1D8] px-3 py-1.5 text-xs text-[#181A18]"
                  />
                  <div className="flex flex-wrap gap-2">
                    {(['investigating', 'resolved', 'dismissed'] as const).map((status) => (
                      <button
                        key={status}
                        type="button"
                        disabled={busyId === rep.id}
                        onClick={() => handleReportUpdate(rep.id, status)}
                        className="rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] px-3 py-1.5 text-xs font-semibold capitalize text-[#181A18] hover:border-[#134E3A] hover:text-[#134E3A]"
                      >
                        Mark {status}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </section>
      )}

      {/* Reviews Moderation Tab */}
      {tab === 'reviews' && (
        <section className="space-y-3">
          {data.reviews.map((rev) => (
            <div
              key={rev.id}
              className="rounded-xl border border-[#E4E1D8] bg-white p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-semibold text-[#181A18]">{rev.customerName}</span>
                  <span className="inline-flex items-center gap-0.5 font-mono-nums font-semibold text-[#181A18]">
                    <Star className="h-3.5 w-3.5 fill-[#C99B2C] text-[#C99B2C]" />
                    {rev.rating}.0
                  </span>
                  <span className="text-xs text-[#5A605A]">· {rev.serviceName}</span>
                  <span className="text-xs font-semibold capitalize text-[#134E3A]">
                    · {rev.moderatedStatus}
                  </span>
                </div>
                <p className="text-sm text-[#5A605A]">{rev.comment}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {(['published', 'flagged', 'hidden'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    disabled={busyId === rev.id}
                    onClick={() => handleReviewModeration(rev.id, st)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize border ${
                      rev.moderatedStatus === st
                        ? 'bg-[#134E3A] border-[#134E3A] text-white'
                        : 'bg-white border-[#E4E1D8] text-[#5A605A] hover:text-[#181A18]'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Categories & Subcategories Tab */}
      {tab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form
            onSubmit={handleAddSubcategory}
            className="rounded-xl border border-[#E4E1D8] bg-white p-6 space-y-4 h-fit"
          >
            <h2 className="font-display text-lg font-bold text-[#181A18] flex items-center gap-2">
              <FolderPlus className="h-4 w-4 text-[#134E3A]" />
              <span>Add Subcategory</span>
            </h2>
            <div>
              <label className="block text-xs font-semibold text-[#5A605A] mb-1">
                Parent Category
              </label>
              <select
                value={newCatId}
                onChange={(e) => setNewCatId(e.target.value)}
                className="w-full rounded-lg border border-[#E4E1D8] px-3 py-2 text-sm text-[#181A18]"
              >
                {data.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#5A605A] mb-1">
                Subcategory Name
              </label>
              <input
                type="text"
                required
                value={newSubName}
                onChange={(e) => setNewSubName(e.target.value)}
                placeholder="e.g. Solar Inverter Repair"
                className="w-full rounded-lg border border-[#E4E1D8] px-3 py-2 text-sm text-[#181A18]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#5A605A] mb-1">
                Typical Price Range (₹)
              </label>
              <input
                type="text"
                value={newSubPrice}
                onChange={(e) => setNewSubPrice(e.target.value)}
                className="w-full rounded-lg border border-[#E4E1D8] px-3 py-2 text-sm text-[#181A18]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#5A605A] mb-1">
                Description
              </label>
              <textarea
                rows={3}
                value={newSubDesc}
                onChange={(e) => setNewSubDesc(e.target.value)}
                placeholder="Brief summary of services covered..."
                className="w-full rounded-lg border border-[#E4E1D8] px-3 py-2 text-sm text-[#181A18]"
              />
            </div>
            <button
              type="submit"
              disabled={busyId === 'add-subcat'}
              className="w-full rounded-lg bg-[#134E3A] py-2.5 text-sm font-semibold text-white hover:bg-[#0D3B2B] disabled:opacity-60"
            >
              Add Subcategory
            </button>
          </form>

          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {data.categories.map((cat) => (
              <div
                key={cat.id}
                className="rounded-xl border border-[#E4E1D8] bg-white p-5 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-base font-bold text-[#181A18] flex items-center gap-2">
                    <Layers className="h-4 w-4 text-[#134E3A]" />
                    <span>{cat.name}</span>
                  </h3>
                  <span className="font-mono-nums text-xs text-[#5A605A]">
                    {cat.subcategories.length} subcategories
                  </span>
                </div>
                <p className="text-xs text-[#5A605A]">{cat.description}</p>
                <div className="pt-2 flex flex-wrap gap-x-2 gap-y-1 text-xs text-[#181A18]">
                  {cat.subcategories.map((s, idx) => (
                    <span key={s.id}>
                      {s.name}
                      {idx < cat.subcategories.length - 1 ? ' ·' : ''}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
