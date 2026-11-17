import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { signInWithPopup, signOut } from 'firebase/auth';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { KERALA_LOCATIONS, SERVICE_CATEGORIES } from '../../shared/keralaData.ts';
import type {
  AccessibilityPreferences,
  KeralaLocation,
  LanguageCode,
  NotificationItem,
  Provider,
  PublicUser,
  ServiceCategory,
} from '../../shared/types.ts';
import {
  OperationType,
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  syncAccessibilityToFirestore,
  syncFavouritesToFirestore,
  syncFirebaseUserProfileToFirestore,
} from '../firebase.ts';
import { apiFetch, setStoredToken } from '../lib/api.ts';

export type PageId =
  | 'home'
  | 'login'
  | 'register'
  | 'customer-dashboard'
  | 'provider-dashboard'
  | 'categories'
  | 'category'
  | 'subcategory'
  | 'search'
  | 'provider-profile'
  | 'request-service'
  | 'quotations'
  | 'booking-details'
  | 'booking-history'
  | 'chat'
  | 'notifications'
  | 'ai-assistant'
  | 'ai-voice'
  | 'ai-photo'
  | 'smart-mode'
  | 'live-tracking'
  | 'talent-hub'
  | 'achievements'
  | 'accessibility'
  | 'language-settings'
  | 'emergency'
  | 'favourites'
  | 'customer-profile'
  | 'provider-profile-manage'
  | 'reviews'
  | 'help'
  | 'admin';

export interface RouteState {
  page: PageId;
  id?: string;
  q?: string;
  categoryId?: string;
  subcategoryId?: string;
  providerId?: string;
  requestId?: string;
  draftTitle?: string;
  draftDescription?: string;
  draftTown?: string;
  draftDate?: string;
  draftTime?: string;
}

const DEFAULT_ACCESSIBILITY: AccessibilityPreferences = {
  fontScale: 'normal',
  highContrast: false,
  reducedMotion: false,
  largeTargets: false,
  screenReaderHints: true,
  preferredVoiceLang: 'en',
  chatAutoTranslateTo: 'off',
};

interface ToastMessage {
  id: number;
  text: string;
  tone: 'success' | 'error' | 'info';
}

export interface GoogleAuthOptions {
  role?: 'customer' | 'provider';
  district?: string;
  town?: string;
  locality?: string;
  pincode?: string;
  phone?: string;
  ageVerified?: boolean;
}

interface AppContextValue {
  user: PublicUser | null;
  providerProfile: Provider | null;
  authLoading: boolean;
  firebaseSynced: boolean;
  categories: ServiceCategory[];
  locations: KeralaLocation[];
  selectedLocation: KeralaLocation;
  setSelectedLocation: (loc: KeralaLocation) => void;
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  lowInternetMode: boolean;
  setLowInternetMode: (val: boolean) => void;
  accessibility: AccessibilityPreferences;
  updateAccessibility: (patch: Partial<AccessibilityPreferences>) => Promise<void>;
  favouriteIds: string[];
  toggleFavourite: (providerId: string) => Promise<void>;
  notifications: NotificationItem[];
  unreadCount: number;
  refreshNotifications: () => Promise<void>;
  markNotificationRead: (id?: string) => Promise<void>;
  route: RouteState;
  navigate: (next: RouteState) => void;
  login: (email: string, password: string) => Promise<PublicUser>;
  loginWithGoogle: (opts?: GoogleAuthOptions) => Promise<PublicUser>;
  register: (payload: Record<string, unknown>) => Promise<PublicUser>;
  loginDemo: (demoType: 'customer' | 'provider' | 'admin') => Promise<PublicUser>;
  logout: () => void;
  switchRole: (targetMode?: 'customer' | 'provider') => Promise<void>;
  refreshAuth: () => Promise<void>;
  aiDrawerOpen: boolean;
  setAiDrawerOpen: (open: boolean) => void;
  showToast: (text: string, tone?: 'success' | 'error' | 'info') => void;
  realtimeTick: number;
}

const AppContext = createContext<AppContextValue | null>(null);

function parseRouteFromUrl(): RouteState {
  try {
    const params = new URLSearchParams(window.location.search);
    const page = (params.get('page') as PageId) || 'home';
    return {
      page,
      id: params.get('id') || undefined,
      q: params.get('q') || undefined,
      categoryId: params.get('categoryId') || undefined,
      subcategoryId: params.get('subcategoryId') || undefined,
      providerId: params.get('providerId') || undefined,
      requestId: params.get('requestId') || undefined,
    };
  } catch {
    return { page: 'home' };
  }
}

