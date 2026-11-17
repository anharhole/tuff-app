# LocalConnect Firestore Security Specification (Phase 0)

## 1. Core Data Invariants
1. **Master Gate & PII Isolation**: `/users/{userId}` stores only minimal non-PII routing/preference fields (`id`, `name`, `role`, `activeMode`). All PII (`email`, `phone`, `district`, `town`, `locality`, `pincode`, `lat`, `lng`, `searchHistory`) lives strictly inside `/users/{userId}/private/{docId}` and is readable/writable ONLY by `isOwner(userId)` or `isAdmin()`.
2. **No Self-Assigned Privileges**: A user creating `/users/{userId}` may set `role` ONLY to `'customer'` or `'provider'` (never `'admin'`), and may never modify `role`, `isSuspended`, or `createdAt`.
3. **Strict Email Verification & Bootstrapped Admin**: Every write requires `request.auth != null && request.auth.token.email_verified == true`. `isAdmin()` checks `exists(/databases/$(database)/documents/admins/$(request.auth.uid))` OR `(request.auth.token.email == 'drakefc45678@gmail.com' && request.auth.token.email_verified == true)`.
4. **System/Admin-Controlled Provider Verification**: Providers can create/update their business listing fields (`bio`, `title`, `isAvailable`, `startingPrice`, etc.), but `identityVerified`, `skillVerified`, `profileVerified`, `isFeatured`, `rating`, `reviewCount`, and `completedJobs` are locked against self-escalation (`== false` / `== 0` on create, immutable by non-admins on update).
5. **Relational & Participant Integrity**:
   - Quotations require an existing parent `serviceRequests/{requestId}` and `providerUserId == request.auth.uid`.
   - Chat messages require an existing parent `conversations/{conversationId}` where `request.auth.uid` equals `customerId` or `providerUserId`.
   - Reviews require an existing completed `bookings/{bookingId}` where `customerId == request.auth.uid`.
6. **Terminal State Locking**: Once a `booking` reaches `'service_completed'` or `'cancelled'`, or a `serviceRequest` reaches `'service_completed'` or `'cancelled'`, or a `verificationRequest` reaches `'approved'`/`'rejected'`, or a `report` reaches `'resolved'`/`'dismissed'`, non-admin updates are blocked permanently.
7. **Strict Path & Payload Bounds**: Every document ID matches `^[a-zA-Z0-9_\-]+$` (`<= 128` chars), every string checks `.size()`, every array checks `.size() <= MAX` and validates element types when non-empty, and all `createdAt` / `updatedAt` timestamps equal `request.time`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Self-Privilege Escalation (Shadow Role)**: User creates `/users/uid1` with `role: "admin"`, `isSuspended: false`. -> Expected: `PERMISSION_DENIED`.
2. **Unverified Email Spoof**: Signed-in user with `email: "drakefc45678@gmail.com"` and `email_verified: false` reads `/users/other/private/info` or writes `/categories/test`. -> Expected: `PERMISSION_DENIED`.
3. **Ghost Field / Shadow Update**: Provider updates `/providers/prov1` with `{ "bio": "Updated", "identityVerified": true }`. -> Expected: `PERMISSION_DENIED`.
4. **Cross-Tenant PII Read**: Authenticated user B attempts `get` on `/users/userA/private/info` or `list` on `/userAddresses`. -> Expected: `PERMISSION_DENIED`.
5. **ID Poisoning / Path Traversal**: Client creates document with ID `"../../../../etc/passwd"` or 200-char string on `/serviceRequests/{requestId}`. -> Expected: `PERMISSION_DENIED`.
6. **Impersonated Request Ownership**: User B attempts `create` on `/serviceRequests/req9` with `customerId: "userA"`. -> Expected: `PERMISSION_DENIED`.
7. **Orphaned Message Injection**: User creates `/conversations/nonexistent/messages/m1` or sends message into a conversation they do not belong to. -> Expected: `PERMISSION_DENIED`.
8. **Terminal State Bypass**: Customer or provider attempts `update` on `/bookings/bk1` after `status == "service_completed"`. -> Expected: `PERMISSION_DENIED`.
9. **Client Timestamp Forgery**: Client creates `/serviceRequests/req2` with `createdAt` backdated to a string or client timestamp (`createdAt != request.time`). -> Expected: `PERMISSION_DENIED`.
10. **Fake Review Bombing / Moderation Tamper**: Customer submits `/reviews/rev9` with `rating: 5` and `moderatedStatus: "hidden"` or referencing another customer's `bookingId`. -> Expected: `PERMISSION_DENIED`.
11. **Unbounded Array / Resource Exhaustion**: User updates `/favourites/uid1` with `providerIds` containing > 100 items or an integer element `[123]`. -> Expected: `PERMISSION_DENIED`.
12. **Wildcard Scrape List Query**: User runs unscoped `list` on `/notifications` or `/reports` without matching `where('userId', '==', uid)` / `where('reporterId', '==', uid)`. -> Expected: `PERMISSION_DENIED`.
