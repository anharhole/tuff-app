import React, { useState } from 'react';
import { Shield, UserCheck } from 'lucide-react';
import { KERALA_DISTRICTS } from '../../shared/keralaData.ts';
import { useApp } from '../context/AppContext.tsx';

function GoogleGlyph() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.3 0 6.08-1.09 8.1-2.96l-3.88-3.05c-1.08.72-2.45 1.16-4.22 1.16-3.24 0-5.99-2.19-6.97-5.13H1.03v3.14C3.04 21.14 7.21 24 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.03 14.02A7.18 7.18 0 0 1 4.65 12c0-.7.13-1.38.38-2.02V6.84H1.03A11.98 11.98 0 0 0 0 12c0 1.94.46 3.77 1.03 5.16l4-3.14Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.79 0 3.4.62 4.67 1.82l3.5-3.5C18.07 1.19 15.3 0 12 0 7.21 0 3.04 2.86 1.03 6.84l4 3.14c.98-2.94 3.73-5.23 6.97-5.23Z"
      />
    </svg>
  );
}

export const LoginPage: React.FC = () => {
  const { login, loginWithGoogle, loginDemo, navigate, showToast } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await login(email, password);
      if (u.role === 'admin') navigate({ page: 'admin' });
      else if (u.activeMode === 'provider') navigate({ page: 'provider-dashboard' });
      else navigate({ page: 'customer-dashboard' });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const u = await loginWithGoogle();
      if (u.role === 'admin') navigate({ page: 'admin' });
      else if (u.activeMode === 'provider') navigate({ page: 'provider-dashboard' });
      else navigate({ page: 'customer-dashboard' });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Google Sign-In failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async (demoType: 'customer' | 'provider' | 'admin') => {
    setLoading(true);
    try {
      const u = await loginDemo(demoType);
      if (u.role === 'admin') navigate({ page: 'admin' });
      else if (u.activeMode === 'provider') navigate({ page: 'provider-dashboard' });
      else navigate({ page: 'customer-dashboard' });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Demo login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10 grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
      <div className="md:col-span-7 rounded-xl border border-[#E4E1D8] bg-white p-6 sm:p-8 space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#181A18]">Sign In to LocalConnect</h1>
          <p className="text-sm text-[#5A605A] mt-1">
            Access your customer requests, provider quotations, or real-time messages.
          </p>
        </div>

        {/* Real Firebase Authentication via Google Sign-In */}
        <div className="space-y-2">
          <button
            type="button"
            disabled={loading}
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-2.5 rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] py-2.5 px-4 text-sm font-semibold text-[#181A18] hover:border-[#134E3A] hover:bg-white transition-colors disabled:opacity-60"
          >
            <GoogleGlyph />
            <span>Continue with Google (Firebase Auth)</span>
          </button>
          <p className="text-[11px] text-[#5A605A] text-center">
            Verified with Firebase Authentication & synced to Cloud Firestore
          </p>
        </div>

        <div className="relative flex items-center py-1">
          <div className="flex-grow border-t border-[#E4E1D8]" />
          <span className="mx-3 shrink text-[11px] font-medium uppercase tracking-wider text-[#5A605A]">
            or sign in with email
          </span>
          <div className="flex-grow border-t border-[#E4E1D8]" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#5A605A] mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] px-3.5 py-2.5 text-sm focus:border-[#134E3A] focus:bg-white focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#5A605A] mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] px-3.5 py-2.5 text-sm focus:border-[#134E3A] focus:bg-white focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#134E3A] py-2.5 text-sm font-semibold text-white hover:bg-[#0D3B2B] disabled:opacity-60"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="pt-4 border-t border-[#E4E1D8] text-sm text-[#5A605A]">
          New to LocalConnect?{' '}
          <button
            type="button"
            onClick={() => navigate({ page: 'register' })}
            className="font-semibold text-[#134E3A] hover:underline"
          >
            Create Customer or Provider Account
          </button>
        </div>
      </div>

      {/* Clearly Labelled Demo Accounts */}
      <aside className="md:col-span-5 rounded-xl border border-[#134E3A]/25 bg-[#E6F2EC]/50 p-6 space-y-4">
        <div className="flex items-center gap-2 text-[#134E3A]">
          <UserCheck className="h-5 w-5" />
          <h2 className="font-display text-lg font-bold">Instant Demo Accounts</h2>
        </div>
        <p className="text-xs text-[#5A605A] leading-relaxed">
          Clearly labelled demonstration accounts pre-populated with Kerala service requests,
          quotations, active bookings, and real-time chat.
        </p>

        <div className="space-y-2.5">
          <button
            type="button"
            disabled={loading}
            onClick={() => handleDemo('customer')}
            className="w-full text-left rounded-lg border border-[#E4E1D8] bg-white p-3.5 hover:border-[#134E3A] transition-colors"
          >
            <div className="text-sm font-bold text-[#181A18]">Demo Customer (Arjun Menon)</div>
            <div className="text-xs text-[#5A605A] mt-0.5">
              Tirur · Compare 2 live quotes, track bookings, chat & AI
            </div>
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => handleDemo('provider')}
            className="w-full text-left rounded-lg border border-[#E4E1D8] bg-white p-3.5 hover:border-[#134E3A] transition-colors"
          >
            <div className="text-sm font-bold text-[#181A18]">Demo Provider (Rajesh Nair)</div>
            <div className="text-xs text-[#5A605A] mt-0.5">
              Electrician · Submit quotes, manage jobs & analytics
            </div>
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => handleDemo('admin')}
            className="w-full text-left rounded-lg border border-[#E4E1D8] bg-white p-3.5 hover:border-[#134E3A] transition-colors"
          >
            <div className="text-sm font-bold text-[#134E3A] inline-flex items-center gap-1.5">
              <Shield className="h-4 w-4" />
              <span>Demo Admin (Meera Krishnan)</span>
            </div>
            <div className="text-xs text-[#5A605A] mt-0.5">
              Verify providers, moderate reviews & manage categories
            </div>
          </button>
        </div>
      </aside>
    </div>
  );
};

