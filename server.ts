import 'dotenv/config';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import express, { type NextFunction, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import { createServer as createViteServer } from 'vite';
import firebaseAppletConfig from './firebase-applet-config.json' with { type: 'json' };
import { EMERGENCY_SERVICE_TYPES, KERALA_LOCATIONS } from './shared/keralaData.ts';
import type {
  AccessibilityPreferences,
  BookingStatus,
  LanguageCode,
  Provider,
  PublicUser,
  ServiceReminder,
  ServiceRequest,
  TalentProfile,
  User,
  UserAddress,
} from './shared/types.ts';
import {
  computeProviderAchievements,
  emitRealtimeEvent,
  getSeasonalRecommendations,
  getSmartRecommendations,
  getStore,
  haversineKm,
  saveStore,
  searchProvidersInDb,
  subscribeSse,
  toPublicUser,
} from './server/db.ts';
import {
  handleAiChat,
  handlePhotoAnalysis,
  handleSmartMode,
  translateChatMessage,
} from './server/ai.ts';

const PORT = Number(process.env.PORT) || 3000;
const TOKEN_SECRET = process.env.SESSION_SECRET || 'localconnect-kerala-session-key-2026';

function signToken(userId: string): string {
  const payload = Buffer.from(JSON.stringify({ uid: userId, iat: Date.now() })).toString('base64url');
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyToken(token: string | undefined): string | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expected = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('base64url');
  if (sig !== expected) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8')) as { uid?: string };
    return parsed.uid || null;
  } catch {
    return null;
  }
}

function extractToken(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const match = cookieHeader
      .split(';')
      .map((s) => s.trim())
      .find((s) => s.startsWith('lc_token='));
    if (match) return decodeURIComponent(match.slice('lc_token='.length));
  }
  return undefined;
}

interface AuthedRequest extends Request {
  currentUser?: User | null;
}

function attachUser(req: AuthedRequest, _res: Response, next: NextFunction) {
  const uid = verifyToken(extractToken(req));
  if (uid) {
    const db = getStore();
    const found = db.users.find((u) => u.id === uid) || null;
    req.currentUser = found && !found.isSuspended ? found : null;
  } else {
    req.currentUser = null;
  }
  next();
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.currentUser) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }
  next();
}

function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.currentUser || req.currentUser.role !== 'admin') {
    res.status(403).json({ error: 'Administrator access required.' });
    return;
  }
  next();
}

function makeId(prefix: string): string {
  return `${prefix}-${crypto.randomBytes(5).toString('hex')}`;
}

let cachedFirebaseCerts: { keys: Record<string, string>; expiresAt: number } | null = null;

async function getFirebasePublicKeys(): Promise<Record<string, string>> {
  if (cachedFirebaseCerts && Date.now() < cachedFirebaseCerts.expiresAt) {
    return cachedFirebaseCerts.keys;
  }
  const resp = await fetch(
    'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
  );
  if (!resp.ok) {
    throw new Error('Failed to fetch Firebase public signing certificates.');
  }
  const keys = (await resp.json()) as Record<string, string>;
  const cc = resp.headers.get('cache-control') || '';
  const maxAgeMatch = cc.match(/max-age=(\d+)/);
  const ttlMs = maxAgeMatch ? Number(maxAgeMatch[1]) * 1000 : 3600_000;
  cachedFirebaseCerts = { keys, expiresAt: Date.now() + ttlMs };
  return keys;
}

async function verifyFirebaseIdToken(idToken: string): Promise<{
  uid: string;
  email: string;
  emailVerified: boolean;
  name?: string;
}> {
  const parts = idToken.split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed Firebase ID token.');
  }
  const [headerB64, payloadB64, sigB64] = parts;
  const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf-8')) as {
    alg?: string;
    kid?: string;
  };
  const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8')) as {
    aud?: string;
    iss?: string;
    sub?: string;
    exp?: number;
    email?: string;
    email_verified?: boolean;
    name?: string;
  };

  if (header.alg !== 'RS256' || !header.kid) {
    throw new Error('Unsupported Firebase token algorithm or missing key ID.');
  }
  const projectId = firebaseAppletConfig.projectId;
  if (payload.aud !== projectId) {
    throw new Error('Firebase token audience mismatch.');
  }
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) {
    throw new Error('Firebase token issuer mismatch.');
  }
  if (!payload.sub || typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now()) {
    throw new Error('Firebase token expired or missing subject.');
  }

  const keys = await getFirebasePublicKeys();
  const certPem = keys[header.kid];
  if (!certPem) {
    throw new Error('Matching Firebase signing certificate not found.');
  }
  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(`${headerB64}.${payloadB64}`);
  verifier.end();
  const isValidSig = verifier.verify(certPem, Buffer.from(sigB64, 'base64url'));
  if (!isValidSig) {
    throw new Error('Invalid Firebase ID token signature.');
  }

  return {
    uid: payload.sub,
    email: (payload.email || '').toLowerCase(),
    emailVerified: Boolean(payload.email_verified),
    name: payload.name,
  };
}

