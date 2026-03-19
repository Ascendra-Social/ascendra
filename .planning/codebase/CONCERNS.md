# Codebase Concerns

**Analysis Date:** 2026-03-18

## Tech Debt

**Race Conditions in Financial Operations:**
- Issue: Multiple financial operations (wallet updates, transaction creation) execute sequentially without transactional guarantees. Multiple concurrent requests can lead to double-spending, lost updates, and inconsistent state.
- Files: `base44/functions/processContentPurchase/entry.ts`, `base44/functions/processEngagementReward/entry.ts`, `base44/functions/completeMilestone/entry.ts`, `src/components/creator/TipButton.jsx`, `src/components/feed/BoostPostModal.jsx`
- Example: `base44/functions/processContentPurchase/entry.ts` line 45-47 reads wallet balance, then updates it. Another concurrent request could read the same balance before the first update, causing both to succeed with insufficient funds.
- Impact: Money can be transferred out of accounts that don't have sufficient balance; platform fees may not be collected; total system token count becomes inconsistent.
- Fix approach: Implement database-level locking, use Deno transactions if available, or implement application-level optimistic concurrency with retry logic. Add version numbers to wallet records.

**Wallet Balance Checks Without Locks:**
- Issue: All client-side and server-side balance checks follow the pattern: read balance → calculate → update. No locking mechanism exists.
- Files: `src/components/ads/CreateAdModal.jsx` line 49-51, `src/components/creator/DigitalProductsGrid.jsx`, `src/components/creator/SubscriptionTiers.jsx`, `src/components/appstore/AppDetailModal.jsx`
- Impact: Users can spend the same tokens multiple times in rapid succession (e.g., clicking tip button twice very fast).
- Fix approach: Implement pessimistic locking at database level or use queue-based transaction processing.

**Floating Point Arithmetic in Financial Calculations:**
- Issue: Platform fee percentage calculations use division: `(amount * 1) / 100`. With multiple transactions, rounding errors accumulate.
- Files: `base44/functions/processPlatformFee/entry.ts` line 17, `base44/functions/processEngagementReward/entry.ts` line 102, `base44/functions/processContentPurchase/entry.ts` line 41
- Impact: Platform and creator payouts may be off by fractions of tokens; audit logs won't balance.
- Fix approach: Use fixed-point arithmetic or handle fees in smallest unit (no decimals). Store both gross and net amounts in transactions.

## Security Considerations

**Unauthenticated Client Initialization:**
- Issue: Base44 client is created with `requiresAuth: false` in `src/api/base44Client.js` line 12.
- Files: `src/api/base44Client.js`
- Current mitigation: Auth context checks `base44.auth.me()` before operations.
- Recommendation: Verify that SDK properly enforces auth at each API call even if client-level auth is disabled. Add audit logging for all financial operations.

**Direct Wallet Balance Modifications Without Audit Trail:**
- Issue: Client-side code directly updates wallet balances via `TokenWallet.update()` without server-side validation or business rule enforcement.
- Files: `src/components/creator/TipButton.jsx` line 68-70, `src/components/feed/BoostPostModal.jsx` line 66-68, `src/components/ads/CreateAdModal.jsx`
- Current mitigation: Balance check happens before update.
- Recommendation: All wallet updates should go through dedicated server functions that validate business rules. Use smart contract or backend-only wallet operations.

**Insufficient Input Validation on Server Functions:**
- Issue: Server functions accept user input (contract_id, milestone_index, engagement_type) with minimal validation.
- Files: `base44/functions/processEngagementReward/entry.ts` line 50, `base44/functions/completeMilestone/entry.ts` line 35-37
- Impact: Invalid milestone indices could cause array access errors; missing validation on engagement_type allows crafted requests.
- Recommendation: Add comprehensive input validation with clear error responses for all parameters.

**Hardcoded Platform Wallet ID:**
- Issue: Platform wallet uses magic string 'platform' instead of system constant or secure identifier.
- Files: `base44/functions/processPlatformFee/entry.ts` line 4, `base44/functions/processEngagementReward/entry.ts` line 120
- Impact: Any user with knowledge of system structure could create records for the 'platform' user.
- Recommendation: Use environment-based configuration for system account identifiers; verify system role before accepting platform transactions.