function applyAccessibilityToDom(prefs: AccessibilityPreferences) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('lc-high-contrast', prefs.highContrast);
  root.classList.toggle('lc-reduced-motion', prefs.reducedMotion);
  root.classList.toggle('lc-large-targets', prefs.largeTargets);
  root.style.fontSize =
    prefs.fontScale === 'xlarge' ? '20px' : prefs.fontScale === 'large' ? '18px' : '16px';
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [providerProfile, setProviderProfile] = useState<Provider | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [firebaseSynced, setFirebaseSynced] = useState(false);
  const [categories, setCategories] = useState<ServiceCategory[]>(SERVICE_CATEGORIES);
  const [locations, setLocations] = useState<KeralaLocation[]>(KERALA_LOCATIONS);
  const [selectedLocation, setSelectedLocation] = useState<KeralaLocation>(KERALA_LOCATIONS[0]);
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    try {
      const saved = localStorage.getItem('lc_lang');
      if (saved === 'ml' || saved === 'hi' || saved === 'en') return saved;
    } catch {
      // ignore
    }
    return 'en';
  });
  const [lowInternetMode, setLowInternetModeState] = useState<boolean>(() => {
    try {
      return localStorage.getItem('lc_low_internet') === '1';
    } catch {
      return false;
    }
  });
  const [accessibility, setAccessibility] = useState<AccessibilityPreferences>(() => {
    try {
      const raw = localStorage.getItem('lc_accessibility');
      if (raw) {
        return { ...DEFAULT_ACCESSIBILITY, ...JSON.parse(raw) };
      }
    } catch {
      // ignore
    }
    return DEFAULT_ACCESSIBILITY;
  });
  const [favouriteIds, setFavouriteIds] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [route, setRoute] = useState<RouteState>(parseRouteFromUrl);
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [realtimeTick, setRealtimeTick] = useState(0);

  useEffect(() => {
    applyAccessibilityToDom(accessibility);
  }, [accessibility]);

  const showToast = useCallback((text: string, tone: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev, { id, text, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  const setLanguage = useCallback(
    (lang: LanguageCode) => {
      setLanguageState(lang);
      try {
        localStorage.setItem('lc_lang', lang);
      } catch {
        // ignore
      }
      if (user) {
        apiFetch('/api/auth/profile', {
          method: 'PATCH',
          body: JSON.stringify({ language: lang }),
        }).catch(() => {});
      }
    },
    [user]
  );

  const setLowInternetMode = useCallback((val: boolean) => {
    setLowInternetModeState(val);
    try {
      localStorage.setItem('lc_low_internet', val ? '1' : '0');
    } catch {
      // ignore
    }
  }, []);

  const updateAccessibility = useCallback(
    async (patch: Partial<AccessibilityPreferences>) => {
      const next = { ...accessibility, ...patch };
      setAccessibility(next);
      applyAccessibilityToDom(next);
      try {
        localStorage.setItem('lc_accessibility', JSON.stringify(next));
      } catch {
        // ignore
      }
      if (user) {
        await apiFetch('/api/accessibility', {
          method: 'PUT',
          body: JSON.stringify(next),
        }).catch(() => {});
        if (auth.currentUser?.emailVerified && auth.currentUser.uid === user.id) {
          void syncAccessibilityToFirestore(next).catch(() => {});
        }
      }
    },
    [accessibility, user]
  );

  const navigate = useCallback((next: RouteState) => {
    setRoute(next);
    try {
      const params = new URLSearchParams();
      if (next.page && next.page !== 'home') params.set('page', next.page);
      if (next.id) params.set('id', next.id);
      if (next.q) params.set('q', next.q);
      if (next.categoryId) params.set('categoryId', next.categoryId);
      if (next.subcategoryId) params.set('subcategoryId', next.subcategoryId);
      if (next.providerId) params.set('providerId', next.providerId);
      if (next.requestId) params.set('requestId', next.requestId);
      const qs = params.toString();
      const targetUrl = qs ? `/?${qs}` : '/';
      window.history.pushState(next, '', targetUrl);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const onPop = () => setRoute(parseRouteFromUrl());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const refreshNotifications = useCallback(async () => {
    try {
      const res = await apiFetch<{ notifications: NotificationItem[] }>('/api/notifications');
      setNotifications(res.notifications);
    } catch {
      setNotifications([]);
    }
  }, []);

  const refreshFavourites = useCallback(async () => {
    try {
      const res = await apiFetch<{ favouriteIds: string[] }>('/api/favourites');
      setFavouriteIds(res.favouriteIds);
    } catch {
      setFavouriteIds([]);
    }
  }, []);

  const refreshAuth = useCallback(async () => {
    try {
      const res = await apiFetch<{ user: PublicUser | null; providerProfile?: Provider | null }>(
        '/api/auth/me'
      );
      setUser(res.user);
      setProviderProfile(res.providerProfile || null);
      if (res.user) {
        const userLoc = KERALA_LOCATIONS.find(
          (l) => l.town.toLowerCase() === res.user!.town.toLowerCase()
        );
        if (userLoc) setSelectedLocation(userLoc);
        await Promise.all([
          refreshNotifications(),
          refreshFavourites(),
          apiFetch<{ preferences: AccessibilityPreferences }>('/api/accessibility')
            .then((acc) => {
              if (acc.preferences) {
                setAccessibility(acc.preferences);
                applyAccessibilityToDom(acc.preferences);
              }
            })
            .catch(() => {}),
        ]);
      } else {
        setNotifications([]);
        setFavouriteIds([]);
      }
    } catch {
      setUser(null);
      setProviderProfile(null);
    } finally {
      setAuthLoading(false);
    }
  }, [refreshFavourites, refreshNotifications]);

  useEffect(() => {
    apiFetch<{ categories: ServiceCategory[] }>('/api/categories')
      .then((d) => setCategories(d.categories))
      .catch(() => {});
    apiFetch<{ locations: KeralaLocation[] }>('/api/locations')
      .then((d) => setLocations(d.locations))
      .catch(() => {});
    refreshAuth();
  }, [refreshAuth]);

  // Real-time SSE listener
  useEffect(() => {
    const es = new EventSource('/api/events/stream');
    const bump = () => {
      setRealtimeTick((n) => n + 1);
      if (user) {
        refreshNotifications();
      }
    };
    es.addEventListener('quotation_created', bump);
    es.addEventListener('booking_updated', bump);
    es.addEventListener('chat_message', bump);
    es.addEventListener('request_created', bump);
    es.addEventListener('request_updated', bump);
    es.addEventListener('emergency_created', bump);
    return () => es.close();
  }, [user, refreshNotifications]);

  // Real-time Firestore listeners when authenticated via Firebase Auth
  useEffect(() => {
    const fbUser = auth.currentUser;
    if (!fbUser || !fbUser.emailVerified || !user || user.id !== fbUser.uid) {
      setFirebaseSynced(false);
      return;
    }

    setFirebaseSynced(true);
    const uid = fbUser.uid.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);

    const unsubUser = onSnapshot(
      doc(db, 'users', uid),
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        setUser((prev) =>
          prev
            ? {
                ...prev,
                name: typeof data.name === 'string' ? data.name : prev.name,
                language:
                  data.language === 'ml' || data.language === 'hi' || data.language === 'en'
                    ? data.language
                    : prev.language,
              }
            : prev
        );
      },
      (err) => handleFirestoreError(err, OperationType.GET, `users/${uid}`)
    );

    const unsubFavs = onSnapshot(
      doc(db, 'favourites', uid),
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        if (Array.isArray(data.providerIds)) {
          setFavouriteIds(data.providerIds.filter((x): x is string => typeof x === 'string'));
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, `favourites/${uid}`)
    );

    const notifQuery = query(collection(db, 'notifications'), where('userId', '==', uid));
    const unsubNotifs = onSnapshot(
      notifQuery,
      (snap) => {
        if (snap.empty) return;
        const list: NotificationItem[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            userId: String(data.userId || uid),
            title: String(data.title || ''),
            body: String(data.body || ''),
            type:
              data.type === 'quotation' ||
              data.type === 'booking' ||
              data.type === 'message' ||
              data.type === 'request' ||
              data.type === 'emergency' ||
              data.type === 'verification'
                ? data.type
                : 'system',
            linkPage: typeof data.linkPage === 'string' && data.linkPage ? data.linkPage : 'notifications',
            linkId: typeof data.linkId === 'string' ? data.linkId : undefined,
            read: Boolean(data.read),
            createdAt: typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString(),
          };
        });
        setNotifications((prev) => {
          const merged = new Map<string, NotificationItem>();
          for (const item of prev) merged.set(item.id, item);
          for (const item of list) merged.set(item.id, item);
          return Array.from(merged.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'notifications')
    );

    return () => {
      unsubUser();
      unsubFavs();
      unsubNotifs();
    };
  }, [user?.id]);

  const login = async (email: string, password: string) => {
    const res = await apiFetch<{ token: string; user: PublicUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setStoredToken(res.token);
    await refreshAuth();
    showToast(`Welcome back, ${res.user.name}`, 'success');
    return res.user;
  };

  const loginWithGoogle = async (opts?: GoogleAuthOptions) => {
    const cred = await signInWithPopup(auth, googleProvider);
    const idToken = await cred.user.getIdToken();
    const res = await apiFetch<{ token: string; user: PublicUser }>('/api/auth/firebase', {
      method: 'POST',
      body: JSON.stringify({ idToken, ...opts }),
    });
    setStoredToken(res.token);
    await refreshAuth();
    await syncFirebaseUserProfileToFirestore(res.user);
    await syncAccessibilityToFirestore(accessibility);
    setFirebaseSynced(true);
    showToast(`Signed in via Google (${res.user.name})`, 'success');
    return res.user;
  };

  const register = async (payload: Record<string, unknown>) => {
    const res = await apiFetch<{ token: string; user: PublicUser }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setStoredToken(res.token);
    await refreshAuth();
    showToast('Account created successfully', 'success');
    return res.user;
  };

  const loginDemo = async (demoType: 'customer' | 'provider' | 'admin') => {
    const res = await apiFetch<{ token: string; user: PublicUser }>('/api/auth/demo', {
      method: 'POST',
      body: JSON.stringify({ demoType }),
    });
    setStoredToken(res.token);
    await refreshAuth();
    showToast(`Signed in as ${res.user.name}`, 'success');
    return res.user;
  };

  const logout = () => {
    setStoredToken(null);
    setUser(null);
    setProviderProfile(null);
    setNotifications([]);
    setFavouriteIds([]);
    setFirebaseSynced(false);
    void signOut(auth).catch(() => {});
    showToast('Signed out', 'info');
    navigate({ page: 'home' });
  };

  const switchRole = async (targetMode?: 'customer' | 'provider') => {
    const res = await apiFetch<{ user: PublicUser; providerProfile?: Provider | null }>(
      '/api/auth/switch-role',
      {
        method: 'POST',
        body: JSON.stringify({ targetMode }),
      }
    );
    setUser(res.user);
    setProviderProfile(res.providerProfile || null);
    if (auth.currentUser?.emailVerified && auth.currentUser.uid === res.user.id) {
      void syncFirebaseUserProfileToFirestore(res.user).catch(() => {});
    }
    showToast(
      `Switched to ${res.user.activeMode === 'provider' ? 'Service Provider' : 'Customer'} mode`,
      'success'
    );
    navigate({
      page: res.user.activeMode === 'provider' ? 'provider-dashboard' : 'customer-dashboard',
    });
  };

  const toggleFavourite = async (providerId: string) => {
    if (!user) {
      showToast('Please sign in to save favourite providers', 'info');
      navigate({ page: 'login' });
      return;
    }
    const res = await apiFetch<{ favouriteIds: string[]; saved: boolean }>('/api/favourites/toggle', {
      method: 'POST',
      body: JSON.stringify({ providerId }),
    });
    setFavouriteIds(res.favouriteIds);
    if (auth.currentUser?.emailVerified && auth.currentUser.uid === user.id) {
      void syncFavouritesToFirestore(res.favouriteIds).catch(() => {});
    }
    showToast(res.saved ? 'Saved to favourites' : 'Removed from favourites', 'success');
  };

  const markNotificationRead = async (id?: string) => {
    await apiFetch('/api/notifications/read', {
      method: 'POST',
      body: JSON.stringify({ id }),
    });
    await refreshNotifications();
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <AppContext.Provider
      value={{
        user,
        providerProfile,
        authLoading,
        firebaseSynced,
        categories,
        locations,
        selectedLocation,
        setSelectedLocation,
        language,
        setLanguage,
        lowInternetMode,
        setLowInternetMode,
        accessibility,
        updateAccessibility,
        favouriteIds,
        toggleFavourite,
        notifications,
        unreadCount,
        refreshNotifications,
        markNotificationRead,
        route,
        navigate,
        login,
        loginWithGoogle,
        register,
        loginDemo,
        logout,
        switchRole,
        refreshAuth,
        aiDrawerOpen,
        setAiDrawerOpen,
        showToast,
        realtimeTick,
      }}
    >
      {children}

      {/* Accessible toast notifications */}
      <div className="fixed top-16 right-4 z-[90] flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto rounded-lg border px-4 py-3 text-sm font-medium shadow-md transition-all ${
              toast.tone === 'error'
                ? 'bg-red-50 border-red-200 text-red-900'
                : toast.tone === 'success'
                  ? 'bg-[#E6F2EC] border-[#134E3A]/20 text-[#134E3A]'
                  : 'bg-white border-[#E4E1D8] text-[#181A18]'
            }`}
          >
            {toast.text}
          </div>
        ))}
      </div>
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
