# External Integrations

**Analysis Date:** 2026-03-18

## APIs & External Services

**Base44 Platform:**
- Base44 SDK (`@base44/sdk` v0.8.0) - Primary backend integration
  - SDK Client: `src/api/base44Client.js`
  - Auth: Token-based (via `VITE_BASE44_BACKEND_URL` and `VITE_BASE44_APP_ID`)
  - Provides: Entity queries, integrations access, authentication management
  - Auth flow: `src/lib/AuthContext.jsx` - Implements Base44 auth with app public settings check

**Core Integrations (via Base44):**
- InvokeLLM - Large language model invocation
- SendEmail - Email delivery service
- SendSMS - SMS delivery service
- UploadFile - File upload handling
- GenerateImage - Image generation
- ExtractDataFromUploadedFile - Document/image data extraction
- All exposed through `src/api/integrations.js`

**Stripe (Payment Processing):**
- SDK/Client: `@stripe/stripe-js` v5.2.0, `@stripe/react-stripe-js` v3.0.0
- Auth: API key embedded in Stripe SDK initialization (not found in scanned files; likely in environment)
- Purpose: Payment processing, billing integration
- No active usage files found in current scan - integration available but may be in development

## Data Storage

**Databases:**
- Base44 Backend ORM - All data persistence via Base44 SDK
  - Client: `@base44/sdk` createClient
  - Connection: Configured via `VITE_BASE44_BACKEND_URL`
  - Query interface: `src/api/entities.js` exports `Query` from `base44.entities`

**Client-Side Storage:**
- Browser localStorage - Persistent storage for:
  - `base44_access_token` - Authentication token
  - `base44_app_id` - Application ID
  - `base44_server_url` - Backend URL
  - `base44_functions_version` - Functions version
  - Implementation: `src/lib/app-params.js`

**File Storage:**
- UploadFile integration for file uploads (backend-managed)
- HTML export capability via html2canvas + jsPDF for client-side generation

**Caching:**
- TanStack React Query with default options:
  - Query refetch disabled on window focus
  - Single retry on failure
  - Configuration: `src/lib/query-client.js`

## Authentication & Identity

**Auth Provider:**
- Base44 Custom Authentication
  - Implementation: `src/lib/AuthContext.jsx` - AuthProvider component
  - User object: `base44.auth.me()`
  - Logout: `base44.auth.logout()`
  - Login redirect: `base44.auth.redirectToLogin()`
  - Flow: Checks app public settings, then user authentication
  - Error handling: Distinguishes auth_required, user_not_registered, and other errors

**Wallet Authentication:**
- Solana Wallet Adapter
  - Providers: `@solana/wallet-adapter-react` v0.15.35
  - Supported wallets: `@solana/wallet-adapter-wallets` v0.19.32
  - UI: `@solana/wallet-adapter-react-ui` v0.9.35
  - Implementation: `src/components/wallet/WalletProvider.jsx`
  - Connected to: Solana mainnet-beta cluster
  - Wallet: Phantom Wallet (configured)
  - Purpose: Blockchain transaction signing, token balance queries

## Monitoring & Observability

**Error Tracking:**
- Not detected - No Sentry, Rollbar, or similar integration

**Logs:**
- Console logging only
- Base64 app params checks use console.error for debugging

## CI/CD & Deployment

**Hosting:**
- Not detected in codebase (likely managed external to source code)

**CI Pipeline:**
- Not detected - No GitHub Actions, GitLab CI, or similar configuration files found

## Environment Configuration

**Required env vars:**
- `VITE_BASE44_APP_ID` - Base44 application identifier
- `VITE_BASE44_BACKEND_URL` - Base44 backend server URL
- `VITE_BASE44_FUNCTIONS_VERSION` - Serverless functions version string

**Optional/Configurable via URL params:**
- `?app_id=...` - Override app ID
- `?server_url=...` - Override backend URL
- `?access_token=...` - Pass authentication token (removed from URL after reading)
- `?functions_version=...` - Override functions version
- `?clear_access_token=true` - Clear stored token on load
- `?from_url=...` - Redirect source URL

**Secrets location:**
- Environment variables (Vite VITE_* pattern)
- Stripe API key: Not found in scanned files (likely environment variable)

## Webhooks & Callbacks

**Incoming:**
- Not detected

**Outgoing:**
- Not detected - Integrations are SDK-based pull model, not webhook-based

## Blockchain Integration

**Solana Network:**
- Network: mainnet-beta (production Solana network)
- RPC endpoint: Default via `clusterApiUrl('mainnet-beta')`
- Token tracked: Ascendra token (mint: `ATF7deyT7FdS7GHip1Btv8t6Mj9vhsfzffoMZhE2vvwR`)
- Operations:
  - Token balance queries: `src/pages/Wallet.jsx` line 78-100
  - Token account enumeration via TOKEN_PROGRAM_ID
  - Implementation uses PublicKey parsing and parsed token account queries
- Wallet connection: Full integration in WalletProvider for transaction signing

---

*Integration audit: 2026-03-18*
