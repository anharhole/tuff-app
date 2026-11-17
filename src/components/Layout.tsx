import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Accessibility,
  AlertTriangle,
  Award,
  Bell,
  Briefcase,
  Camera,
  Download,
  Globe,
  Heart,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Mic,
  Navigation,
  PlusCircle,
  Search,
  Shield,
  Sparkles,
  User as UserIcon,
  Users,
  WifiOff,
  X,
} from 'lucide-react';
import { t } from '../../shared/i18n.ts';
import type { LanguageCode } from '../../shared/types.ts';
import { useApp, type PageId } from '../context/AppContext.tsx';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall.ts';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;
  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg bg-amber-700 px-3 py-2 text-xs font-medium text-white shadow-md">
      <WifiOff className="h-3.5 w-3.5" />
      <span>Offline Mode — Cached marketplace data is active.</span>
    </div>
  );
};

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => install()}
        className={`flex items-center justify-center gap-2 rounded-lg border border-[#134E3A]/30 bg-[#E6F2EC] text-[#134E3A] font-medium transition-colors hover:bg-[#d5eadf] whitespace-nowrap shrink-0 ${
          compact ? 'px-3 py-1.5 text-xs' : 'w-full px-4 py-2.5 text-sm'
        }`}
      >
        <Download className="h-4 w-4" />
        <span>Install LocalConnect App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#E4E1D8] bg-white px-4 py-2 text-xs font-medium text-[#181A18] hover:bg-[#F1EFE9]"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Install on iPhone / iPad</span>
        </button>
        {showIOSGuide && (
          <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl border border-[#E4E1D8]">
              <h3 className="font-display text-lg font-semibold text-[#181A18]">
                Install LocalConnect on iOS
              </h3>
              <p className="mt-2 text-sm text-[#5A605A] leading-relaxed">
                1. Tap the <strong>Share</strong> icon in Safari.<br />
                2. Scroll down and select <strong>Add to Home Screen</strong>.
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-lg bg-[#134E3A] py-2.5 text-sm font-medium text-white hover:bg-[#0D3B2B]"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    user,
    language,
    setLanguage,
    lowInternetMode,
    setLowInternetMode,
    unreadCount,
    route,
    navigate,
    logout,
    switchRole,
    setAiDrawerOpen,
    locations,
    selectedLocation,
    setSelectedLocation,
  } = useApp();

  const [menuOpen, setMenuOpen] = useState(false);
  const strings = t(language);

  const navButton = (label: string, active: boolean, onClick: () => void, isEmergency = false) => (
    <button
      type="button"
      onClick={onClick}
      className={`relative whitespace-nowrap shrink-0 text-sm transition-colors py-2 ${
        isEmergency
          ? 'font-semibold text-[#B91C1C]'
          : active
            ? 'font-semibold text-[#134E3A]'
            : 'font-medium text-[#5A605A] hover:text-[#181A18]'
      }`}
    >
      <span>{label}</span>
      {active && (
        <motion.span
          layoutId="desktop-nav-indicator"
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          className={`absolute left-0 right-0 -bottom-[1px] h-[2.5px] rounded-full ${
            isEmergency ? 'bg-[#B91C1C]' : 'bg-[#134E3A]'
          }`}
        />
      )}
    </button>
  );

  const go = (page: PageId) => {
    setMenuOpen(false);
    navigate({ page });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F7F4] text-[#181A18]">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-40 border-b border-[#E4E1D8] bg-[#F8F7F4]/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 md:h-16 max-w-7xl items-center justify-between gap-4 md:gap-8 px-4 sm:px-6">
          {/* Zone 1: Single-line Brand Wordmark */}
          <button
            type="button"
            onClick={() => go('home')}
            className="group flex items-center gap-2 text-left whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#134E3A]"
          >
            <motion.svg
              width="24"
              height="24"
              viewBox="0 0 64 64"
              fill="none"
              aria-hidden="true"
              whileHover={{ rotate: 12, scale: 1.06 }}
              transition={{ type: 'spring', stiffness: 360, damping: 20 }}
            >
              <path
                d="M32 6C19.85 6 10 15.85 10 28c0 16.5 19.3 28.9 20.9 29.9a2.1 2.1 0 0 0 2.2 0C34.7 56.9 54 44.5 54 28 54 15.85 44.15 6 32 6z"
                fill="#134E3A"
              />
              <circle cx="32" cy="27" r="9.5" fill="#F8F7F4" />
              <circle cx="32" cy="27" r="4.5" fill="#C99B2C" />
            </motion.svg>
            <span className="font-display text-xl font-bold tracking-tight text-[#134E3A]">
              LocalConnect
            </span>
          </button>

          {/* Zone 2: 5 concise single-line text links with sliding brass/emerald indicator */}
          <nav className="hidden md:flex items-center gap-6">
            {navButton(strings.navExplore, route.page === 'search', () => go('search'))}
            {navButton(
              strings.navCategories,
              route.page === 'categories' ||
                route.page === 'category' ||
                route.page === 'subcategory',
              () => go('categories')
            )}
            {navButton(
              strings.navRequests,
              route.page === 'request-service' ||
                route.page === 'quotations' ||
                route.page === 'provider-dashboard',
              () => go(user?.activeMode === 'provider' ? 'provider-dashboard' : 'request-service')
            )}
            {navButton(strings.navEmergency, route.page === 'emergency', () => go('emergency'), true)}
            {navButton(strings.navHelp, route.page === 'help', () => go('help'))}
          </nav>

          {/* Zone 3: Single Primary Action */}
          <div className="flex items-center gap-2 shrink-0">
            {user ? (
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                className="relative flex items-center gap-2 rounded-lg bg-[#134E3A] px-3.5 py-2 text-xs sm:text-sm font-medium text-white hover:bg-[#0D3B2B] transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
              >
                <UserIcon className="h-4 w-4" />
                <span className="max-w-[110px] truncate">{user.name.split(' ')[0]}</span>
                {unreadCount > 0 && (
                  <span className="ml-0.5 font-mono-nums text-[11px] bg-[#C99B2C] text-white px-1.5 py-0.2 rounded">
                    {unreadCount}
                  </span>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                className="flex items-center gap-2 rounded-lg bg-[#134E3A] px-4 py-2 text-xs sm:text-sm font-medium text-white hover:bg-[#0D3B2B] transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
              >
                <Menu className="h-4 w-4 md:hidden" />
                <span>{strings.navSignIn}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Account, Settings & Utility Slide-Over Drawer */}
      <AnimatePresence>
      {menuOpen && (
        <motion.div
          key="account-drawer-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[80] flex justify-end bg-black/40 backdrop-blur-[2px]"
        >
          <div
            className="fixed inset-0"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
          <motion.aside
            key="account-drawer-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 360, damping: 34 }}
            className="relative z-10 w-full max-w-sm bg-white h-full overflow-y-auto border-l border-[#E4E1D8] p-6 flex flex-col justify-between shadow-2xl"
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-[#E4E1D8] pb-4">
                <div>
                  <h2 className="font-display text-lg font-bold text-[#181A18]">
                    {user ? user.name : 'LocalConnect Account'}
                  </h2>
                  <p className="text-xs text-[#5A605A]">
                    {user
                      ? `${user.activeMode === 'provider' ? 'Service Provider Mode' : 'Customer Mode'} · ${user.town}`
                      : 'Sign in or configure regional settings'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  aria-label="Close menu"
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#E4E1D8] text-[#5A605A] hover:text-[#181A18]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Auth Actions */}
              {!user ? (
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => go('login')}
                    className="rounded-lg bg-[#134E3A] py-2.5 text-sm font-medium text-white hover:bg-[#0D3B2B]"
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => go('register')}
                    className="rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] py-2.5 text-sm font-medium text-[#181A18] hover:bg-[#F1EFE9]"
                  >
                    Register
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {user.activeMode === 'customer' ? (
                    <button
                      type="button"
                      onClick={() => go('customer-dashboard')}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[#181A18] hover:bg-[#F1EFE9]"
                    >
                      <LayoutDashboard className="h-4 w-4 text-[#134E3A]" />
                      <span>Customer Dashboard</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => go('provider-dashboard')}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[#181A18] hover:bg-[#F1EFE9]"
                    >
                      <Briefcase className="h-4 w-4 text-[#134E3A]" />
                      <span>Provider Dashboard</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => go('booking-history')}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[#181A18] hover:bg-[#F1EFE9]"
                  >
                    <Home className="h-4 w-4 text-[#5A605A]" />
                    <span>My Bookings & History</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => go('quotations')}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[#181A18] hover:bg-[#F1EFE9]"
                  >
                    <PlusCircle className="h-4 w-4 text-[#5A605A]" />
                    <span>Requests & Quotations</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => go('chat')}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[#181A18] hover:bg-[#F1EFE9]"
                  >
                    <MessageSquare className="h-4 w-4 text-[#5A605A]" />
                    <span>Messages</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => go('notifications')}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-[#181A18] hover:bg-[#F1EFE9]"
                  >
                    <span className="flex items-center gap-3">
                      <Bell className="h-4 w-4 text-[#5A605A]" />
                      <span>Notifications</span>
                    </span>
                    {unreadCount > 0 && (
                      <span className="font-mono-nums text-xs font-semibold text-[#134E3A]">
                        {unreadCount} new
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => go('favourites')}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[#181A18] hover:bg-[#F1EFE9]"
                  >
                    <Heart className="h-4 w-4 text-[#5A605A]" />
                    <span>Saved Favourites</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => go('customer-profile')}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[#181A18] hover:bg-[#F1EFE9]"
                  >
                    <UserIcon className="h-4 w-4 text-[#5A605A]" />
                    <span>Account Profile & Privacy</span>
                  </button>

                  {user.activeMode === 'provider' && (
                    <button
                      type="button"
                      onClick={() => go('provider-profile-manage')}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[#181A18] hover:bg-[#F1EFE9]"
                    >
                      <Briefcase className="h-4 w-4 text-[#134E3A]" />
                      <span>Manage Provider Profile</span>
                    </button>
                  )}

                  {user.role === 'admin' && (
                    <button
                      type="button"
                      onClick={() => go('admin')}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-[#134E3A] bg-[#E6F2EC] hover:bg-[#d5eadf]"
                    >
                      <Shield className="h-4 w-4" />
                      <span>Admin Console</span>
                    </button>
                  )}

                  {user.canSwitchToProvider && (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        switchRole();
                      }}
                      className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-[#134E3A]/30 bg-[#F8F7F4] px-3 py-2 text-xs font-semibold text-[#134E3A] hover:bg-[#E6F2EC]"
                    >
                      Switch to {user.activeMode === 'provider' ? 'Customer' : 'Provider'} View
                    </button>
                  )}
                </div>
              )}

              {/* Regional & Accessibility Preferences */}
              <div className="space-y-4 border-t border-[#E4E1D8] pt-5">
                <div>
                  <label className="block text-xs font-semibold text-[#5A605A] mb-1.5">
                    Kerala Town / Location
                  </label>
                  <select
                    value={selectedLocation.id}
                    onChange={(e) => {
                      const found = locations.find((l) => l.id === e.target.value);
                      if (found) setSelectedLocation(found);
                    }}
                    className="w-full rounded-lg border border-[#E4E1D8] bg-white px-3 py-2 text-sm text-[#181A18]"
                  >
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.town}, {loc.district} ({loc.pincode})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#5A605A] mb-1.5">
                    Language / ഭാഷ / भाषा
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 bg-[#F1EFE9] p-1 rounded-lg">
                    {(
                      [
                        { code: 'en', label: 'English' },
                        { code: 'ml', label: 'മലയാളം' },
                        { code: 'hi', label: 'हिन्दी' },
                      ] as Array<{ code: LanguageCode; label: string }>
                    ).map((item) => (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() => setLanguage(item.code)}
                        className={`rounded-md py-1.5 text-xs font-medium transition-colors ${
                          language === item.code
                            ? 'bg-white text-[#134E3A] shadow-sm'
                            : 'text-[#5A605A] hover:text-[#181A18]'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="flex items-center justify-between gap-3 rounded-lg border border-[#E4E1D8] p-3 cursor-pointer">
                  <div>
                    <div className="text-sm font-medium text-[#181A18]">
                      {strings.lowInternetMode}
                    </div>
                    <div className="text-xs text-[#5A605A]">
                      Hides heavy photos for faster loading on 2G/3G networks
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={lowInternetMode}
                    onChange={(e) => setLowInternetMode(e.target.checked)}
                    className="h-4 w-4 accent-[#134E3A]"
                  />
                </label>

                <PWAInstallButton />
              </div>

              {/* V2 AI & Community Tools */}
              <div className="space-y-1 border-t border-[#E4E1D8] pt-4">
                <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[#5A605A]">
                  AI & Community Tools
                </div>
                <button
                  type="button"
                  onClick={() => go('smart-mode')}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[#134E3A] bg-[#E6F2EC]/60 hover:bg-[#E6F2EC]"
                >
                  <Sparkles className="h-4 w-4 text-[#B68A1E]" />
                  <span>LocalConnect Smart Mode</span>
                </button>
                <button
                  type="button"
                  onClick={() => go('ai-photo')}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-[#181A18] hover:bg-[#F1EFE9]"
                >
                  <Camera className="h-4 w-4 text-[#134E3A]" />
                  <span>AI Photo Problem Detector</span>
                </button>
                <button
                  type="button"
                  onClick={() => go('ai-voice')}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-[#181A18] hover:bg-[#F1EFE9]"
                >
                  <Mic className="h-4 w-4 text-[#134E3A]" />
                  <span>Voice AI Assistant</span>
                </button>
                <button
                  type="button"
                  onClick={() => go('talent-hub')}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-[#181A18] hover:bg-[#F1EFE9]"
                >
                  <Users className="h-4 w-4 text-[#134E3A]" />
                  <span>Local Talent Hub</span>
                </button>
                <button
                  type="button"
                  onClick={() => go('achievements')}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-[#181A18] hover:bg-[#F1EFE9]"
                >
                  <Award className="h-4 w-4 text-[#B68A1E]" />
                  <span>Provider Achievements</span>
                </button>
                {user && (
                  <button
                    type="button"
                    onClick={() => go('live-tracking')}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-[#181A18] hover:bg-[#F1EFE9]"
                  >
                    <Navigation className="h-4 w-4 text-[#134E3A]" />
                    <span>Live Provider Tracking</span>
                  </button>
                )}
              </div>

              {/* Quick Pages */}
              <div className="space-y-1 border-t border-[#E4E1D8] pt-4">
                <button
                  type="button"
                  onClick={() => go('accessibility')}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-[#181A18] hover:bg-[#F1EFE9]"
                >
                  <Accessibility className="h-4 w-4 text-[#5A605A]" />
                  <span>Accessibility Mode</span>
                </button>
                <button
                  type="button"
                  onClick={() => go('language-settings')}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-[#181A18] hover:bg-[#F1EFE9]"
                >
                  <Globe className="h-4 w-4 text-[#5A605A]" />
                  <span>Language & Translation Settings</span>
                </button>
                <button
                  type="button"
                  onClick={() => go('emergency')}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-[#B91C1C] hover:bg-red-50"
                >
                  <AlertTriangle className="h-4 w-4" />
                  <span>Emergency Assistance</span>
                </button>
                <button
                  type="button"
                  onClick={() => go('reviews')}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-[#5A605A] hover:bg-[#F1EFE9]"
                >
                  <span>Customer Reviews</span>
                </button>
                <button
                  type="button"
                  onClick={() => go('help')}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-[#5A605A] hover:bg-[#F1EFE9]"
                >
                  <span>Help Centre & Setup Guide</span>
                </button>
              </div>
            </div>

            {user && (
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  logout();
                }}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border border-[#E4E1D8] py-2.5 text-sm font-medium text-[#5A605A] hover:bg-[#F1EFE9] hover:text-[#181A18]"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            )}
          </motion.aside>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 pb-20 md:pb-12">{children}</main>

      {/* Footer */}
      <footer className="border-t border-[#E4E1D8] bg-white py-12 px-4 sm:px-6 mb-14 md:mb-0">
        <div className="mx-auto max-w-7xl grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="font-display text-lg font-bold text-[#134E3A]">LocalConnect</div>
            <p className="text-sm text-[#5A605A] leading-relaxed">
              {strings.tagline} Connecting Kerala households directly with verified local professionals.
            </p>
            <p className="text-xs font-medium text-[#134E3A]">{strings.zeroCommission}</p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-[#181A18] mb-3">Marketplace</h4>
            <ul className="space-y-2 text-sm text-[#5A605A]">
              <li>
                <button type="button" onClick={() => go('categories')} className="hover:text-[#134E3A]">
                  All 8 Categories
                </button>
              </li>
              <li>
                <button type="button" onClick={() => go('search')} className="hover:text-[#134E3A]">
                  Search Professionals
                </button>
              </li>
              <li>
                <button type="button" onClick={() => go('request-service')} className="hover:text-[#134E3A]">
                  Request Quotations
                </button>
              </li>
              <li>
                <button type="button" onClick={() => go('emergency')} className="hover:text-[#B91C1C]">
                  Emergency Assistance
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-[#181A18] mb-3">Kerala Towns</h4>
            <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-sm text-[#5A605A]">
              {['Tirur', 'Malappuram', 'Kottakkal', 'Manjeri', 'Perinthalmanna', 'Ponnani', 'Kozhikode', 'Thrissur', 'Kochi', 'Kannur'].map(
                (town) => (
                  <button
                    key={town}
                    type="button"
                    onClick={() => navigate({ page: 'search', q: town })}
                    className="hover:text-[#134E3A] underline-offset-2 hover:underline"
                  >
                    {town}
                  </button>
                )
              )}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-[#181A18] mb-3">Support & Platform</h4>
            <ul className="space-y-2 text-sm text-[#5A605A]">
              <li>
                <button type="button" onClick={() => go('smart-mode')} className="hover:text-[#134E3A]">
                  LocalConnect Smart Mode
                </button>
              </li>
              <li>
                <button type="button" onClick={() => go('ai-photo')} className="hover:text-[#134E3A]">
                  AI Photo Problem Detector
                </button>
              </li>
              <li>
                <button type="button" onClick={() => go('talent-hub')} className="hover:text-[#134E3A]">
                  Local Talent Hub
                </button>
              </li>
              <li>
                <button type="button" onClick={() => go('accessibility')} className="hover:text-[#134E3A]">
                  Accessibility & Language
                </button>
              </li>
              <li>
                <button type="button" onClick={() => go('help')} className="hover:text-[#134E3A]">
                  Help Centre & FAQs
                </button>
              </li>
              <li>
                <button type="button" onClick={() => go('login')} className="hover:text-[#134E3A]">
                  Demo Accounts & Login
                </button>
              </li>
            </ul>
          </div>
        </div>
        <div className="mx-auto max-w-7xl mt-8 pt-6 border-t border-[#E4E1D8] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-[#5A605A]">
          <span>© 2026 LocalConnect Kerala · Independent local marketplace</span>
          <span>Currency: INR (₹) · English · മലയാളം · हिन्दी</span>
        </div>
      </footer>

      {/* Mobile Bottom Thumb-Zone Navigation (<= 15% viewport height) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-[#E4E1D8] bg-white/95 backdrop-blur-md grid grid-cols-5 h-14"
      >
        {(
          [
            { id: 'home', label: 'Home', icon: Home, onClick: () => go('home'), active: route.page === 'home' },
            { id: 'search', label: 'Search', icon: Search, onClick: () => go('search'), active: route.page === 'search' },
            { id: 'request', label: 'Request', icon: PlusCircle, onClick: () => go('request-service'), active: route.page === 'request-service' },
            { id: 'chat', label: 'Chat', icon: MessageSquare, onClick: () => go('chat'), active: route.page === 'chat' },
            { id: 'menu', label: 'Menu', icon: UserIcon, onClick: () => setMenuOpen(true), active: menuOpen },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={tab.onClick}
              className={`relative flex flex-col items-center justify-center text-[10px] font-medium transition-colors ${
                tab.active ? 'text-[#134E3A] font-semibold' : 'text-[#5A605A]'
              }`}
            >
              {tab.active && (
                <motion.span
                  layoutId="mobile-nav-indicator"
                  transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                  className="absolute top-0 h-[2.5px] w-7 rounded-b-full bg-[#C99B2C]"
                />
              )}
              <Icon className="h-4 w-4 mb-0.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Floating LocalConnect AI Trigger with Magnetic Tactile Physics */}
      <motion.button
        type="button"
        onClick={() => setAiDrawerOpen(true)}
        aria-label="Open LocalConnect AI Assistant"
        whileHover={{ y: -2, scale: 1.03 }}
        whileTap={{ scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 380, damping: 24 }}
        className="fixed bottom-16 md:bottom-6 right-4 md:right-6 z-40 flex items-center gap-2 rounded-xl bg-[#134E3A] px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-[#0D3B2B] border border-[#C99B2C]/35"
      >
        <Sparkles className="h-4 w-4 text-[#C99B2C]" />
        <span className="whitespace-nowrap">LocalConnect AI</span>
      </motion.button>

      <OfflineIndicator />
    </div>
  );
};
