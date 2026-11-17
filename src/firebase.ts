import { initializeApp } from 'firebase/app';
import { GoogleAuthProvider, getAuth } from 'firebase/auth';
import {
  doc,
  getDoc,
  getDocFromServer,
  getFirestore,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import type { AccessibilityPreferences, PublicUser } from '../shared/types.ts';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

void testConnection();

function normalizePincode(val?: string): string {
  const digits = (val || '').replace(/[^0-9]/g, '');
  return digits.length === 6 ? digits : '676101';
}

function safeId(val: string): string {
  const cleaned = val.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
  return cleaned || 'unknown';
}

export async function syncFirebaseUserProfileToFirestore(user: PublicUser): Promise<void> {
  const fbUser = auth.currentUser;
  if (!fbUser || !fbUser.emailVerified || fbUser.uid !== user.id) return;

  const uid = safeId(fbUser.uid);
  const publicPath = `users/${uid}`;
  const privatePath = `users/${uid}/private/info`;

  try {
    const existingPublic = await getDoc(doc(db, 'users', uid));
    if (!existingPublic.exists()) {
      await setDoc(doc(db, 'users', uid), {
        id: uid,
        name: (user.name || 'LocalConnect User').slice(0, 120),
        role: user.role === 'provider' ? 'provider' : 'customer',
        activeMode: user.activeMode === 'provider' ? 'provider' : 'customer',
        canSwitchToProvider: Boolean(user.canSwitchToProvider),
        ageVerified: Boolean(user.ageVerified),
        isDemo: false,
        isSuspended: false,
        language: user.language === 'ml' || user.language === 'hi' ? user.language : 'en',
        allowRecommendations: Boolean(user.allowRecommendations),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(doc(db, 'users', uid), {
        name: (user.name || 'LocalConnect User').slice(0, 120),
        activeMode: user.activeMode === 'provider' ? 'provider' : 'customer',
        language: user.language === 'ml' || user.language === 'hi' ? user.language : 'en',
        allowRecommendations: Boolean(user.allowRecommendations),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, publicPath);
  }

  try {
    const existingPriv = await getDoc(doc(db, 'users', uid, 'private', 'info'));
    if (!existingPriv.exists()) {
      await setDoc(doc(db, 'users', uid, 'private', 'info'), {
        userId: uid,
        email: (user.email || fbUser.email || '').slice(0, 254),
        phone: (user.phone || '').slice(0, 32),
        district: (user.district || 'Malappuram').slice(0, 80),
        town: (user.town || 'Tirur').slice(0, 80),
        locality: (user.locality || '').slice(0, 120),
        pincode: normalizePincode(user.pincode),
        lat: typeof user.lat === 'number' ? user.lat : 10.9165,
        lng: typeof user.lng === 'number' ? user.lng : 75.9245,
        searchHistory: (user.searchHistory || []).slice(0, 25).map((s) => s.slice(0, 100)),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(doc(db, 'users', uid, 'private', 'info'), {
        phone: (user.phone || '').slice(0, 32),
        district: (user.district || 'Malappuram').slice(0, 80),
        town: (user.town || 'Tirur').slice(0, 80),
        locality: (user.locality || '').slice(0, 120),
        pincode: normalizePincode(user.pincode),
        lat: typeof user.lat === 'number' ? user.lat : 10.9165,
        lng: typeof user.lng === 'number' ? user.lng : 75.9245,
        searchHistory: (user.searchHistory || []).slice(0, 25).map((s) => s.slice(0, 100)),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, privatePath);
  }
}

export async function syncFavouritesToFirestore(providerIds: string[]): Promise<void> {
  const fbUser = auth.currentUser;
  if (!fbUser || !fbUser.emailVerified) return;
  const uid = safeId(fbUser.uid);
  const path = `favourites/${uid}`;
  const sanitized = providerIds.slice(0, 100).map((id) => safeId(id));
  try {
    const existing = await getDoc(doc(db, 'favourites', uid));
    if (!existing.exists()) {
      await setDoc(doc(db, 'favourites', uid), {
        userId: uid,
        providerIds: sanitized,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(doc(db, 'favourites', uid), {
        providerIds: sanitized,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function syncAccessibilityToFirestore(prefs: AccessibilityPreferences): Promise<void> {
  const fbUser = auth.currentUser;
  if (!fbUser || !fbUser.emailVerified) return;
  const uid = safeId(fbUser.uid);
  const path = `accessibilityPreferences/${uid}`;
  try {
    const existing = await getDoc(doc(db, 'accessibilityPreferences', uid));
    if (!existing.exists()) {
      await setDoc(doc(db, 'accessibilityPreferences', uid), {
        userId: uid,
        fontScale: prefs.fontScale,
        highContrast: prefs.highContrast,
        reducedMotion: prefs.reducedMotion,
        largeTargets: prefs.largeTargets,
        screenReaderHints: prefs.screenReaderHints,
        preferredVoiceLang: prefs.preferredVoiceLang,
        chatAutoTranslateTo: prefs.chatAutoTranslateTo,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(doc(db, 'accessibilityPreferences', uid), {
        fontScale: prefs.fontScale,
        highContrast: prefs.highContrast,
        reducedMotion: prefs.reducedMotion,
        largeTargets: prefs.largeTargets,
        screenReaderHints: prefs.screenReaderHints,
        preferredVoiceLang: prefs.preferredVoiceLang,
        chatAutoTranslateTo: prefs.chatAutoTranslateTo,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
