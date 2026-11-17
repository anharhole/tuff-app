/**
 * LocalConnect Firestore Rules Verification Harness (Dirty Dozen Adversarial Suite)
 * Run against Firebase Firestore Emulator with @firebase/rules-unit-testing when verifying live rules.
 */

export interface DirtyDozenCase {
  id: number;
  name: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  auth: { uid: string; email?: string; email_verified?: boolean } | null;
  payload?: Record<string, unknown>;
  expected: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_PAYLOADS: DirtyDozenCase[] = [
  {
    id: 1,
    name: 'Self-Privilege Escalation on /users create',
    operation: 'create',
    path: 'users/attacker_uid',
    auth: { uid: 'attacker_uid', email: 'attacker@example.com', email_verified: true },
    payload: {
      id: 'attacker_uid',
      name: 'Mallory',
      role: 'admin',
      activeMode: 'customer',
      canSwitchToProvider: true,
      ageVerified: true,
      isDemo: false,
      isSuspended: false,
      language: 'en',
      allowRecommendations: true,
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Unverified Email Admin Spoof',
    operation: 'create',
    path: 'categories/fake-cat',
    auth: { uid: 'spoof_uid', email: 'drakefc45678@gmail.com', email_verified: false },
    payload: { id: 'fake-cat', name: 'Hacked', description: 'Spoof' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Shadow Verification Flag Escalation on /providers update',
    operation: 'update',
    path: 'providers/prov_1',
    auth: { uid: 'prov_user_1', email: 'prov@example.com', email_verified: true },
    payload: {
      bio: 'Updated bio',
      identityVerified: true,
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Cross-Tenant PII Read on /users/{uid}/private/info',
    operation: 'get',
    path: 'users/victim_uid/private/info',
    auth: { uid: 'other_uid', email: 'other@example.com', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'ID Poisoning with oversized invalid document ID',
    operation: 'create',
    path: `serviceRequests/${'x'.repeat(160)}`,
    auth: { uid: 'user_1', email: 'u@example.com', email_verified: true },
    payload: {
      id: 'x'.repeat(160),
      customerId: 'user_1',
      customerName: 'User One',
      categoryId: 'home-services',
      subcategoryId: 'electrician',
      title: 'Fix wiring',
      description: 'Need check',
      district: 'Malappuram',
      town: 'Tirur',
      pincode: '676101',
      status: 'request_submitted',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Impersonated Service Request Owner',
    operation: 'create',
    path: 'serviceRequests/req_spoof',
    auth: { uid: 'user_b', email: 'b@example.com', email_verified: true },
    payload: {
      id: 'req_spoof',
      customerId: 'user_a',
      customerName: 'Victim A',
      categoryId: 'home-services',
      subcategoryId: 'plumber',
      title: 'Pipe leak',
      description: 'Urgent',
      district: 'Malappuram',
      town: 'Tirur',
      pincode: '676101',
      status: 'request_submitted',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Orphaned Chat Message Injection into Non-Member Thread',
    operation: 'create',
    path: 'conversations/conv_a_p/messages/msg_bad',
    auth: { uid: 'intruder_uid', email: 'intruder@example.com', email_verified: true },
    payload: {
      id: 'msg_bad',
      conversationId: 'conv_a_p',
      senderId: 'intruder_uid',
      senderRole: 'customer',
      text: 'Intercepted',
      readByRecipient: false,
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Terminal State Bypass on Completed Booking',
    operation: 'update',
    path: 'bookings/bk_completed',
    auth: { uid: 'cust_1', email: 'c@example.com', email_verified: true },
    payload: { status: 'cancelled' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Backdated Client Timestamp Forgery',
    operation: 'create',
    path: 'serviceRequests/req_time_spoof',
    auth: { uid: 'cust_1', email: 'c@example.com', email_verified: true },
    payload: {
      id: 'req_time_spoof',
      customerId: 'cust_1',
      customerName: 'Arjun',
      categoryId: 'home-services',
      subcategoryId: 'electrician',
      title: 'Wiring fault',
      description: 'Spark near meter',
      district: 'Malappuram',
      town: 'Tirur',
      pincode: '676101',
      status: 'request_submitted',
      createdAt: '2020-01-01T00:00:00.000Z',
      updatedAt: '2020-01-01T00:00:00.000Z',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Review Creation with Non-Published Moderation Status or Foreign Booking',
    operation: 'create',
    path: 'reviews/rev_bad',
    auth: { uid: 'user_b', email: 'b@example.com', email_verified: true },
    payload: {
      id: 'rev_bad',
      bookingId: 'bk_belonging_to_user_a',
      providerId: 'prov_1',
      customerId: 'user_b',
      customerName: 'User B',
      rating: 1,
      comment: 'Fake review',
      serviceName: 'Electrical',
      moderatedStatus: 'hidden',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Unbounded / Non-String Array Poisoning on /favourites',
    operation: 'update',
    path: 'favourites/user_1',
    auth: { uid: 'user_1', email: 'u@example.com', email_verified: true },
    payload: {
      userId: 'user_1',
      providerIds: [12345],
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Unscoped Collection Scrape on /notifications',
    operation: 'list',
    path: 'notifications',
    auth: { uid: 'user_1', email: 'u@example.com', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
];

export async function runDirtyDozenChecks(
  evaluator: (testCase: DirtyDozenCase) => Promise<'ALLOW' | 'PERMISSION_DENIED'>
) {
  const results = [];
  for (const tc of DIRTY_DOZEN_PAYLOADS) {
    const outcome = await evaluator(tc);
    results.push({
      id: tc.id,
      name: tc.name,
      passed: outcome === tc.expected,
      outcome,
    });
  }
  return results;
}