**Missing Rate Limiting on Financial Operations:**
- Issue: No rate limiting on reward endpoints; users could spam engagement rewards in a loop with cooldown bypasses.
- Files: `base44/functions/processEngagementReward/entry.ts` line 66-86 implements cooldown but client-side can retry immediately.
- Impact: Contract budgets can be exhausted rapidly; abuse prevention relies on client-side enforcement.
- Recommendation: Implement server-side rate limiting per user per contract; queue engagement rewards for batch processing.

**Token Parameter Filtering Not Enforced in Frontend:**
- Issue: `TipButton.jsx` line 23 filters for specific token contract address, but this is client-side only. No server-side enforcement.
- Files: `src/components/creator/TipButton.jsx` line 21-24
- Impact: Server functions don't validate which token type is being transferred; users could tip with wrong token.
- Recommendation: Validate token_contract_address on server before processing transactions.

**Solana Wallet Integration - Phantom Detection:**
- Issue: `WalletConnectionModal.jsx` checks `window.solana.isPhantom` without error handling for missing window.solana.
- Files: `src/components/wallet/WalletConnectionModal.jsx`
- Impact: Could throw runtime error if Phantom wallet extension not installed.
- Recommendation: Add try-catch and graceful fallback messaging.

## Performance Bottlenecks

**N+1 Queries in Wallet Operations:**
- Problem: Each financial operation calls `TokenWallet.filter()` for user's wallet, then separately fetches creator wallet. On high volume, creates multiple DB queries per transaction.
- Files: `base44/functions/processContentPurchase/entry.ts` line 35-36, 50-52, 60-62, `base44/functions/processEngagementReward/entry.ts` line 90-92, 106, 119-120
- Cause: Sequential filter calls instead of batch fetching.
- Improvement path: Implement batch wallet lookup; cache wallet IDs during transaction processing; use `filterMultiple()` if available.