async function startServer() {
  getStore(); // Initialize store & seed on startup
  const app = express();
  app.use(express.json({ limit: '6mb' }));
  app.use(attachUser);

  // Health
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'LocalConnect API' });
  });

  // Real-time SSE stream
  app.get('/api/events/stream', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.write(`event: connected\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`);
    const unsub = subscribeSse((event, payload) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
    });
    const ping = setInterval(() => {
      res.write(`event: ping\ndata: ${Date.now()}\n\n`);
    }, 25000);
    req.on('close', () => {
      clearInterval(ping);
      unsub();
    });
  });

  // --- AUTH ---
  app.post('/api/auth/register', (req, res) => {
    const {
      name,
      email,
      password,
      phone,
      role,
      ageVerified,
      district,
      town,
      locality,
      pincode,
      title,
      categoryId,
      subcategoryId,
      startingPrice,
      experienceYears,
    } = req.body as Record<string, unknown>;

    if (!name || !email || !password || !phone) {
      res.status(400).json({ error: 'Name, email, phone, and password are required.' });
      return;
    }
    if (ageVerified !== true) {
      res.status(400).json({ error: 'You must confirm you are at least 18 years old to register.' });
      return;
    }
    const db = getStore();
    const cleanEmail = String(email).trim().toLowerCase();
    if (db.users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }

    const loc =
      KERALA_LOCATIONS.find((l) => l.town.toLowerCase() === String(town || 'Tirur').toLowerCase()) ||
      KERALA_LOCATIONS[0];

    const accountRole = role === 'provider' ? 'provider' : 'customer';
    const userId = makeId('user');
    const newUser: User = {
      id: userId,
      name: String(name).trim().slice(0, 80),
      email: cleanEmail,
      passwordHash: bcrypt.hashSync(String(password), 8),
      phone: String(phone).trim().slice(0, 24),
      role: accountRole,
      activeMode: accountRole,
      canSwitchToProvider: true,
      ageVerified: true,
      isDemo: false,
      district: String(district || loc.district),
      town: String(town || loc.town),
      locality: String(locality || loc.localities[0]),
      pincode: String(pincode || loc.pincode),
      lat: loc.lat,
      lng: loc.lng,
      language: 'en',
      allowRecommendations: true,
      searchHistory: [],
      createdAt: new Date().toISOString(),
    };

    db.users.push(newUser);

    if (accountRole === 'provider') {
      const catId = String(categoryId || 'home-services');
      const subId = String(subcategoryId || 'electrician');
      const price = Math.max(100, Number(startingPrice) || 350);
      const newProv: Provider = {
        id: makeId('prov'),
        userId,
        name: newUser.name,
        title: String(title || 'Local Service Specialist').slice(0, 100),
        phone: newUser.phone,
        whatsapp: newUser.phone.replace(/[^0-9]/g, ''),
        avatarUrl: '',
        bio: `Serving ${newUser.town} and surrounding areas in ${newUser.district}.`,
        categoryIds: [catId],
        subcategoryIds: [subId],
        services: [
          {
            id: makeId('srv'),
            categoryId: catId,
            subcategoryId: subId,
            name: String(title || 'Standard Service Visit'),
            startingPrice: price,
            priceUnit: 'visit',
            description: 'Initial inspection and service quotation.',
          },
        ],
        startingPrice: price,
        district: newUser.district,
        town: newUser.town,
        locality: newUser.locality,
        pincode: newUser.pincode,
        lat: loc.lat,
        lng: loc.lng,
        serviceRadiusKm: 20,
        experienceYears: Math.max(0, Number(experienceYears) || 2),
        workingHours: '8:30 AM – 7:00 PM',
        isAvailable: true,
        availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        urgentAvailable: false,
        rating: 5.0,
        reviewCount: 0,
        completedJobs: 0,
        profileViews: 0,
        identityVerified: false,
        skillVerified: false,
        profileVerified: false,
        isFeatured: false,
        isDemo: false,
        portfolioImages: [],
        createdAt: new Date().toISOString(),
      };
      db.providers.push(newProv);
    }

    saveStore();
    const token = signToken(newUser.id);
    res.json({ token, user: toPublicUser(newUser) });
  });

  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }
    const db = getStore();
    const user = db.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }
    if (user.isSuspended) {
      res.status(403).json({ error: 'This account is suspended. Please contact support.' });
      return;
    }
    const token = signToken(user.id);
    res.json({ token, user: toPublicUser(user) });
  });

  app.post('/api/auth/demo', (req, res) => {
    const { demoType } = req.body as { demoType?: 'customer' | 'provider' | 'admin' };
    const db = getStore();
    const idMap = {
      customer: 'user-demo-customer',
      provider: 'user-demo-provider',
      admin: 'user-demo-admin',
    };
    const targetId = idMap[demoType || 'customer'];
    const user = db.users.find((u) => u.id === targetId);
    if (!user) {
      res.status(404).json({ error: 'Demo account not found.' });
      return;
    }
    const token = signToken(user.id);
    res.json({ token, user: toPublicUser(user) });
  });

  app.post('/api/auth/firebase', async (req, res) => {
    try {
      const { idToken, role, district, town, locality, pincode, phone, ageVerified } = req.body as {
        idToken?: string;
        role?: 'customer' | 'provider';
        district?: string;
        town?: string;
        locality?: string;
        pincode?: string;
        phone?: string;
        ageVerified?: boolean;
      };
      if (!idToken) {
        res.status(400).json({ error: 'Firebase ID token is required.' });
        return;
      }

      const verified = await verifyFirebaseIdToken(idToken);
      if (!verified.emailVerified || !verified.email) {
        res.status(403).json({ error: 'A verified Google email address is required.' });
        return;
      }

      const db = getStore();
      const isBootstrapAdmin = verified.email === 'drakefc45678@gmail.com';
      let user =
        db.users.find((u) => u.id === verified.uid) ||
        db.users.find((u) => u.email.toLowerCase() === verified.email);

      if (!user) {
        const loc =
          KERALA_LOCATIONS.find((l) => l.town.toLowerCase() === String(town || 'Tirur').toLowerCase()) ||
          KERALA_LOCATIONS[0];
        const chosenRole = isBootstrapAdmin
          ? 'admin'
          : role === 'provider'
            ? 'provider'
            : 'customer';
        user = {
          id: verified.uid,
          name: (verified.name || verified.email.split('@')[0] || 'Kerala Member').slice(0, 80),
          email: verified.email,
          passwordHash: '',
          phone: String(phone || '+91 98470 00000').slice(0, 24),
          role: chosenRole,
          activeMode: chosenRole === 'provider' ? 'provider' : 'customer',
          canSwitchToProvider: true,
          ageVerified: ageVerified !== false,
          isDemo: false,
          district: String(district || loc.district),
          town: String(town || loc.town),
          locality: String(locality || loc.localities[0]),
          pincode: String(pincode || loc.pincode),
          lat: loc.lat,
          lng: loc.lng,
          language: 'en',
          allowRecommendations: true,
          searchHistory: [],
          createdAt: new Date().toISOString(),
        };
        db.users.push(user);

        if (chosenRole === 'provider') {
          db.providers.push({
            id: makeId('prov'),
            userId: user.id,
            name: user.name,
            title: 'Local Service Specialist',
            phone: user.phone,
            whatsapp: user.phone.replace(/[^0-9]/g, ''),
            avatarUrl: '',
            bio: `Serving ${user.town} and nearby areas in ${user.district}.`,
            categoryIds: ['home-services'],
            subcategoryIds: ['electrician'],
            services: [
              {
                id: makeId('srv'),
                categoryId: 'home-services',
                subcategoryId: 'electrician',
                name: 'Standard Visit & Estimate',
                startingPrice: 300,
                priceUnit: 'visit',
                description: 'Doorstep diagnosis and transparent quotation.',
              },
            ],
            startingPrice: 300,
            district: user.district,
            town: user.town,
            locality: user.locality,
            pincode: user.pincode,
            lat: loc.lat,
            lng: loc.lng,
            serviceRadiusKm: 18,
            experienceYears: 2,
            workingHours: '9:00 AM – 6:30 PM',
            isAvailable: true,
            availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
            urgentAvailable: false,
            rating: 5.0,
            reviewCount: 0,
            completedJobs: 0,
            profileViews: 0,
            identityVerified: false,
            skillVerified: false,
            profileVerified: false,
            isFeatured: false,
            isDemo: false,
            portfolioImages: [],
            createdAt: new Date().toISOString(),
          });
        }
        saveStore();
      } else {
        if (user.isSuspended) {
          res.status(403).json({ error: 'This account is suspended. Please contact support.' });
          return;
        }
        if (isBootstrapAdmin && user.role !== 'admin') {
          user.role = 'admin';
          saveStore();
        }
      }

      const token = signToken(user.id);
      const providerProfile = db.providers.find((p) => p.userId === user!.id) || null;
      res.json({ token, user: toPublicUser(user), providerProfile });
    } catch (err) {
      console.error('Firebase auth verification error:', err);
      res.status(401).json({
        error: err instanceof Error ? err.message : 'Firebase authentication verification failed.',
      });
    }
  });

  app.get('/api/auth/me', (req: AuthedRequest, res) => {
    if (!req.currentUser) {
      res.json({ user: null });
      return;
    }
    const db = getStore();
    const providerProfile = db.providers.find((p) => p.userId === req.currentUser!.id) || null;
    res.json({ user: toPublicUser(req.currentUser), providerProfile });
  });

  app.patch('/api/auth/profile', requireAuth, (req: AuthedRequest, res) => {
    const db = getStore();
    const user = db.users.find((u) => u.id === req.currentUser!.id);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    const body = req.body as Partial<PublicUser>;
    if (typeof body.name === 'string' && body.name.trim()) user.name = body.name.trim().slice(0, 80);
    if (typeof body.phone === 'string' && body.phone.trim()) user.phone = body.phone.trim().slice(0, 24);
    if (typeof body.district === 'string') user.district = body.district;
    if (typeof body.town === 'string') {
      user.town = body.town;
      const loc = KERALA_LOCATIONS.find((l) => l.town.toLowerCase() === body.town!.toLowerCase());
      if (loc) {
        user.lat = loc.lat;
        user.lng = loc.lng;
        if (!body.pincode) user.pincode = loc.pincode;
      }
    }
    if (typeof body.locality === 'string') user.locality = body.locality;
    if (typeof body.pincode === 'string') user.pincode = body.pincode;
    if (body.language === 'en' || body.language === 'ml' || body.language === 'hi') {
      user.language = body.language;
    }
    if (typeof body.allowRecommendations === 'boolean') {
      user.allowRecommendations = body.allowRecommendations;
    }
    saveStore();
    res.json({ user: toPublicUser(user) });
  });

  app.post('/api/auth/switch-role', requireAuth, (req: AuthedRequest, res) => {
    const db = getStore();
    const user = db.users.find((u) => u.id === req.currentUser!.id);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    const { targetMode } = req.body as { targetMode?: 'customer' | 'provider' };
    const nextMode = targetMode || (user.activeMode === 'customer' ? 'provider' : 'customer');
    if (nextMode === 'provider' && !user.canSwitchToProvider && user.role !== 'admin') {
      res.status(403).json({ error: 'Provider mode is not enabled for this account.' });
      return;
    }
    user.activeMode = nextMode;

    let providerProfile = db.providers.find((p) => p.userId === user.id) || null;
    if (nextMode === 'provider' && !providerProfile) {
      providerProfile = {
        id: makeId('prov'),
        userId: user.id,
        name: user.name.replace(' (Demo Customer)', ''),
        title: 'Local Service Professional',
        phone: user.phone,
        whatsapp: user.phone.replace(/[^0-9]/g, ''),
        avatarUrl: '',
        bio: `Local service professional based in ${user.town}, ${user.district}.`,
        categoryIds: ['home-services'],
        subcategoryIds: ['electrician'],
        services: [
          {
            id: makeId('srv'),
            categoryId: 'home-services',
            subcategoryId: 'electrician',
            name: 'General Inspection & Service',
            startingPrice: 300,
            priceUnit: 'visit',
            description: 'Doorstep diagnosis and transparent estimate.',
          },
        ],
        startingPrice: 300,
        district: user.district,
        town: user.town,
        locality: user.locality,
        pincode: user.pincode,
        lat: user.lat,
        lng: user.lng,
        serviceRadiusKm: 15,
        experienceYears: 3,
        workingHours: '9:00 AM – 6:30 PM',
        isAvailable: true,
        availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        urgentAvailable: false,
        rating: 5.0,
        reviewCount: 0,
        completedJobs: 0,
        profileViews: 0,
        identityVerified: false,
        skillVerified: false,
        profileVerified: false,
        isFeatured: false,
        isDemo: user.isDemo,
        portfolioImages: [],
        createdAt: new Date().toISOString(),
      };
      db.providers.push(providerProfile);
    }

    saveStore();
    res.json({ user: toPublicUser(user), providerProfile });
  });

  // --- SEARCH HISTORY CLEAR & SEASONAL RECOMMENDATIONS ---
  app.delete('/api/auth/search-history', requireAuth, (req: AuthedRequest, res) => {
    const db = getStore();
    const user = db.users.find((u) => u.id === req.currentUser!.id);
    if (user) {
      user.searchHistory = [];
      saveStore();
      res.json({ user: toPublicUser(user) });
      return;
    }
    res.status(404).json({ error: 'User not found.' });
  });

  app.get('/api/seasonal', (_req, res) => {
    res.json(getSeasonalRecommendations());
  });

  // --- CATEGORIES & LOCATIONS ---
  app.get('/api/categories', (_req, res) => {
    const db = getStore();
    res.json({ categories: db.categories });
  });

  app.get('/api/locations', (_req, res) => {
    res.json({ locations: KERALA_LOCATIONS });
  });

  // --- PROVIDERS & SEARCH ---
  app.get('/api/providers', (req: AuthedRequest, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    const categoryId = typeof req.query.categoryId === 'string' ? req.query.categoryId : undefined;
    const subcategoryId =
      typeof req.query.subcategoryId === 'string' ? req.query.subcategoryId : undefined;
    const district = typeof req.query.district === 'string' ? req.query.district : undefined;
    const town = typeof req.query.town === 'string' ? req.query.town : undefined;
    const pincode = typeof req.query.pincode === 'string' ? req.query.pincode : undefined;
    const maxDistanceKm = req.query.maxDistanceKm ? Number(req.query.maxDistanceKm) : undefined;
    const minRating = req.query.minRating ? Number(req.query.minRating) : undefined;
    const minPrice = req.query.minPrice ? Number(req.query.minPrice) : undefined;
    const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : undefined;
    const availableOnly = req.query.availableOnly === 'true';
    const minExperience = req.query.minExperience ? Number(req.query.minExperience) : undefined;
    const verifiedOnly = req.query.verifiedOnly === 'true';
    const sortBy = (typeof req.query.sortBy === 'string' ? req.query.sortBy : 'relevant') as
      | 'relevant'
      | 'nearest'
      | 'highest_rated'
      | 'lowest_price'
      | 'recently_added';
    const userLat = req.query.userLat ? Number(req.query.userLat) : undefined;
    const userLng = req.query.userLng ? Number(req.query.userLng) : undefined;
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 12;

    if (q && q.trim().length >= 2 && req.currentUser && req.currentUser.allowRecommendations) {
      const db = getStore();
      const u = db.users.find((x) => x.id === req.currentUser!.id);
      if (u) {
        u.searchHistory = [q.trim(), ...u.searchHistory.filter((s) => s !== q.trim())].slice(0, 8);
        saveStore();
      }
    }

    const result = searchProvidersInDb({
      q,
      categoryId,
      subcategoryId,
      district,
      town,
      pincode,
      maxDistanceKm,
      minRating,
      minPrice,
      maxPrice,
      availableOnly,
      minExperience,
      verifiedOnly,
      sortBy,
      userLat,
      userLng,
      page,
      limit,
    });
    res.json(result);
  });

  app.get('/api/providers/recommendations', (req: AuthedRequest, res) => {
    const town = typeof req.query.town === 'string' ? req.query.town : undefined;
    const district = typeof req.query.district === 'string' ? req.query.district : undefined;
    const recommendations = getSmartRecommendations(req.currentUser?.id, town, district);
    res.json({ recommendations });
  });

  app.get('/api/providers/:id', (req, res) => {
    const db = getStore();
    const provider = db.providers.find((p) => p.id === req.params.id);
    if (!provider) {
      res.status(404).json({ error: 'Provider not found.' });
      return;
    }
    provider.profileViews = (provider.profileViews || 0) + 1;
    saveStore();

    const reviews = db.reviews.filter(
      (r) => r.providerId === provider.id && r.moderatedStatus === 'published'
    );
    const similar = db.providers
      .filter(
        (p) =>
          p.id !== provider.id && p.categoryIds.some((cid) => provider.categoryIds.includes(cid))
      )
      .slice(0, 4);

    const achievements = computeProviderAchievements(provider.id);

    res.json({ provider, reviews, similar, achievements });
  });

  app.get('/api/providers/:id/achievements', (req, res) => {
    const db = getStore();
    const provider = db.providers.find((p) => p.id === req.params.id);
    if (!provider) {
      res.status(404).json({ error: 'Provider not found.' });
      return;
    }
    const achievements = computeProviderAchievements(provider.id);
    res.json({
      providerId: provider.id,
      providerName: provider.name,
      achievements,
      earnedCount: achievements.filter((a) => a.earned).length,
      totalCount: achievements.length,
    });
  });

  app.put('/api/providers/:id', requireAuth, (req: AuthedRequest, res) => {
    const db = getStore();
    const provider = db.providers.find((p) => p.id === req.params.id);
    if (!provider) {
      res.status(404).json({ error: 'Provider profile not found.' });
      return;
    }
    if (provider.userId !== req.currentUser!.id && req.currentUser!.role !== 'admin') {
      res.status(403).json({ error: 'You can only edit your own provider profile.' });
      return;
    }

    const body = req.body as Partial<Provider>;
    if (typeof body.name === 'string' && body.name.trim()) provider.name = body.name.trim().slice(0, 80);
    if (typeof body.title === 'string' && body.title.trim()) provider.title = body.title.trim().slice(0, 120);
    if (typeof body.bio === 'string') provider.bio = body.bio.slice(0, 1000);
    if (typeof body.phone === 'string') provider.phone = body.phone.slice(0, 24);
    if (typeof body.whatsapp === 'string') provider.whatsapp = body.whatsapp.replace(/[^0-9]/g, '');
    if (typeof body.workingHours === 'string') provider.workingHours = body.workingHours.slice(0, 60);
    if (typeof body.isAvailable === 'boolean') provider.isAvailable = body.isAvailable;
    if (typeof body.urgentAvailable === 'boolean') provider.urgentAvailable = body.urgentAvailable;
    if (typeof body.serviceRadiusKm === 'number') {
      provider.serviceRadiusKm = Math.max(2, Math.min(150, body.serviceRadiusKm));
    }
    if (typeof body.experienceYears === 'number') {
      provider.experienceYears = Math.max(0, Math.min(60, body.experienceYears));
    }
    if (typeof body.district === 'string') provider.district = body.district;
    if (typeof body.town === 'string') {
      provider.town = body.town;
      const loc = KERALA_LOCATIONS.find((l) => l.town.toLowerCase() === body.town!.toLowerCase());
      if (loc) {
        provider.lat = loc.lat;
        provider.lng = loc.lng;
      }
    }
    if (typeof body.locality === 'string') provider.locality = body.locality;
    if (typeof body.pincode === 'string') provider.pincode = body.pincode;
    if (Array.isArray(body.categoryIds) && body.categoryIds.length > 0) {
      provider.categoryIds = body.categoryIds;
    }
    if (Array.isArray(body.subcategoryIds) && body.subcategoryIds.length > 0) {
      provider.subcategoryIds = body.subcategoryIds;
    }
    if (Array.isArray(body.availableDays)) {
      provider.availableDays = body.availableDays.slice(0, 7);
    }
    if (Array.isArray(body.services)) {
      provider.services = body.services.slice(0, 20);
      if (provider.services.length > 0) {
        provider.startingPrice = Math.min(...provider.services.map((s) => Number(s.startingPrice) || 200));
      }
    }
    if (Array.isArray(body.portfolioImages)) {
      provider.portfolioImages = body.portfolioImages.slice(0, 6);
    }

    saveStore();
    res.json({ provider });
  });

  // --- SERVICE REQUESTS ---
  app.get('/api/requests', (req: AuthedRequest, res) => {
    const db = getStore();
    const scope = req.query.scope;

    // Public anonymized feed for home page "Local Service Requests"
    if (scope === 'public') {
      const publicReqs = db.serviceRequests.slice(0, 6).map((r) => ({
        id: r.id,
        title: r.title,
        categoryId: r.categoryId,
        subcategoryId: r.subcategoryId,
        town: r.town,
        district: r.district,
        preferredDate: r.preferredDate,
        status: r.status,
        quotationsCount: db.quotations.filter((q) => q.requestId === r.id).length,
        createdAt: r.createdAt,
      }));
      res.json({ requests: publicReqs });
      return;
    }

    if (!req.currentUser) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    if (req.currentUser.activeMode === 'provider') {
      const prov = db.providers.find((p) => p.userId === req.currentUser!.id);
      if (!prov) {
        res.json({ requests: [] });
        return;
      }
      const matching = db.serviceRequests.filter(
        (r) =>
          r.targetProviderId === prov.id ||
          r.notifiedProviderIds.includes(prov.id) ||
          prov.categoryIds.includes(r.categoryId)
      );
      const enriched = matching.map((r) => ({
        ...r,
        quotations: db.quotations.filter((q) => q.requestId === r.id),
      }));
      res.json({ requests: enriched });
      return;
    }

    const myRequests = db.serviceRequests
      .filter((r) => r.customerId === req.currentUser!.id)
      .map((r) => ({
        ...r,
        quotations: db.quotations.filter((q) => q.requestId === r.id),
      }));
    res.json({ requests: myRequests });
  });

  app.post('/api/requests', requireAuth, (req: AuthedRequest, res) => {
    const db = getStore();
    const {
      categoryId,
      subcategoryId,
      targetProviderId,
      title,
      description,
      photos,
      preferredDate,
      preferredTime,
      district,
      town,
      locality,
      pincode,
      lat,
      lng,
    } = req.body as Record<string, unknown>;

    if (!categoryId || !subcategoryId || !description || !preferredDate) {
      res.status(400).json({ error: 'Service category, description, and preferred date are required.' });
      return;
    }

    const loc =
      KERALA_LOCATIONS.find((l) => l.town.toLowerCase() === String(town || 'Tirur').toLowerCase()) ||
      KERALA_LOCATIONS[0];

    const rLat = typeof lat === 'number' ? lat : loc.lat;
    const rLng = typeof lng === 'number' ? lng : loc.lng;

    let notifiedProviderIds: string[] = [];
    if (typeof targetProviderId === 'string' && targetProviderId) {
      notifiedProviderIds = [targetProviderId];
    } else {
      notifiedProviderIds = db.providers
        .filter(
          (p) =>
            p.isAvailable &&
            (p.subcategoryIds.includes(String(subcategoryId)) ||
              p.categoryIds.includes(String(categoryId))) &&
            haversineKm(rLat, rLng, p.lat, p.lng) <= p.serviceRadiusKm + 25
        )
        .map((p) => p.id);
      if (notifiedProviderIds.length === 0) {
        notifiedProviderIds = db.providers
          .filter((p) => p.categoryIds.includes(String(categoryId)))
          .slice(0, 5)
          .map((p) => p.id);
      }
    }

    const safePhotos = Array.isArray(photos)
      ? photos.filter((x): x is string => typeof x === 'string' && x.length < 1_500_000).slice(0, 4)
      : [];

    const nowIso = new Date().toISOString();
    const newReq: ServiceRequest = {
      id: makeId('req'),
      customerId: req.currentUser!.id,
      customerName: req.currentUser!.name,
      categoryId: String(categoryId),
      subcategoryId: String(subcategoryId),
      targetProviderId: typeof targetProviderId === 'string' && targetProviderId ? targetProviderId : undefined,
      title: String(title || `${String(subcategoryId).replace(/-/g, ' ')} request`).slice(0, 120),
      description: String(description).slice(0, 1500),
      photos: safePhotos,
      preferredDate: String(preferredDate),
      preferredTime: String(preferredTime || '10:00 AM'),
      district: String(district || loc.district),
      town: String(town || loc.town),
      locality: String(locality || loc.localities[0]),
      pincode: String(pincode || loc.pincode),
      lat: rLat,
      lng: rLng,
      status: notifiedProviderIds.length > 0 ? 'providers_notified' : 'request_submitted',
      notifiedProviderIds,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    db.serviceRequests.unshift(newReq);

    for (const pid of notifiedProviderIds) {
      const prov = db.providers.find((p) => p.id === pid);
      if (prov) {
        db.notifications.unshift({
          id: makeId('notif'),
          userId: prov.userId,
          type: 'request',
          title: `New Service Request in ${newReq.town}`,
          body: `${newReq.title} · Preferred ${newReq.preferredDate} at ${newReq.preferredTime}`,
          linkPage: 'provider-dashboard',
          linkId: newReq.id,
          read: false,
          createdAt: nowIso,
        });
      }
    }

    saveStore();
    emitRealtimeEvent('request_created', { requestId: newReq.id, notifiedProviderIds });
    res.json({ request: newReq });
  });

  app.patch('/api/requests/:id/cancel', requireAuth, (req: AuthedRequest, res) => {
    const db = getStore();
    const request = db.serviceRequests.find((r) => r.id === req.params.id);
    if (!request) {
      res.status(404).json({ error: 'Service request not found.' });
      return;
    }
    if (request.customerId !== req.currentUser!.id && req.currentUser!.role !== 'admin') {
      res.status(403).json({ error: 'Not authorized to cancel this request.' });
      return;
    }
    request.status = 'cancelled';
    request.updatedAt = new Date().toISOString();
    saveStore();
    emitRealtimeEvent('request_updated', { requestId: request.id });
    res.json({ request });
  });

  app.post('/api/requests/:id/decline', requireAuth, (req: AuthedRequest, res) => {
    const db = getStore();
    const request = db.serviceRequests.find((r) => r.id === req.params.id);
    if (!request) {
      res.status(404).json({ error: 'Service request not found.' });
      return;
    }
    const prov = db.providers.find((p) => p.userId === req.currentUser!.id);
    if (!prov && req.currentUser!.role !== 'admin') {
      res.status(403).json({ error: 'Only service providers can decline service requests.' });
      return;
    }
    if (prov) {
      const declined = new Set(request.declinedByProviderIds || []);
      declined.add(prov.id);
      request.declinedByProviderIds = Array.from(declined);
      request.updatedAt = new Date().toISOString();
      if (request.targetProviderId === prov.id) {
        db.notifications.unshift({
          id: makeId('notif'),
          userId: request.customerId,
          type: 'request',
          title: `${prov.name} is unavailable for this slot`,
          body: `Your request "${request.title}" can be routed to other local specialists.`,
          linkPage: 'quotations',
          linkId: request.id,
          read: false,
          createdAt: request.updatedAt,
        });
      }
      saveStore();
      emitRealtimeEvent('request_updated', { requestId: request.id });
    }
    res.json({ request });
  });

  // --- QUOTATIONS ---
  app.get('/api/quotations', requireAuth, (req: AuthedRequest, res) => {
    const db = getStore();
    const requestId = typeof req.query.requestId === 'string' ? req.query.requestId : undefined;
    if (requestId) {
      const parentReq = db.serviceRequests.find((r) => r.id === requestId);
      if (!parentReq) {
        res.status(404).json({ error: 'Service request not found.' });
        return;
      }
      const prov = db.providers.find((p) => p.userId === req.currentUser!.id);
      const isOwnerOrAdmin =
        parentReq.customerId === req.currentUser!.id || req.currentUser!.role === 'admin';
      const quotes = db.quotations.filter((q) => q.requestId === requestId);
      if (isOwnerOrAdmin) {
        res.json({ quotations: quotes });
        return;
      }
      if (prov) {
        res.json({ quotations: quotes.filter((q) => q.providerId === prov.id) });
        return;
      }
      res.status(403).json({ error: 'Not authorized to view quotations for this request.' });
      return;
    }
    if (req.currentUser!.activeMode === 'provider') {
      const prov = db.providers.find((p) => p.userId === req.currentUser!.id);
      const quotes = prov ? db.quotations.filter((q) => q.providerId === prov.id) : [];
      res.json({ quotations: quotes });
      return;
    }
    const myReqIds = new Set(
      db.serviceRequests.filter((r) => r.customerId === req.currentUser!.id).map((r) => r.id)
    );
    res.json({ quotations: db.quotations.filter((q) => myReqIds.has(q.requestId)) });
  });

  app.post('/api/quotations', requireAuth, (req: AuthedRequest, res) => {
    const db = getStore();
    const prov = db.providers.find((p) => p.userId === req.currentUser!.id);
    if (!prov) {
      res.status(403).json({ error: 'Create or switch to a Service Provider profile to submit quotations.' });
      return;
    }
    const { requestId, estimatedPrice, description, estimatedArrival, notes } = req.body as {
      requestId?: string;
      estimatedPrice?: number;
      description?: string;
      estimatedArrival?: string;
      notes?: string;
    };

    const request = db.serviceRequests.find((r) => r.id === requestId);
    if (!request) {
      res.status(404).json({ error: 'Service request not found.' });
      return;
    }
    if (!estimatedPrice || Number(estimatedPrice) <= 0 || !description) {
      res.status(400).json({ error: 'Estimated price and service description are required.' });
      return;
    }

    const nowIso = new Date().toISOString();
    const quote = {
      id: makeId('quot'),
      requestId: request.id,
      providerId: prov.id,
      providerName: prov.name,
      providerTitle: prov.title,
      providerRating: prov.rating,
      providerExperience: prov.experienceYears,
      providerVerified: prov.identityVerified && prov.profileVerified,
      providerIsDemo: prov.isDemo,
      estimatedPrice: Math.round(Number(estimatedPrice)),
      description: String(description).slice(0, 1000),
      estimatedArrival: String(estimatedArrival || 'On requested slot').slice(0, 120),
      notes: String(notes || '').slice(0, 500),
      status: 'pending' as const,
      createdAt: nowIso,
    };

    db.quotations.unshift(quote);
    if (request.status === 'request_submitted' || request.status === 'providers_notified') {
      request.status = 'quotations_received';
    }
    request.updatedAt = nowIso;

    db.notifications.unshift({
      id: makeId('notif'),
      userId: request.customerId,
      type: 'quotation',
      title: `New Quotation from ${prov.name} (₹${quote.estimatedPrice})`,
      body: `${request.title} · ETA: ${quote.estimatedArrival}`,
      linkPage: 'quotations',
      linkId: request.id,
      read: false,
      createdAt: nowIso,
    });

    saveStore();
    emitRealtimeEvent('quotation_created', { requestId: request.id, quotation: quote });
    res.json({ quotation: quote });
  });

  app.post('/api/quotations/:id/select', requireAuth, (req: AuthedRequest, res) => {
    const db = getStore();
    const quote = db.quotations.find((q) => q.id === req.params.id);
    if (!quote) {
      res.status(404).json({ error: 'Quotation not found.' });
      return;
    }
    const request = db.serviceRequests.find((r) => r.id === quote.requestId);
    if (!request) {
      res.status(404).json({ error: 'Parent service request not found.' });
      return;
    }
    if (request.customerId !== req.currentUser!.id && req.currentUser!.role !== 'admin') {
      res.status(403).json({ error: 'Only the requesting customer can select a provider.' });
      return;
    }

    const nowIso = new Date().toISOString();
    for (const q of db.quotations) {
      if (q.requestId === request.id) {
        q.status = q.id === quote.id ? 'accepted' : 'declined';
      }
    }

    request.selectedQuotationId = quote.id;
    request.selectedProviderId = quote.providerId;
    request.status = 'booking_confirmed';
    request.updatedAt = nowIso;

    const otp = String(Math.floor(1000 + Math.random() * 9000));
    const booking = {
      id: makeId('book'),
      requestId: request.id,
      quotationId: quote.id,
      customerId: request.customerId,
      customerName: request.customerName,
      providerId: quote.providerId,
      providerName: quote.providerName,
      categoryId: request.categoryId,
      subcategoryId: request.subcategoryId,
      serviceTitle: request.title,
      agreedPrice: quote.estimatedPrice,
      preferredDate: request.preferredDate,
      preferredTime: request.preferredTime,
      locationLabel: `${request.locality}, ${request.town} · ${request.pincode}`,
      status: 'booking_confirmed' as BookingStatus,
      completionOtp: otp,
      otpRequired: true,
      otpVerified: false,
      liveLocationShared: false,
      reviewed: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    db.bookings.unshift(booking);

    const prov = db.providers.find((p) => p.id === quote.providerId);
    if (prov) {
      db.notifications.unshift({
        id: makeId('notif'),
        userId: prov.userId,
        type: 'booking',
        title: `Booking Confirmed by ${request.customerName}`,
        body: `${request.title} · ₹${quote.estimatedPrice} · ${request.preferredDate} ${request.preferredTime}`,
        linkPage: 'booking-details',
        linkId: booking.id,
        read: false,
        createdAt: nowIso,
      });
    }

    saveStore();
    emitRealtimeEvent('booking_updated', { booking });
    res.json({ booking, request });
  });

  app.post('/api/quotations/:id/decline', requireAuth, (req: AuthedRequest, res) => {
    const db = getStore();
    const quote = db.quotations.find((q) => q.id === req.params.id);
    if (!quote) {
      res.status(404).json({ error: 'Quotation not found.' });
      return;
    }
    const parentReq = db.serviceRequests.find((r) => r.id === quote.requestId);
    if (
      parentReq &&
      parentReq.customerId !== req.currentUser!.id &&
      req.currentUser!.role !== 'admin'
    ) {
      res.status(403).json({ error: 'Only the requesting customer can decline this quotation.' });
      return;
    }
    quote.status = 'declined';
    const prov = db.providers.find((p) => p.id === quote.providerId);
    if (prov) {
      db.notifications.unshift({
        id: makeId('notif'),
        userId: prov.userId,
        type: 'quotation',
        title: `Quotation Declined`,
        body: `Customer declined your quote of ₹${quote.estimatedPrice} for "${parentReq?.title || 'request'}".`,
        linkPage: 'provider-dashboard',
        linkId: quote.requestId,
        read: false,
        createdAt: new Date().toISOString(),
      });
    }
    saveStore();
    emitRealtimeEvent('quotation_created', { requestId: quote.requestId, quotation: quote });
    res.json({ quotation: quote });
  });

  // --- BOOKINGS & COMPLETION WORKFLOW ---
  app.get('/api/bookings', requireAuth, (req: AuthedRequest, res) => {
    const db = getStore();
    if (req.currentUser!.role === 'admin') {
      res.json({ bookings: db.bookings });
      return;
    }
    if (req.currentUser!.activeMode === 'provider') {
      const prov = db.providers.find((p) => p.userId === req.currentUser!.id);
      const list = prov ? db.bookings.filter((b) => b.providerId === prov.id) : [];
      res.json({ bookings: list });
      return;
    }
    res.json({ bookings: db.bookings.filter((b) => b.customerId === req.currentUser!.id) });
  });

  app.get('/api/bookings/:id', requireAuth, (req: AuthedRequest, res) => {
    const db = getStore();
    const booking = db.bookings.find((b) => b.id === req.params.id);
    if (!booking) {
      res.status(404).json({ error: 'Booking not found.' });
      return;
    }
    const prov = db.providers.find((p) => p.id === booking.providerId);
    const isParticipant =
      booking.customerId === req.currentUser!.id ||
      prov?.userId === req.currentUser!.id ||
      req.currentUser!.role === 'admin';
    if (!isParticipant) {
      res.status(403).json({ error: 'You are not authorized to view this booking.' });
      return;
    }
    const request = db.serviceRequests.find((r) => r.id === booking.requestId) || null;
    res.json({ booking, provider: prov || null, request });
  });

  app.patch('/api/bookings/:id/status', requireAuth, (req: AuthedRequest, res) => {
    const db = getStore();
    const booking = db.bookings.find((b) => b.id === req.params.id);
    if (!booking) {
      res.status(404).json({ error: 'Booking not found.' });
      return;
    }
    const prov = db.providers.find((p) => p.id === booking.providerId);
    const isCustomer = booking.customerId === req.currentUser!.id;
    const isProvider = prov?.userId === req.currentUser!.id;
    const isAdmin = req.currentUser!.role === 'admin';
    if (!isCustomer && !isProvider && !isAdmin) {
      res.status(403).json({ error: 'You are not authorized to update this booking.' });
      return;
    }

    const { action, otp, requireOtp, cancellationReason } = req.body as {
      action?: 'arrived' | 'start' | 'complete' | 'confirm_complete' | 'cancel';
      otp?: string;
      requireOtp?: boolean;
      cancellationReason?: string;
    };

    const allowedActions = new Set(['arrived', 'start', 'complete', 'confirm_complete', 'cancel']);
    if (!action || !allowedActions.has(action)) {
      res.status(400).json({ error: 'Valid booking status action is required.' });
      return;
    }

    if (booking.status === 'service_completed' || booking.status === 'cancelled') {
      res.status(400).json({ error: `Booking is already ${booking.status.replace(/_/g, ' ')}.` });
      return;
    }

    const nowIso = new Date().toISOString();
    const reqRecord = db.serviceRequests.find((r) => r.id === booking.requestId);

    if (action === 'arrived') {
      if (!isProvider && !isAdmin) {
        res.status(403).json({ error: 'Only the assigned provider can mark arrival.' });
        return;
      }
      booking.providerArrivedAt = nowIso;
      booking.updatedAt = nowIso;
      db.notifications.unshift({
        id: makeId('notif'),
        userId: booking.customerId,
        type: 'booking',
        title: `${booking.providerName} has arrived`,
        body: `Your specialist arrived for "${booking.serviceTitle}".`,
        linkPage: 'booking-details',
        linkId: booking.id,
        read: false,
        createdAt: nowIso,
      });
    } else if (action === 'start') {
      if (!isProvider && !isAdmin) {
        res.status(403).json({ error: 'Only the assigned provider can start the service.' });
        return;
      }
      booking.providerArrivedAt = booking.providerArrivedAt || nowIso;
      booking.startedAt = nowIso;
      booking.status = 'service_started';
      booking.updatedAt = nowIso;
      if (reqRecord) {
        reqRecord.status = 'service_started';
        reqRecord.updatedAt = nowIso;
      }
      db.notifications.unshift({
        id: makeId('notif'),
        userId: booking.customerId,
        type: 'booking',
        title: 'Service Started',
        body: `${booking.providerName} started work on "${booking.serviceTitle}".`,
        linkPage: 'booking-details',
        linkId: booking.id,
        read: false,
        createdAt: nowIso,
      });
    } else if (action === 'complete' || action === 'confirm_complete') {
      if (requireOtp && !otp?.trim()) {
        res.status(400).json({ error: 'Enter the 4-digit customer OTP or choose Complete Without OTP.' });
        return;
      }
      if (otp && otp.trim() && booking.otpRequired && otp.trim() !== booking.completionOtp) {
        res.status(400).json({ error: 'Invalid completion OTP code. Please check with the customer.' });
        return;
      }
      if (otp && otp.trim() === booking.completionOtp) {
        booking.otpVerified = true;
      }
      booking.status = 'service_completed';
      booking.completedAt = nowIso;
      booking.providerTrackingActive = false;
      booking.providerLiveCoords = undefined;
      booking.updatedAt = nowIso;
      if (reqRecord) {
        reqRecord.status = 'service_completed';
        reqRecord.updatedAt = nowIso;
      }
      if (prov) {
        prov.completedJobs = (prov.completedJobs || 0) + 1;
      }
      db.notifications.unshift({
        id: makeId('notif'),
        userId: booking.customerId,
        type: 'booking',
        title: 'Service Completed — Share Your Review',
        body: `"${booking.serviceTitle}" is marked complete. Tap to rate ${booking.providerName}.`,
        linkPage: 'booking-details',
        linkId: booking.id,
        read: false,
        createdAt: nowIso,
      });
    } else if (action === 'cancel') {
      booking.status = 'cancelled';
      booking.cancelledAt = nowIso;
      booking.providerTrackingActive = false;
      booking.providerLiveCoords = undefined;
      booking.cancellationReason = cancellationReason || 'Cancelled by user';
      booking.updatedAt = nowIso;
      if (reqRecord) {
        reqRecord.status = 'cancelled';
        reqRecord.updatedAt = nowIso;
      }
    }

    saveStore();
    emitRealtimeEvent('booking_updated', { booking });
    res.json({ booking });
  });

  app.patch('/api/bookings/:id/location', requireAuth, (req: AuthedRequest, res) => {
    const db = getStore();
    const booking = db.bookings.find((b) => b.id === req.params.id);
    if (!booking) {
      res.status(404).json({ error: 'Booking not found.' });
      return;
    }

    const prov = db.providers.find((p) => p.id === booking.providerId);
    const isBookingCustomer = booking.customerId === req.currentUser!.id;
    const isBookingProvider = prov?.userId === req.currentUser!.id;
    const isAdmin = req.currentUser!.role === 'admin';
    if (!isBookingCustomer && !isBookingProvider && !isAdmin) {
      res.status(403).json({ error: 'Live location is restricted to booking participants.' });
      return;
    }

    const { share, providerShare, lat, lng, mode } = req.body as {
      share?: boolean;
      providerShare?: boolean;
      lat?: number;
      lng?: number;
      mode?: 'gps' | 'demo_simulation';
    };

    if (typeof providerShare === 'boolean') {
      if (booking.status === 'service_completed' || booking.status === 'cancelled') {
        booking.providerTrackingActive = false;
        booking.providerLiveCoords = undefined;
      } else {
        booking.providerTrackingActive = providerShare;
        if (providerShare) {
          const fallbackLat = prov ? prov.lat : 10.9165;
          const fallbackLng = prov ? prov.lng : 75.9245;
          booking.providerLiveCoords = {
            lat: typeof lat === 'number' ? lat : fallbackLat,
            lng: typeof lng === 'number' ? lng : fallbackLng,
            updatedAt: new Date().toISOString(),
            mode: mode === 'gps' ? 'gps' : 'demo_simulation',
          };
        } else {
          booking.providerLiveCoords = undefined;
        }
      }
    }

    if (typeof share === 'boolean') {
      booking.liveLocationShared = Boolean(share);
      if (share && typeof lat === 'number' && typeof lng === 'number') {
        booking.customerLiveCoords = {
          lat,
          lng,
          updatedAt: new Date().toISOString(),
        };
      } else if (!share) {
        booking.customerLiveCoords = undefined;
      }
    }

    booking.updatedAt = new Date().toISOString();
    saveStore();
    emitRealtimeEvent('booking_updated', { booking });
    res.json({ booking });
  });

  // --- REAL-TIME CHAT ---
  app.get('/api/conversations', requireAuth, (req: AuthedRequest, res) => {
    const db = getStore();
    const prov = db.providers.find((p) => p.userId === req.currentUser!.id);
    const list = db.conversations.filter(
      (c) => c.customerId === req.currentUser!.id || (prov && c.providerId === prov.id)
    );
    list.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
    res.json({ conversations: list });
  });

  app.post('/api/conversations/start', requireAuth, (req: AuthedRequest, res) => {
    const db = getStore();
    const { providerId, requestId } = req.body as { providerId?: string; requestId?: string };
    const prov = db.providers.find((p) => p.id === providerId);
    if (!prov) {
      res.status(404).json({ error: 'Provider not found.' });
      return;
    }
    let conv = db.conversations.find(
      (c) => c.customerId === req.currentUser!.id && c.providerId === prov.id
    );
    if (!conv) {
      conv = {
        id: makeId('conv'),
        customerId: req.currentUser!.id,
        customerName: req.currentUser!.name,
        providerId: prov.id,
        providerName: prov.name,
        providerPhone: prov.phone,
        requestId,
        lastMessage: 'Conversation started',
        lastMessageAt: new Date().toISOString(),
        unreadCustomer: 0,
        unreadProvider: 0,
      };
      db.conversations.unshift(conv);
      saveStore();
    }
    res.json({ conversation: conv });
  });

  app.get('/api/conversations/:id/messages', requireAuth, (req: AuthedRequest, res) => {
    const db = getStore();
    const conv = db.conversations.find((c) => c.id === req.params.id);
    if (!conv) {
      res.status(404).json({ error: 'Conversation not found.' });
      return;
    }
    const prov = db.providers.find((p) => p.id === conv.providerId);
    const isProviderUser = prov?.userId === req.currentUser!.id;
    const isParticipant =
      conv.customerId === req.currentUser!.id ||
      isProviderUser ||
      req.currentUser!.role === 'admin';
    if (!isParticipant) {
      res.status(403).json({ error: 'You are not a participant in this conversation.' });
      return;
    }
    let updated = false;
    for (const m of db.messages) {
      if (m.conversationId === conv.id && m.senderId !== req.currentUser!.id && !m.readByRecipient) {
        m.readByRecipient = true;
        updated = true;
      }
    }
    if (isProviderUser && conv.unreadProvider > 0) {
      conv.unreadProvider = 0;
      updated = true;
    } else if (!isProviderUser && conv.unreadCustomer > 0) {
      conv.unreadCustomer = 0;
      updated = true;
    }
    if (updated) saveStore();
    const messages = db.messages.filter((m) => m.conversationId === conv.id);
    res.json({ conversation: conv, messages });
  });

  app.post('/api/conversations/:id/messages', requireAuth, (req: AuthedRequest, res) => {
    const db = getStore();
    const conv = db.conversations.find((c) => c.id === req.params.id);
    if (!conv) {
      res.status(404).json({ error: 'Conversation not found.' });
      return;
    }
    const prov = db.providers.find((p) => p.id === conv.providerId);
    const isProviderSender = prov?.userId === req.currentUser!.id;
    const isParticipant =
      conv.customerId === req.currentUser!.id ||
      isProviderSender ||
      req.currentUser!.role === 'admin';
    if (!isParticipant) {
      res.status(403).json({ error: 'You are not authorized to send messages in this thread.' });
      return;
    }
    const { text, imageUrl } = req.body as { text?: string; imageUrl?: string };
    if (!text?.trim() && !imageUrl) {
      res.status(400).json({ error: 'Message text or image is required.' });
      return;
    }

    const nowIso = new Date().toISOString();

    const msg = {
      id: makeId('msg'),
      conversationId: conv.id,
      senderId: req.currentUser!.id,
      senderName: isProviderSender && prov ? prov.name : req.currentUser!.name,
      senderRole: (isProviderSender ? 'provider' : 'customer') as 'customer' | 'provider',
      text: (text || '').trim().slice(0, 2000),
      imageUrl: imageUrl && imageUrl.length < 1_500_000 ? imageUrl : undefined,
      readByRecipient: false,
      createdAt: nowIso,
    };

    db.messages.push(msg);
    conv.lastMessage = msg.text || 'Photo attachment';
    conv.lastMessageAt = nowIso;
    if (isProviderSender) {
      conv.unreadCustomer += 1;
      db.notifications.unshift({
        id: makeId('notif'),
        userId: conv.customerId,
        type: 'message',
        title: `Message from ${conv.providerName}`,
        body: conv.lastMessage,
        linkPage: 'chat',
        linkId: conv.id,
        read: false,
        createdAt: nowIso,
      });
    } else if (prov) {
      conv.unreadProvider += 1;
      db.notifications.unshift({
        id: makeId('notif'),
        userId: prov.userId,
        type: 'message',
        title: `Message from ${conv.customerName}`,
        body: conv.lastMessage,
        linkPage: 'chat',
        linkId: conv.id,
        read: false,
        createdAt: nowIso,
      });
    }

    saveStore();
    emitRealtimeEvent('chat_message', { conversationId: conv.id, message: msg });
    res.json({ message: msg });
  });

  // --- NOTIFICATIONS ---
  app.get('/api/notifications', requireAuth, (req: AuthedRequest, res) => {
    const db = getStore();
    const list = db.notifications.filter((n) => n.userId === req.currentUser!.id);
    res.json({ notifications: list });
  });

  app.post('/api/notifications/read', requireAuth, (req: AuthedRequest, res) => {
    const db = getStore();
    const { id } = req.body as { id?: string };
    for (const n of db.notifications) {
      if (n.userId === req.currentUser!.id && (!id || n.id === id)) {
        n.read = true;
      }
    }
    saveStore();
    res.json({ ok: true });
  });

  // --- FAVOURITES ---
  app.get('/api/favourites', requireAuth, (req: AuthedRequest, res) => {
    const db = getStore();
    const ids = db.favourites[req.currentUser!.id] || [];
    const providers = db.providers.filter((p) => ids.includes(p.id));
    res.json({ favouriteIds: ids, providers });
  });

  app.post('/api/favourites/toggle', requireAuth, (req: AuthedRequest, res) => {
    const db = getStore();
    const { providerId } = req.body as { providerId?: string };
    if (!providerId) {
      res.status(400).json({ error: 'providerId is required.' });
      return;
    }
    const existing = db.favourites[req.currentUser!.id] || [];
    const next = existing.includes(providerId)
      ? existing.filter((id) => id !== providerId)
      : [...existing, providerId];
    db.favourites[req.currentUser!.id] = next;
    saveStore();
    res.json({ favouriteIds: next, saved: next.includes(providerId) });
  });

  // --- REVIEWS ---
  app.get('/api/reviews', (req, res) => {
    const db = getStore();
    const providerId = typeof req.query.providerId === 'string' ? req.query.providerId : undefined;
    const list = db.reviews.filter(
      (r) => r.moderatedStatus === 'published' && (!providerId || r.providerId === providerId)
    );
    res.json({ reviews: list });
  });

  app.post('/api/reviews', requireAuth, (req: AuthedRequest, res) => {
    const db = getStore();
    const { providerId, bookingId, rating, comment, serviceName } = req.body as {
      providerId?: string;
      bookingId?: string;
      rating?: number;
      comment?: string;
      serviceName?: string;
    };
    const prov = db.providers.find((p) => p.id === providerId);
    if (!prov || !rating || !comment?.trim()) {
      res.status(400).json({ error: 'Provider, rating, and review comment are required.' });
      return;
    }

    const numRating = Math.max(1, Math.min(5, Math.round(Number(rating))));
    const review = {
      id: makeId('rev'),
      bookingId,
      providerId: prov.id,
      customerId: req.currentUser!.id,
      customerName: req.currentUser!.name.replace(' (Demo Customer)', ''),
      rating: numRating,
      comment: comment.trim().slice(0, 1000),
      serviceName: serviceName || prov.title,
      moderatedStatus: 'published' as const,
      createdAt: new Date().toISOString(),
    };
    db.reviews.unshift(review);

    if (bookingId) {
      const booking = db.bookings.find((b) => b.id === bookingId);
      if (booking) booking.reviewed = true;
    }

    const provReviews = db.reviews.filter(
      (r) => r.providerId === prov.id && r.moderatedStatus === 'published'
    );
    prov.reviewCount = provReviews.length;
    prov.rating =
      Math.round(
        (provReviews.reduce((acc, r) => acc + r.rating, 0) / Math.max(1, provReviews.length)) * 10
      ) / 10;

    saveStore();
    res.json({ review, provider: prov });
  });

  // --- EMERGENCY ASSISTANCE ---
  app.get('/api/emergency/eligible', (req, res) => {
    const db = getStore();
    const serviceType = typeof req.query.serviceType === 'string' ? req.query.serviceType : '';
    const town = typeof req.query.town === 'string' ? req.query.town : '';
    const svcConfig = EMERGENCY_SERVICE_TYPES.find((e) => e.id === serviceType);
    const subId = svcConfig?.subcategoryId;

    const eligible = db.providers
      .filter((p) => {
        if (!p.isAvailable) return false;
        const matchesService = !subId || p.subcategoryIds.includes(subId);
        const matchesUrgent = p.urgentAvailable || p.isAvailable;
        return matchesService && matchesUrgent;
      })
      .sort((a, b) => {
        const aTown = town && a.town.toLowerCase() === town.toLowerCase() ? 1 : 0;
        const bTown = town && b.town.toLowerCase() === town.toLowerCase() ? 1 : 0;
        const aUrg = a.urgentAvailable ? 1 : 0;
        const bUrg = b.urgentAvailable ? 1 : 0;
        return bTown - aTown || bUrg - aUrg || b.rating - a.rating;
      })
      .slice(0, 8);

    res.json({ providers: eligible });
  });

  app.get('/api/emergency', (req: AuthedRequest, res) => {
    const db = getStore();
    if (!req.currentUser) {
      res.json({ requests: [] });
      return;
    }
    const list =
      req.currentUser.role === 'admin'
        ? db.emergencyRequests
        : db.emergencyRequests.filter((e) => e.customerId === req.currentUser!.id);
    res.json({ requests: list });
  });

  app.post('/api/emergency', (req: AuthedRequest, res) => {
    const db = getStore();
    const {
      customerName,
      phone,
      serviceType,
      description,
      district,
      town,
      pincode,
      lat,
      lng,
      locationShared,
    } = req.body as Record<string, unknown>;

    if (!serviceType || !description || !phone) {
      res.status(400).json({ error: 'Emergency service type, contact phone, and problem description are required.' });
      return;
    }

    const svcConfig = EMERGENCY_SERVICE_TYPES.find((e) => e.id === serviceType);
    const subId = svcConfig?.subcategoryId;
    const eligible = db.providers
      .filter((p) => p.isAvailable && (!subId || p.subcategoryIds.includes(subId)))
      .slice(0, 5);

    const nowIso = new Date().toISOString();
    const emg = {
      id: makeId('emg'),
      customerId: req.currentUser?.id,
      customerName: String(customerName || req.currentUser?.name || 'Local Household'),
      phone: String(phone).slice(0, 24),
      serviceType: String(serviceType),
      description: String(description).slice(0, 1000),
      district: String(district || 'Malappuram'),
      town: String(town || 'Tirur'),
      pincode: String(pincode || '676101'),
      lat: typeof lat === 'number' ? lat : undefined,
      lng: typeof lng === 'number' ? lng : undefined,
      locationShared: Boolean(locationShared),
      eligibleProviderIds: eligible.map((p) => p.id),
      estimatedResponseWindow: 'Estimated 30–75 minutes (estimate only, subject to provider acceptance)',
      status: 'submitted' as const,
      createdAt: nowIso,
    };

    db.emergencyRequests.unshift(emg);
    for (const p of eligible) {
      db.notifications.unshift({
        id: makeId('notif'),
        userId: p.userId,
        type: 'emergency',
        title: `Urgent Local Request in ${emg.town}`,
        body: `${svcConfig?.label || emg.serviceType}: ${emg.description.slice(0, 90)}`,
        linkPage: 'provider-dashboard',
        linkId: emg.id,
        read: false,
        createdAt: nowIso,
      });
    }

    saveStore();
    emitRealtimeEvent('emergency_created', { emergency: emg });
    res.json({ emergency: emg, eligibleProviders: eligible });
  });

  // --- REPORTS & VERIFICATION ---
  app.post('/api/reports', requireAuth, (req: AuthedRequest, res) => {
    const db = getStore();
    const { targetType, targetId, targetName, reason, details } = req.body as {
      targetType?: 'provider' | 'customer' | 'review' | 'platform';
      targetId?: string;
      targetName?: string;
      reason?: string;
      details?: string;
    };
    if (!reason || !details) {
      res.status(400).json({ error: 'Reason and details are required.' });
      return;
    }
    const report = {
      id: makeId('rep'),
      reporterId: req.currentUser!.id,
      reporterName: req.currentUser!.name,
      targetType: targetType || 'platform',
      targetId: targetId || 'general',
      targetName: targetName || 'General Support',
      reason: reason.slice(0, 120),
      details: details.slice(0, 1200),
      status: 'open' as const,
      createdAt: new Date().toISOString(),
    };
    db.reports.unshift(report);
    saveStore();
    res.json({ report });
  });

  app.post('/api/verifications', requireAuth, (req: AuthedRequest, res) => {
    const db = getStore();
    const prov = db.providers.find((p) => p.userId === req.currentUser!.id);
    if (!prov) {
      res.status(404).json({ error: 'Provider profile not found.' });
      return;
    }
    const { type, summary, experienceClaim } = req.body as {
      type?: 'identity' | 'skill' | 'profile';
      summary?: string;
      experienceClaim?: string;
    };
    const item = {
      id: makeId('ver'),
      providerId: prov.id,
      providerName: prov.name,
      type: type || 'profile',
      summary: (summary || 'Requested profile verification review').slice(0, 500),
      experienceClaim: (experienceClaim || `${prov.experienceYears} years experience`).slice(0, 200),
      status: 'pending' as const,
      createdAt: new Date().toISOString(),
    };
    db.verificationRequests.unshift(item);
    saveStore();
    res.json({ verificationRequest: item });
  });

  // --- ADMIN DASHBOARD ---
  app.get('/api/admin/overview', requireAdmin, (_req, res) => {
    const db = getStore();
    const completedBookings = db.bookings.filter((b) => b.status === 'service_completed');
    res.json({
      stats: {
        totalUsers: db.users.length,
        totalCustomers: db.users.filter((u) => u.role === 'customer').length,
        totalProviders: db.providers.length,
        verifiedProviders: db.providers.filter((p) => p.identityVerified && p.profileVerified).length,
        totalRequests: db.serviceRequests.length,
        totalBookings: db.bookings.length,
        completedBookings: completedBookings.length,
        openReports: db.reports.filter((r) => r.status === 'open').length,
        pendingVerifications: db.verificationRequests.filter((v) => v.status === 'pending').length,
      },
      users: db.users.map(toPublicUser),
      providers: db.providers,
      categories: db.categories,
      serviceRequests: db.serviceRequests,
      verificationRequests: db.verificationRequests,
      reports: db.reports,
      reviews: db.reviews,
      emergencyRequests: db.emergencyRequests,
    });
  });

  app.patch('/api/admin/providers/:id', requireAdmin, (req, res) => {
    const db = getStore();
    const prov = db.providers.find((p) => p.id === req.params.id);
    if (!prov) {
      res.status(404).json({ error: 'Provider not found.' });
      return;
    }
    const { isFeatured, identityVerified, skillVerified, profileVerified } = req.body as Partial<Provider>;
    if (typeof isFeatured === 'boolean') prov.isFeatured = isFeatured;
    if (typeof identityVerified === 'boolean') prov.identityVerified = identityVerified;
    if (typeof skillVerified === 'boolean') prov.skillVerified = skillVerified;
    if (typeof profileVerified === 'boolean') prov.profileVerified = profileVerified;
    saveStore();
    res.json({ provider: prov });
  });

  app.patch('/api/admin/verifications/:id', requireAdmin, (req, res) => {
    const db = getStore();
    const ver = db.verificationRequests.find((v) => v.id === req.params.id);
    if (!ver) {
      res.status(404).json({ error: 'Verification request not found.' });
      return;
    }
    const { status, adminNote } = req.body as { status?: 'approved' | 'rejected'; adminNote?: string };
    if (status === 'approved' || status === 'rejected') {
      ver.status = status;
      ver.adminNote = adminNote;
      const prov = db.providers.find((p) => p.id === ver.providerId);
      if (prov && status === 'approved') {
        if (ver.type === 'identity') prov.identityVerified = true;
        if (ver.type === 'skill') prov.skillVerified = true;
        if (ver.type === 'profile') prov.profileVerified = true;
        db.notifications.unshift({
          id: makeId('notif'),
          userId: prov.userId,
          type: 'verification',
          title: 'Verification Approved',
          body: `Your ${ver.type} verification badge is now active on your LocalConnect profile.`,
          linkPage: 'provider-profile-manage',
          read: false,
          createdAt: new Date().toISOString(),
        });
      }
    }
    saveStore();
    res.json({ verificationRequest: ver });
  });

  app.patch('/api/admin/reports/:id', requireAdmin, (req, res) => {
    const db = getStore();
    const rep = db.reports.find((r) => r.id === req.params.id);
    if (!rep) {
      res.status(404).json({ error: 'Report not found.' });
      return;
    }
    const { status, adminResolution } = req.body as {
      status?: 'open' | 'investigating' | 'resolved' | 'dismissed';
      adminResolution?: string;
    };
    if (status) rep.status = status;
    if (typeof adminResolution === 'string') rep.adminResolution = adminResolution;
    saveStore();
    res.json({ report: rep });
  });

  app.patch('/api/admin/reviews/:id', requireAdmin, (req, res) => {
    const db = getStore();
    const rev = db.reviews.find((r) => r.id === req.params.id);
    if (!rev) {
      res.status(404).json({ error: 'Review not found.' });
      return;
    }
    const { moderatedStatus } = req.body as { moderatedStatus?: 'published' | 'flagged' | 'hidden' };
    if (moderatedStatus) {
      rev.moderatedStatus = moderatedStatus;
      const prov = db.providers.find((p) => p.id === rev.providerId);
      if (prov) {
        const published = db.reviews.filter(
          (r) => r.providerId === prov.id && r.moderatedStatus === 'published'
        );
        prov.reviewCount = published.length;
        if (published.length > 0) {
          prov.rating =
            Math.round(
              (published.reduce((sum, r) => sum + r.rating, 0) / published.length) * 10
            ) / 10;
        }
      }
    }
    saveStore();
    res.json({ review: rev });
  });

  app.patch('/api/admin/users/:id', requireAdmin, (req, res) => {
    const db = getStore();
    const user = db.users.find((u) => u.id === req.params.id);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    const { isSuspended } = req.body as { isSuspended?: boolean };
    if (typeof isSuspended === 'boolean') user.isSuspended = isSuspended;
    saveStore();
    res.json({ user: toPublicUser(user) });
  });

  app.post('/api/admin/categories', requireAdmin, (req, res) => {
    const db = getStore();
    const { categoryId, subcategoryName, description, typicalPriceRange } = req.body as {
      categoryId?: string;
      subcategoryName?: string;
      description?: string;
      typicalPriceRange?: string;
    };
    const cat = db.categories.find((c) => c.id === categoryId);
    if (!cat || !subcategoryName?.trim()) {
      res.status(400).json({ error: 'Valid category and subcategory name are required.' });
      return;
    }
    const subId = subcategoryName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-');
    if (!cat.subcategories.some((s) => s.id === subId)) {
      cat.subcategories.push({
        id: subId,
        categoryId: cat.id,
        name: subcategoryName.trim(),
        nameMl: subcategoryName.trim(),
        nameHi: subcategoryName.trim(),
        description: description || `${subcategoryName.trim()} local services`,
        typicalPriceRange: typicalPriceRange || '₹300 – ₹1,500',
      });
      saveStore();
    }
    res.json({ categories: db.categories });
  });

  // --- LOCALCONNECT AI (CHAT, VOICE ASSISTANT, PHOTO DETECTOR, SMART MODE, CHAT TRANSLATOR) ---
  app.post('/api/ai/chat', async (req: AuthedRequest, res) => {
    try {
      const { message, history, language, mode } = req.body as {
        message?: string;
        history?: Array<{ role: 'user' | 'assistant'; text: string }>;
        language?: LanguageCode;
        mode?: 'customer' | 'provider';
      };
      if (!message?.trim()) {
        res.status(400).json({ error: 'Please enter a message for LocalConnect AI.' });
        return;
      }
      const result = await handleAiChat({
        message: message.trim(),
        history,
        language: language || req.currentUser?.language || 'en',
        user: req.currentUser ? toPublicUser(req.currentUser) : null,
        mode: mode || req.currentUser?.activeMode || 'customer',
      });
      res.json(result);
    } catch (err) {
      console.error('AI route error:', err);
      res.status(500).json({ error: 'LocalConnect AI encountered an error. Please retry.' });
    }
  });

  app.post('/api/ai/analyze-photo', async (req, res) => {
    try {
      const { imageBase64, mimeType, note } = req.body as {
        imageBase64?: string;
        mimeType?: string;
        note?: string;
      };
      if (!imageBase64 && !note?.trim()) {
        res.status(400).json({ error: 'Please upload a photo or describe the issue.' });
        return;
      }
      const result = await handlePhotoAnalysis({
        imageBase64: imageBase64 || '',
        mimeType: mimeType || 'image/jpeg',
        note,
      });
      res.json(result);
    } catch (err) {
      console.error('Photo analysis error:', err);
      res.status(500).json({ error: 'Could not analyze problem photo right now.' });
    }
  });

  app.post('/api/ai/smart-mode', async (req: AuthedRequest, res) => {
    try {
      const { query, userLat, userLng } = req.body as {
        query?: string;
        userLat?: number;
        userLng?: number;
      };
      if (!query?.trim()) {
        res.status(400).json({ error: 'Please enter or speak what service you need.' });
        return;
      }
      const result = await handleSmartMode({
        query: query.trim(),
        userLat,
        userLng,
      });
      res.json(result);
    } catch (err) {
      console.error('Smart Mode error:', err);
      res.status(500).json({ error: 'LocalConnect Smart Mode could not process the query.' });
    }
  });

  app.post('/api/chat/translate', requireAuth, async (req: AuthedRequest, res) => {
    try {
      const { messageId, text, targetLanguage } = req.body as {
        messageId?: string;
        text?: string;
        targetLanguage?: LanguageCode;
      };
      const target: LanguageCode =
        targetLanguage === 'ml' || targetLanguage === 'hi' ? targetLanguage : 'en';

      const db = getStore();
      let sourceText = text?.trim() || '';
      const existingMsg = messageId ? db.messages.find((m) => m.id === messageId) : undefined;
      if (existingMsg) {
        const parentConv = db.conversations.find((c) => c.id === existingMsg.conversationId);
        const prov = parentConv ? db.providers.find((p) => p.id === parentConv.providerId) : undefined;
        const allowed =
          req.currentUser!.role === 'admin' ||
          (parentConv &&
            (parentConv.customerId === req.currentUser!.id || prov?.userId === req.currentUser!.id));
        if (!allowed) {
          res.status(403).json({ error: 'Not authorized to translate messages in this thread.' });
          return;
        }
        sourceText = existingMsg.text;
        if (existingMsg.translations?.[target]) {
          res.json({
            detectedLanguage: existingMsg.detectedLanguage || 'en',
            translatedText: existingMsg.translations[target],
            cached: true,
          });
          return;
        }
      }
      if (!sourceText) {
        res.status(400).json({ error: 'Message text is required for translation.' });
        return;
      }
      const translated = await translateChatMessage({ text: sourceText, targetLanguage: target });
      if (existingMsg) {
        existingMsg.detectedLanguage = translated.detectedLanguage;
        existingMsg.translations = {
          ...(existingMsg.translations || {}),
          [target]: translated.translatedText,
        };
        saveStore();
      }
      res.json(translated);
    } catch (err) {
      console.error('Chat translation error:', err);
      res.status(500).json({ error: 'Translation failed. Showing original message.' });
    }
  });

  // --- LOCAL TALENT HUB ---
  app.get('/api/talent', (req, res) => {
    const db = getStore();
    const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';
    const skill = typeof req.query.skill === 'string' ? req.query.skill.trim().toLowerCase() : '';
    const district = typeof req.query.district === 'string' ? req.query.district.trim().toLowerCase() : '';
    const town = typeof req.query.town === 'string' ? req.query.town.trim().toLowerCase() : '';

    let list = db.talentProfiles;
    if (skill && skill !== 'all') {
      list = list.filter((t) => t.skillCategory.toLowerCase().includes(skill));
    }
    if (district && district !== 'all') {
      list = list.filter((t) => t.district.toLowerCase() === district);
    }
    if (town && town !== 'all') {
      list = list.filter((t) => t.town.toLowerCase() === town);
    }
    if (q) {
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.headline.toLowerCase().includes(q) ||
          t.skillCategory.toLowerCase().includes(q) ||
          t.bio.toLowerCase().includes(q) ||
          t.town.toLowerCase().includes(q) ||
          t.locality.toLowerCase().includes(q) ||
          t.selfReportedQualifications.some((s) => s.toLowerCase().includes(q)) ||
          t.certificates.some((c) => c.toLowerCase().includes(q))
      );
    }
    list = [...list].sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured));
    res.json({ talents: list });
  });

  app.post('/api/talent', requireAuth, (req: AuthedRequest, res) => {
    const db = getStore();
    const {
      name,
      headline,
      skillCategory,
      bio,
      experienceYears,
      languages,
      selfReportedQualifications,
      certificates,
      district,
      town,
      locality,
      phone,
      workSamples,
    } = req.body as Partial<TalentProfile>;

    if (!name?.trim() || !headline?.trim() || !skillCategory?.trim()) {
      res.status(400).json({ error: 'Name, headline, and skill category are required.' });
      return;
    }

    const nowIso = new Date().toISOString();
    const prov = db.providers.find((p) => p.userId === req.currentUser!.id);
    const created: TalentProfile = {
      id: makeId('tal'),
      userId: req.currentUser!.id,
      name: name.trim().slice(0, 80),
      skillCategory: skillCategory.trim().slice(0, 60),
      headline: headline.trim().slice(0, 120),
      bio: (bio || '').trim().slice(0, 1000),
      district: district || req.currentUser!.district,
      town: town || req.currentUser!.town,
      locality: locality || req.currentUser!.locality || town || req.currentUser!.town,
      experienceYears:
        typeof experienceYears === 'number' && Number.isFinite(experienceYears)
          ? Math.max(0, Math.min(70, Math.round(experienceYears)))
          : 1,
      languages:
        Array.isArray(languages) && languages.length > 0
          ? languages.slice(0, 6)
          : ['Malayalam', 'English'],
      selfReportedQualifications: Array.isArray(selfReportedQualifications)
        ? selfReportedQualifications.slice(0, 8)
        : [],
      certificates: Array.isArray(certificates) ? certificates.slice(0, 8) : [],
      workSamples: Array.isArray(workSamples) ? workSamples.slice(0, 4) : [],
      platformVerified: Boolean(prov?.identityVerified && prov?.profileVerified),
      isFeatured: false,
      isDemo: false,
      phone: (phone || req.currentUser!.phone || '').slice(0, 24),
      createdAt: nowIso,
    };

    db.talentProfiles.unshift(created);
    saveStore();
    res.json({ talent: created });
  });

  app.put('/api/talent/:id', requireAuth, (req: AuthedRequest, res) => {
    const db = getStore();
    const talent = db.talentProfiles.find((t) => t.id === req.params.id);
    if (!talent) {
      res.status(404).json({ error: 'Talent profile not found.' });
      return;
    }
    if (talent.userId !== req.currentUser!.id && req.currentUser!.role !== 'admin') {
      res.status(403).json({ error: 'You can only update your own Talent Hub profile.' });
      return;
    }

    const body = req.body as Partial<TalentProfile>;
    if (typeof body.name === 'string' && body.name.trim()) talent.name = body.name.trim().slice(0, 80);
    if (typeof body.headline === 'string' && body.headline.trim()) talent.headline = body.headline.trim().slice(0, 120);
    if (typeof body.skillCategory === 'string' && body.skillCategory.trim()) talent.skillCategory = body.skillCategory.trim().slice(0, 60);
    if (typeof body.bio === 'string') talent.bio = body.bio.slice(0, 1000);
    if (typeof body.experienceYears === 'number' && Number.isFinite(body.experienceYears)) {
      talent.experienceYears = Math.max(0, Math.min(70, Math.round(body.experienceYears)));
    }
    if (Array.isArray(body.languages)) talent.languages = body.languages.slice(0, 6);
    if (Array.isArray(body.selfReportedQualifications)) {
      talent.selfReportedQualifications = body.selfReportedQualifications.slice(0, 8);
    }
    if (Array.isArray(body.certificates)) talent.certificates = body.certificates.slice(0, 8);
    if (typeof body.district === 'string') talent.district = body.district;
    if (typeof body.town === 'string') talent.town = body.town;
    if (typeof body.locality === 'string') talent.locality = body.locality;
    if (typeof body.phone === 'string') talent.phone = body.phone.slice(0, 24);
    if (Array.isArray(body.workSamples)) talent.workSamples = body.workSamples.slice(0, 4);

    saveStore();
    res.json({ talent });
  });

  // --- SAVED ADDRESSES ---
  app.get('/api/addresses', requireAuth, (req: AuthedRequest, res) => {
    const db = getStore();
    res.json({ addresses: db.userAddresses.filter((a) => a.userId === req.currentUser!.id) });
  });

  app.post('/api/addresses', requireAuth, (req: AuthedRequest, res) => {
    const db = getStore();
    const { label, district, town, locality, pincode, addressLine, isDefault } = req.body as {
      label?: string;
      district?: string;
      town?: string;
      locality?: string;
      pincode?: string;
      addressLine?: string;
      isDefault?: boolean;
    };
    if (!label?.trim() || !town?.trim() || !locality?.trim()) {
      res.status(400).json({ error: 'Address label, town, and locality are required.' });
      return;
    }
    const loc = KERALA_LOCATIONS.find((l) => l.town.toLowerCase() === town.trim().toLowerCase());
    if (isDefault) {
      db.userAddresses.forEach((a) => {
        if (a.userId === req.currentUser!.id) a.isDefault = false;
      });
    }
    const address: UserAddress = {
      id: makeId('addr'),
      userId: req.currentUser!.id,
      label: label.trim().slice(0, 40),
      district: district || loc?.district || req.currentUser!.district,
      town: town.trim(),
      locality: locality.trim().slice(0, 120),
      pincode: (pincode || loc?.pincode || '676101').trim().slice(0, 10),
      addressLine: (addressLine?.trim() || `${locality.trim()}, ${town.trim()}`).slice(0, 200),
      isDefault: Boolean(isDefault),
    };
    db.userAddresses.unshift(address);
    saveStore();
    res.json({ address });
  });

  app.delete('/api/addresses/:id', requireAuth, (req: AuthedRequest, res) => {
    const db = getStore();
    const idx = db.userAddresses.findIndex(
      (a) => a.id === req.params.id && a.userId === req.currentUser!.id
    );
    if (idx === -1) {
      res.status(404).json({ error: 'Saved address not found.' });
      return;
    }
    db.userAddresses.splice(idx, 1);
    saveStore();
    res.json({ ok: true });
  });

  // --- SERVICE REMINDERS ---
  app.get('/api/reminders', requireAuth, (req: AuthedRequest, res) => {
    const db = getStore();
    res.json({ reminders: db.serviceReminders.filter((r) => r.userId === req.currentUser!.id) });
  });

  app.post('/api/reminders', requireAuth, (req: AuthedRequest, res) => {
    const db = getStore();
    const { title, categoryId, dueDate, cadence, notes } = req.body as {
      title?: string;
      categoryId?: string;
      dueDate?: string;
      cadence?: 'once' | 'quarterly' | 'yearly';
      notes?: string;
    };
    if (!title?.trim() || !dueDate) {
      res.status(400).json({ error: 'Reminder title and due date are required.' });
      return;
    }
    const validCadence: 'once' | 'quarterly' | 'yearly' =
      cadence === 'quarterly' || cadence === 'yearly' ? cadence : 'once';
    const reminder: ServiceReminder = {
      id: makeId('rem'),
      userId: req.currentUser!.id,
      title: title.trim().slice(0, 120),
      categoryId: categoryId || 'home-services',
      dueDate,
      cadence: validCadence,
      notes: (notes || '').trim().slice(0, 300),
      completed: false,
      createdAt: new Date().toISOString(),
    };
    db.serviceReminders.unshift(reminder);
    saveStore();
    res.json({ reminder });
  });

  app.patch('/api/reminders/:id', requireAuth, (req: AuthedRequest, res) => {
    const db = getStore();
    const reminder = db.serviceReminders.find(
      (r) => r.id === req.params.id && r.userId === req.currentUser!.id
    );
    if (!reminder) {
      res.status(404).json({ error: 'Reminder not found.' });
      return;
    }
    const { completed, dueDate } = req.body as { completed?: boolean; dueDate?: string };
    if (typeof completed === 'boolean') reminder.completed = completed;
    if (typeof dueDate === 'string' && dueDate) reminder.dueDate = dueDate;
    saveStore();
    res.json({ reminder });
  });

  app.delete('/api/reminders/:id', requireAuth, (req: AuthedRequest, res) => {
    const db = getStore();
    const idx = db.serviceReminders.findIndex(
      (r) => r.id === req.params.id && r.userId === req.currentUser!.id
    );
    if (idx === -1) {
      res.status(404).json({ error: 'Reminder not found.' });
      return;
    }
    db.serviceReminders.splice(idx, 1);
    saveStore();
    res.json({ ok: true });
  });

  // --- ACCESSIBILITY PREFERENCES ---
  app.get('/api/accessibility', requireAuth, (req: AuthedRequest, res) => {
    const db = getStore();
    const prefs: AccessibilityPreferences = db.accessibilityPreferences[req.currentUser!.id] || {
      fontScale: 'normal',
      highContrast: false,
      reducedMotion: false,
      largeTargets: false,
      screenReaderHints: true,
      preferredVoiceLang: req.currentUser!.language || 'en',
      chatAutoTranslateTo: 'off',
    };
    res.json({ preferences: prefs });
  });

  app.put('/api/accessibility', requireAuth, (req: AuthedRequest, res) => {
    const db = getStore();
    const body = req.body as Partial<AccessibilityPreferences>;
    const existing: AccessibilityPreferences = db.accessibilityPreferences[req.currentUser!.id] || {
      fontScale: 'normal',
      highContrast: false,
      reducedMotion: false,
      largeTargets: false,
      screenReaderHints: true,
      preferredVoiceLang: req.currentUser!.language || 'en',
      chatAutoTranslateTo: 'off',
    };
    const next: AccessibilityPreferences = {
      fontScale:
        body.fontScale === 'large' || body.fontScale === 'xlarge'
          ? body.fontScale
          : body.fontScale === 'normal'
            ? 'normal'
            : existing.fontScale,
      highContrast:
        typeof body.highContrast === 'boolean' ? body.highContrast : existing.highContrast,
      reducedMotion:
        typeof body.reducedMotion === 'boolean' ? body.reducedMotion : existing.reducedMotion,
      largeTargets:
        typeof body.largeTargets === 'boolean' ? body.largeTargets : existing.largeTargets,
      screenReaderHints:
        typeof body.screenReaderHints === 'boolean'
          ? body.screenReaderHints
          : existing.screenReaderHints,
      preferredVoiceLang:
        body.preferredVoiceLang === 'ml' ||
        body.preferredVoiceLang === 'hi' ||
        body.preferredVoiceLang === 'en'
          ? body.preferredVoiceLang
          : existing.preferredVoiceLang,
      chatAutoTranslateTo:
        body.chatAutoTranslateTo === 'off' ||
        body.chatAutoTranslateTo === 'en' ||
        body.chatAutoTranslateTo === 'ml' ||
        body.chatAutoTranslateTo === 'hi'
          ? body.chatAutoTranslateTo
          : existing.chatAutoTranslateTo,
    };
    db.accessibilityPreferences[req.currentUser!.id] = next;
    saveStore();
    res.json({ preferences: next });
  });

  // --- VITE / STATIC SERVING ---
  // Always serve generated assets from /src/assets/images in prod as well
  const assetsImagesDir = path.resolve(process.cwd(), 'src', 'assets', 'images');
  if (fs.existsSync(assetsImagesDir)) {
    app.use('/src/assets/images', express.static(assetsImagesDir));
  }

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LocalConnect server listening on http://localhost:${PORT}`);
  });
}

startServer();