export const RegisterPage: React.FC = () => {
  const { register, loginWithGoogle, categories, locations, navigate, showToast } = useApp();
  const [role, setRole] = useState<'customer' | 'provider'>('customer');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [district, setDistrict] = useState('Malappuram');
  const [town, setTown] = useState('Tirur');
  const [locality, setLocality] = useState('Payyanangadi');
  const [pincode, setPincode] = useState('676101');
  const [ageVerified, setAgeVerified] = useState(false);

  // Provider-specific fields
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || 'home-services');
  const [subcategoryId, setSubcategoryId] = useState('electrician');
  const [startingPrice, setStartingPrice] = useState('350');
  const [experienceYears, setExperienceYears] = useState('3');
  const [submitting, setSubmitting] = useState(false);

  const selectedCat = categories.find((c) => c.id === categoryId) || categories[0];

  const handleGoogleRegister = async () => {
    if (!ageVerified) {
      showToast('Please confirm you meet the 18+ age requirement first', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const u = await loginWithGoogle({
        role,
        district,
        town,
        locality,
        pincode,
        phone: phone || undefined,
        ageVerified: true,
      });
      navigate({
        page: u.activeMode === 'provider' ? 'provider-profile-manage' : 'customer-dashboard',
      });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Google registration failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ageVerified) {
      showToast('Please confirm you meet the 18+ age requirement', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const u = await register({
        role,
        name,
        email,
        phone,
        password,
        ageVerified,
        district,
        town,
        locality,
        pincode,
        title,
        categoryId,
        subcategoryId,
        startingPrice: Number(startingPrice),
        experienceYears: Number(experienceYears),
      });
      navigate({
        page: u.activeMode === 'provider' ? 'provider-profile-manage' : 'customer-dashboard',
      });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Registration failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10">
      <div className="rounded-xl border border-[#E4E1D8] bg-white p-6 sm:p-8 space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#181A18]">
            Create Your LocalConnect Account
          </h1>
          <p className="text-sm text-[#5A605A] mt-1">
            Free registration · Zero commission for both Kerala households and professionals.
          </p>
        </div>

        {/* Account Type Tabs */}
        <div className="grid grid-cols-2 gap-2 bg-[#F1EFE9] p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setRole('customer')}
            className={`rounded-md py-2 text-sm font-semibold transition-colors ${
              role === 'customer' ? 'bg-white text-[#134E3A] shadow-sm' : 'text-[#5A605A]'
            }`}
          >
            Customer Account
          </button>
          <button
            type="button"
            onClick={() => setRole('provider')}
            className={`rounded-md py-2 text-sm font-semibold transition-colors ${
              role === 'provider' ? 'bg-white text-[#134E3A] shadow-sm' : 'text-[#5A605A]'
            }`}
          >
            Service Provider Account
          </button>
        </div>

        <button
          type="button"
          disabled={submitting}
          onClick={handleGoogleRegister}
          className="w-full flex items-center justify-center gap-2.5 rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] py-2.5 px-4 text-sm font-semibold text-[#181A18] hover:border-[#134E3A] hover:bg-white transition-colors disabled:opacity-60"
        >
          <GoogleGlyph />
          <span>
            Continue with Google as {role === 'provider' ? 'Service Provider' : 'Customer'} (Firebase Auth)
          </span>
        </button>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#5A605A] mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Karthik Varma"
                className="w-full rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#5A605A] mb-1">
                Phone Number
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#5A605A] mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#5A605A] mb-1">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] px-3 py-2 text-sm"
              />
            </div>
          </div>

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
              <label className="block text-xs font-semibold text-[#5A605A] mb-1">Locality</label>
              <input
                type="text"
                required
                value={locality}
                onChange={(e) => setLocality(e.target.value)}
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
                className="w-full rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] px-3 py-2 text-sm font-mono-nums"
              />
            </div>
          </div>

          {role === 'provider' && (
            <div className="border-t border-[#E4E1D8] pt-4 space-y-4">
              <h2 className="text-sm font-bold text-[#134E3A]">Professional Listing Details</h2>
              <div>
                <label className="block text-xs font-semibold text-[#5A605A] mb-1">
                  Professional Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Licensed Electrician & Inverter Technician"
                  className="w-full rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#5A605A] mb-1">
                    Primary Category
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => {
                      setCategoryId(e.target.value);
                      const c = categories.find((x) => x.id === e.target.value);
                      if (c?.subcategories[0]) setSubcategoryId(c.subcategories[0].id);
                    }}
                    className="w-full rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] px-3 py-2 text-sm"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5A605A] mb-1">
                    Primary Subcategory
                  </label>
                  <select
                    value={subcategoryId}
                    onChange={(e) => setSubcategoryId(e.target.value)}
                    className="w-full rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] px-3 py-2 text-sm"
                  >
                    {selectedCat?.subcategories.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5A605A] mb-1">
                    Starting Visit Charge (₹)
                  </label>
                  <input
                    type="number"
                    min={100}
                    required
                    value={startingPrice}
                    onChange={(e) => setStartingPrice(e.target.value)}
                    className="w-full rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] px-3 py-2 text-sm font-mono-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5A605A] mb-1">
                    Years of Experience
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    required
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(e.target.value)}
                    className="w-full rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] px-3 py-2 text-sm font-mono-nums"
                  />
                </div>
              </div>
            </div>
          )}

          <label className="flex items-start gap-2.5 pt-2 cursor-pointer text-xs text-[#5A605A]">
            <input
              type="checkbox"
              checked={ageVerified}
              onChange={(e) => setAgeVerified(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[#134E3A]"
            />
            <span>
              I confirm that I am at least <strong>18 years of age</strong>, meet applicable local
              legal requirements to offer or book services in India, and agree to LocalConnect’s
              community trust guidelines.
            </span>
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-[#134E3A] py-3 text-sm font-semibold text-white hover:bg-[#0D3B2B] disabled:opacity-60"
          >
            {submitting
              ? 'Creating Account...'
              : `Register as ${role === 'provider' ? 'Service Provider' : 'Customer'}`}
          </button>
        </form>
      </div>
    </div>
  );
};