**Large Component Files Difficult to Test:**
- Problem: Component files exceed 600 lines, making them difficult to unit test and reason about.
- Files: `src/lib/VisualEditAgent.jsx` (647 lines), `src/components/ui/sidebar.jsx` (626 lines), `src/components/reels/ReelCard.jsx` (524 lines), `src/components/feed/PostCard.jsx` (469 lines)`
- Cause: Mixed concerns (UI logic, data fetching, complex state management) in single file.
- Improvement path: Extract data fetching to custom hooks; extract modal logic to separate components; split large forms into field-level components.

**Missing Query Invalidation Strategy:**
- Problem: React Query cache invalidation is reactive but not strategic. Multiple places call `invalidateQueries` with generic keys.
- Files: `src/components/feed/BoostPostModal.jsx` line 101-102 invalidates both 'wallet' and 'transactions' separately.
- Cause: No centralized cache invalidation strategy.
- Improvement path: Create cache invalidation service that ensures dependent queries refresh together; use query tags if available.

## Fragile Areas

**Milestone Array Mutation Without Deep Clone:**
- Files: `base44/functions/completeMilestone/entry.ts` line 78
- Why fragile: `milestoneConfig.milestones[milestone_index].completed = true` mutates nested object from database response. If response object is cached or reused, unexpected state changes occur.
- Safe modification: Clone the entire config before mutation: `const updated = JSON.parse(JSON.stringify(milestoneConfig)); updated.milestones[milestone_index].completed = true;`
- Test coverage: No unit tests visible for milestone completion logic.

**Sorting Smart Contract Payouts by Date:**
- Files: `base44/functions/processEngagementReward/entry.ts` line 74-75
- Why fragile: `recentPayouts.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))` assumes created_date exists and is valid ISO string. If field is missing or malformed, NaN comparison silently fails.
- Safe modification: Add null checks and use explicit comparisons: `const lastPayout = recentPayouts.filter(p => p.created_date).sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime())[0];`
- Test coverage: No visible test for cooldown edge cases.

**App Parameters Loading from URL Without Sanitization:**
- Files: `src/lib/app-params.js` line 14-21
- Why fragile: URL parameters are directly stored to localStorage and used in requests. No URL encoding validation.
- Safe modification: Sanitize and validate each URL parameter; use URLSearchParams built-in parsing; validate against expected format before storage.
- Test coverage: No tests visible for parameter loading.

**Error Handling in Auth Context:**
- Files: `src/lib/AuthContext.jsx` line 79-87 catches all errors in catch-all try-block
- Why fragile: Different error types (network, auth, permission) handled identically. Client can't distinguish between temporary network failure and permanent auth failure.
- Safe modification: Separate error handling by type; implement retry logic for network errors; handle auth errors differently.
- Test coverage: No visible tests for auth context error scenarios.

## Known Bugs

**Window Object Access in SSR Context:**
- Symptoms: `app-params.js` line 9 checks `typeof window === 'undefined'` but then line 14 still accesses `window.location.search` outside the check.
- Files: `src/lib/app-params.js` line 46 accesses `window.location.href` in `getAppParams()` which is called on line 53 regardless of SSR.
- Trigger: Running code in non-browser environment or with window mocked.
- Workaround: App only runs in browser, so this is latent but not currently exposed.

**Wallet Balance Display Staleness:**
- Symptoms: User sends tip, toast shows success, but wallet balance UI doesn't update immediately or shows old balance.
- Files: `src/components/creator/TipButton.jsx` line 100 invalidates 'wallet' query key, but key is ['wallet', currentUserId] and may not match all instances.
- Trigger: Send tip, check wallet display simultaneously.
- Workaround: Refresh page manually.

## Test Coverage Gaps

**No Tests for Financial Transaction Flows:**
- What's not tested: Complete end-to-end flows for tips, content purchases, engagement rewards, platform fees. Missing tests for concurrent transaction handling, insufficient balance scenarios, and fee calculations.
- Files: `base44/functions/processContentPurchase/entry.ts`, `base44/functions/processEngagementReward/entry.ts`, `base44/functions/completeMilestone/entry.ts`, `base44/functions/processRoyaltyDistribution/entry.ts`
- Risk: Edge cases in financial logic (negative balances, rounding errors, race conditions) go undetected until production.
- Priority: **High** - Financial operations are business-critical.

**No Tests for Auth Context State Management:**
- What's not tested: Auth state transitions, error recovery, concurrent auth checks, logout flow, token refresh logic.
- Files: `src/lib/AuthContext.jsx`
- Risk: Auth state can become corrupted; users may remain logged in after logout.
- Priority: **High** - Auth failures impact all features.

**No Tests for Wallet Provider and Solana Integration:**
- What's not tested: Wallet connection flow, Phantom adapter initialization, connection errors, account switching.
- Files: `src/components/wallet/WalletProvider.jsx`, `src/components/wallet/WalletConnectionModal.jsx`
- Risk: Users can't connect wallets without manual testing; Solana blockchain failures not caught.
- Priority: **Medium** - Affects user onboarding.

**Component-Level Integration Tests Missing:**
- What's not tested: BoostPostModal, TipButton, CreateAdModal interactions with API and state.
- Files: `src/components/feed/BoostPostModal.jsx`, `src/components/creator/TipButton.jsx`, `src/components/ads/CreateAdModal.jsx`
- Risk: Component bugs only caught during manual testing.
- Priority: **Medium** - Affects all user interactions.

## Missing Critical Features

**Transaction Rollback/Reversal:**
- Problem: Once a transaction completes, there's no mechanism to reverse it if something goes wrong downstream. If a purchase fails after wallet deduction, user loses tokens.
- Blocks: Users cannot recover from failed transactions; chargebacks/refunds not possible.

**Audit Logging:**
- Problem: No centralized audit trail for financial operations. Can't trace who did what, when, or why.
- Blocks: Compliance, fraud investigation, debugging production issues.

**Smart Contract Integration Testing:**
- Problem: Smart contract payout records are created but no visibility into actual blockchain state.
- Blocks: Can't verify tokens actually transferred on-chain; potential for state mismatch.

---

*Concerns audit: 2026-03-18*
