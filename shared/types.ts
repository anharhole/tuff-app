export type LanguageCode = 'en' | 'ml' | 'hi';

export type UserRole = 'customer' | 'provider' | 'admin';

export type BookingStatus =
  | 'request_submitted'
  | 'providers_notified'
  | 'quotations_received'
  | 'provider_selected'
  | 'booking_confirmed'
  | 'service_started'
  | 'service_completed'
  | 'cancelled';

export interface KeralaLocation {
  id: string;
  town: string;
  district: string;
  pincode: string;
  localities: string[];
  lat: number;
  lng: number;
}

export interface Subcategory {
  id: string;
  categoryId: string;
  name: string;
  nameMl: string;
  nameHi: string;
  description: string;
  typicalPriceRange: string;
  urgentSupported?: boolean;
}

export interface ServiceCategory {
  id: string;
  name: string;
  nameMl: string;
  nameHi: string;
  description: string;
  iconName: string;
  accentImage: string;
  subcategories: Subcategory[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  phone: string;
  role: UserRole;
  activeMode: 'customer' | 'provider';
  canSwitchToProvider: boolean;
  ageVerified: boolean;
  isDemo: boolean;
  isSuspended?: boolean;
  district: string;
  town: string;
  locality: string;
  pincode: string;
  lat: number;
  lng: number;
  language: LanguageCode;
  allowRecommendations: boolean;
  searchHistory: string[];
  createdAt: string;
}

export type PublicUser = Omit<User, 'passwordHash'>;

export interface ProviderService {
  id: string;
  categoryId: string;
  subcategoryId: string;
  name: string;
  startingPrice: number;
  priceUnit: string;
  description: string;
}

export interface Provider {
  id: string;
  userId: string;
  name: string;
  title: string;
  phone: string;
  whatsapp: string;
  avatarUrl: string;
  bio: string;
  categoryIds: string[];
  subcategoryIds: string[];
  services: ProviderService[];
  startingPrice: number;
  district: string;
  town: string;
  locality: string;
  pincode: string;
  lat: number;
  lng: number;
  serviceRadiusKm: number;
  experienceYears: number;
  workingHours: string;
  isAvailable: boolean;
  availableDays: string[];
  urgentAvailable: boolean;
  rating: number;
  reviewCount: number;
  completedJobs: number;
  profileViews: number;
  identityVerified: boolean;
  skillVerified: boolean;
  profileVerified: boolean;
  isFeatured: boolean;
  isDemo: boolean;
  portfolioImages: string[];
  createdAt: string;
}

export interface ServiceRequest {
  id: string;
  customerId: string;
  customerName: string;
  categoryId: string;
  subcategoryId: string;
  targetProviderId?: string;
  title: string;
  description: string;
  photos: string[];
  preferredDate: string;
  preferredTime: string;
  district: string;
  town: string;
  locality: string;
  pincode: string;
  lat: number;
  lng: number;
  status: BookingStatus;
  notifiedProviderIds: string[];
  declinedByProviderIds?: string[];
  selectedQuotationId?: string;
  selectedProviderId?: string;
  isUrgent?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Quotation {
  id: string;
  requestId: string;
  providerId: string;
  providerName: string;
  providerTitle: string;
  providerRating: number;
  providerExperience: number;
  providerVerified: boolean;
  providerIsDemo: boolean;
  estimatedPrice: number;
  description: string;
  estimatedArrival: string;
  notes: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

export interface Booking {
  id: string;
  requestId: string;
  quotationId?: string;
  customerId: string;
  customerName: string;
  providerId: string;
  providerName: string;
  categoryId: string;
  subcategoryId: string;
  serviceTitle: string;
  agreedPrice: number;
  preferredDate: string;
  preferredTime: string;
  locationLabel: string;
  status: BookingStatus;
  completionOtp: string;
  otpRequired: boolean;
  otpVerified: boolean;
  liveLocationShared: boolean;
  customerLiveCoords?: { lat: number; lng: number; updatedAt: string };
  providerTrackingActive?: boolean;
  providerLiveCoords?: {
    lat: number;
    lng: number;
    updatedAt: string;
    mode: 'gps' | 'demo_simulation';
  };
  providerArrivedAt?: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  reviewed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  id: string;
  customerId: string;
  customerName: string;
  providerId: string;
  providerName: string;
  providerPhone: string;
  requestId?: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCustomer: number;
  unreadProvider: number;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: 'customer' | 'provider';
  text: string;
  imageUrl?: string;
  detectedLanguage?: LanguageCode;
  translations?: Partial<Record<LanguageCode, string>>;
  readByRecipient: boolean;
  createdAt: string;
}

export interface Review {
  id: string;
  bookingId?: string;
  providerId: string;
  customerId: string;
  customerName: string;
  rating: number;
  comment: string;
  serviceName: string;
  moderatedStatus: 'published' | 'flagged' | 'hidden';
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  type: 'quotation' | 'booking' | 'message' | 'request' | 'emergency' | 'verification' | 'system';
  title: string;
  body: string;
  linkPage: string;
  linkId?: string;
  read: boolean;
  createdAt: string;
}

export interface VerificationRequest {
  id: string;
  providerId: string;
  providerName: string;
  type: 'identity' | 'skill' | 'profile';
  summary: string;
  experienceClaim: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNote?: string;
  createdAt: string;
}

export interface ReportItem {
  id: string;
  reporterId: string;
  reporterName: string;
  targetType: 'provider' | 'customer' | 'review' | 'platform';
  targetId: string;
  targetName: string;
  reason: string;
  details: string;
  status: 'open' | 'investigating' | 'resolved' | 'dismissed';
  adminResolution?: string;
  createdAt: string;
}

export interface EmergencyRequest {
  id: string;
  customerId?: string;
  customerName: string;
  phone: string;
  serviceType: string;
  description: string;
  district: string;
  town: string;
  pincode: string;
  lat?: number;
  lng?: number;
  locationShared: boolean;
  eligibleProviderIds: string[];
  estimatedResponseWindow: string;
  status: 'submitted' | 'provider_contacted' | 'in_progress' | 'resolved';
  createdAt: string;
}

export interface SearchFilters {
  q?: string;
  categoryId?: string;
  subcategoryId?: string;
  district?: string;
  town?: string;
  pincode?: string;
  maxDistanceKm?: number;
  minRating?: number;
  maxPrice?: number;
  minPrice?: number;
  availableOnly?: boolean;
  minExperience?: number;
  verifiedOnly?: boolean;
  sortBy?: 'relevant' | 'nearest' | 'highest_rated' | 'lowest_price' | 'recently_added';
  userLat?: number;
  userLng?: number;
  page?: number;
  limit?: number;
}

export interface ProviderAchievement {
  id: string;
  key: string;
  title: string;
  description: string;
  ruleLabel: string;
  earned: boolean;
  progressCurrent: number;
  progressTarget: number;
  earnedAt?: string;
}

export interface TalentWorkSample {
  title: string;
  imageUrl?: string;
  notes: string;
}

export interface TalentProfile {
  id: string;
  userId: string;
  name: string;
  skillCategory: string;
  headline: string;
  bio: string;
  district: string;
  town: string;
  locality: string;
  experienceYears: number;
  languages: string[];
  selfReportedQualifications: string[];
  certificates: string[];
  workSamples: TalentWorkSample[];
  platformVerified: boolean;
  isFeatured: boolean;
  isDemo: boolean;
  phone: string;
  createdAt: string;
}

export interface UserAddress {
  id: string;
  userId: string;
  label: string;
  district: string;
  town: string;
  locality: string;
  pincode: string;
  addressLine: string;
  isDefault: boolean;
}

export interface ServiceReminder {
  id: string;
  userId: string;
  title: string;
  categoryId: string;
  dueDate: string;
  cadence: 'once' | 'quarterly' | 'yearly';
  notes: string;
  completed: boolean;
  createdAt: string;
}

export interface AccessibilityPreferences {
  fontScale: 'normal' | 'large' | 'xlarge';
  highContrast: boolean;
  reducedMotion: boolean;
  largeTargets: boolean;
  screenReaderHints: boolean;
  preferredVoiceLang: LanguageCode;
  chatAutoTranslateTo: 'off' | LanguageCode;
}

export interface PhotoAnalysisResult {
  possibleProblems: string[];
  observations: string[];
  uncertaintyNote: string;
  safetyWarning: string;
  suggestedCategoryId: string;
  suggestedCategoryName: string;
  suggestedSubcategoryId: string;
  suggestedSubcategoryName: string;
  recommendedQuestions: string[];
  draftTitle: string;
  draftDescription: string;
}

export interface SmartModeExtraction {
  serviceQuery: string;
  categoryId?: string;
  subcategoryId?: string;
  town?: string;
  district?: string;
  preferredDate?: string;
  budgetMax?: number;
  missingInfo: string[];
  explanation: string;
}

