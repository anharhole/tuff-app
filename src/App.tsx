/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { AiAssistantView } from './components/AiAssistantPanel.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { Layout } from './components/Layout.tsx';
import { SplashScreen } from './components/SplashScreen.tsx';
import { AppProvider, useApp } from './context/AppContext.tsx';
import { AchievementsPage } from './pages/AchievementsPage.tsx';
import { AdminDashboardPage } from './pages/AdminDashboardPage.tsx';
import { AiPhotoDetectorPage } from './pages/AiPhotoDetectorPage.tsx';
import { LoginPage, RegisterPage } from './pages/AuthPages.tsx';
import { BookingDetailsPage, BookingHistoryPage } from './pages/BookingPages.tsx';
import { AllCategoriesPage, CategoryDetailPage } from './pages/CategoryPages.tsx';
import { ChatPage } from './pages/ChatPage.tsx';
import {
  CustomerDashboardPage,
  CustomerProfilePage,
  ProviderDashboardPage,
  ProviderManagePage,
} from './pages/DashboardPages.tsx';
import { EmergencyPage } from './pages/EmergencyPage.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { LiveTrackingPage } from './pages/LiveTrackingPage.tsx';
import { ProviderProfilePage } from './pages/ProviderProfilePage.tsx';
import { QuotationsPage } from './pages/QuotationsPage.tsx';
import { SearchPage } from './pages/SearchPage.tsx';
import {
  FavouritesPage,
  HelpCentrePage,
  NotificationsPage,
  ReviewsPage,
} from './pages/SecondaryPages.tsx';
import { ServiceRequestPage } from './pages/ServiceRequestPage.tsx';
import { AccessibilitySettingsPage, LanguageSettingsPage } from './pages/SettingsPages.tsx';
import { SmartModePage } from './pages/SmartModePage.tsx';
import { TalentHubPage } from './pages/TalentHubPage.tsx';

function renderCurrentPage(page: string, routeId?: string, routeProviderId?: string) {
  switch (page) {
    case 'home':
      return <HomePage />;
    case 'login':
      return <LoginPage />;
    case 'register':
      return <RegisterPage />;
    case 'customer-dashboard':
      return <CustomerDashboardPage />;
    case 'provider-dashboard':
      return <ProviderDashboardPage />;
    case 'categories':
      return <AllCategoriesPage />;
    case 'category':
      return <CategoryDetailPage />;
    case 'subcategory':
      return <CategoryDetailPage isSubcategory />;
    case 'search':
      return <SearchPage />;
    case 'provider-profile':
      return <ProviderProfilePage />;
    case 'request-service':
      return <ServiceRequestPage />;
    case 'quotations':
      return <QuotationsPage />;
    case 'booking-details':
      return <BookingDetailsPage />;
    case 'booking-history':
      return <BookingHistoryPage />;
    case 'chat':
      return <ChatPage />;
    case 'notifications':
      return <NotificationsPage />;
    case 'ai-assistant':
      return <AiAssistantView embedded />;
    case 'ai-voice':
      return <AiAssistantView embedded voiceFocus />;
    case 'ai-photo':
      return <AiPhotoDetectorPage />;
    case 'smart-mode':
      return <SmartModePage />;
    case 'live-tracking':
      return <LiveTrackingPage bookingId={routeId} />;
    case 'talent-hub':
      return <TalentHubPage />;
    case 'achievements':
      return <AchievementsPage providerId={routeProviderId || routeId} />;
    case 'accessibility':
      return <AccessibilitySettingsPage />;
    case 'language-settings':
      return <LanguageSettingsPage />;
    case 'emergency':
      return <EmergencyPage />;
    case 'favourites':
      return <FavouritesPage />;
    case 'customer-profile':
      return <CustomerProfilePage />;
    case 'provider-profile-manage':
      return <ProviderManagePage />;
    case 'reviews':
      return <ReviewsPage />;
    case 'help':
      return <HelpCentrePage />;
    case 'admin':
      return <AdminDashboardPage />;
    default:
      return <HomePage />;
  }
}

function PageRouter() {
  const { route } = useApp();
  const routeKey = `${route.page}:${route.id || ''}:${route.categoryId || ''}:${route.subcategoryId || ''}`;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={routeKey}
        initial={{ opacity: 0, y: 10, filter: 'blur(2px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      >
        {renderCurrentPage(route.page, route.id, route.providerId)}
      </motion.div>
    </AnimatePresence>
  );
}

function AppShell() {
  const { accessibility } = useApp();
  const [showSplash, setShowSplash] = useState(true);

  return (
    <MotionConfig reducedMotion={accessibility.reducedMotion ? 'always' : 'user'}>
      <AnimatePresence>
        {showSplash && <SplashScreen key="splash" onDone={() => setShowSplash(false)} />}
      </AnimatePresence>
      <Layout>
        <PageRouter />
      </Layout>
      <AiAssistantView />
    </MotionConfig>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppShell />
      </AppProvider>
    </ErrorBoundary>
  );
}
