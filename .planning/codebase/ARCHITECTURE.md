# Architecture

**Analysis Date:** 2026-03-18

## Pattern Overview

**Overall:** Multi-layered React SPA with Base44 SDK-powered backend, Vite build, React Router client-side routing, and serverless functions for payments/transactions.

**Key Characteristics:**
- Client-side routing with React Router (no server-side rendering)
- Centralized state management via React Context (Auth, Query Client)
- SDK-first data model via @base44/sdk entities
- Serverless functions (Deno) in `base44/functions/` for critical transactions
- Real-time data sync via @tanstack/react-query
- Blockchain integration (Solana mainnet-beta) for token transactions

## Layers

**Presentation Layer:**
- Purpose: UI components and page-level views, theme management, responsive layouts
- Location: `src/pages/`, `src/components/`
- Contains: Page components (22 pages), feature-specific components, Radix UI components
- Depends on: API layer, Auth context, React Router, TailwindCSS
- Used by: Browser, user interactions

**Business Logic / Feature Layer:**
- Purpose: Feature-specific components, hooks for data mutations, client-side filtering/sorting
- Location: `src/components/[feature]/` (e.g., `feed/`, `marketplace/`, `wallet/`, `creator/`)
- Contains: Feature components like `PostCard`, `CreateModal`, `TipButton`, market logic
- Depends on: API layer, Presentation components, utilities
- Used by: Pages and other feature components

**Data/API Layer:**
- Purpose: SDK client initialization, entity access, server communication
- Location: `src/api/` (`base44Client.js`, `entities.js`, `integrations.js`)
- Contains: Base44 SDK client, entity proxies, query configuration
- Depends on: @base44/sdk, @tanstack/react-query
- Used by: All feature components, pages

**Authentication/Context Layer:**
- Purpose: User session management, auth state, public app settings
- Location: `src/lib/AuthContext.jsx`, `src/lib/app-params.js`
- Contains: AuthProvider, auth hooks, app configuration from URL/env
- Depends on: Base44 SDK, Axios client
- Used by: App root, all authenticated pages

**Infrastructure/Utilities:**
- Purpose: Helpers, theming, navigation tracking, request interception
- Location: `src/lib/`, `src/utils/`
- Contains: Query client config, page URL builder, visual edit agent, navigation tracker
- Depends on: React, React Router, @tanstack/react-query
- Used by: All layers

**Serverless Functions:**
- Purpose: Critical payment, transaction, and milestone processing
- Location: `base44/functions/[function]/entry.ts`
- Contains: `processContentPurchase`, `processEngagementReward`, `processPlatformFee`, `processRoyaltyDistribution`, `completeMilestone`
- Depends on: @base44/sdk (Deno runtime)
- Used by: Client-side pages and smart contract integrations

**Layout/Navigation:**
- Purpose: Global navigation chrome, user status display, mobile menu
- Location: `src/Layout.jsx`
- Contains: Sidebar/mobile navigation, notification bell, create button, AI assistant button
- Depends on: All pages, user context, API
- Used by: App root wrapper

## Data Flow

**Authentication Flow:**

1. `src/main.jsx` → renders `App.jsx`
2. `App.jsx` wraps app in `AuthProvider`
3. `AuthProvider.checkAppState()` calls Base44 SDK to load app public settings
4. If auth token exists (from URL or localStorage), calls `checkUserAuth()`
5. `AuthContext` sets `isAuthenticated`, `user`, `appPublicSettings`, `authError` state
6. Pages access auth state via `useAuth()` hook or check `currentUser` via `base44.auth.me()`

**Data Query Flow:**

1. Page component (e.g., `src/pages/Home.jsx`) mounts
2. Calls `useQuery()` from `@tanstack/react-query`
3. Query function calls `base44.entities.[EntityType].filter()` with filters
4. SDK fetches from Base44 backend
5. Data cached in `queryClientInstance` (`src/lib/query-client.js`)
6. Component re-renders with data
7. Mutations via `useMutation()` (CREATE, UPDATE, DELETE)

**Payment/Transaction Flow:**

1. User initiates purchase (premium content, subscription, digital product)
2. Frontend calls serverless function in `base44/functions/processContentPurchase/entry.ts`
3. Function:
   - Authenticates user via `createClientFromRequest(req)`
   - Checks balance, content availability
   - Updates wallet balances (buyer, creator, platform)
   - Creates `ContentPurchase`, `TokenTransaction`, `SmartContractPayout` records
   - Returns success/error
4. Client receives response, shows toast, updates local cache

**Blockchain Integration Flow:**

1. User connects Phantom wallet via `WalletProvider` (Solana mainnet-beta)
2. On token operation (send, transfer), queries token account balance
3. Uses token mint: `ATF7deyT7FdS7GHip1Btv8t6Mj9vhsfzffoMZhE2vvwR`
4. Solana web3.js creates and signs transactions
5. Balance synced between app wallet and on-chain account

**Page Routing Flow:**

1. Router wraps app (`src/App.jsx` line 76)
2. `pages.config.js` (auto-generated) imports all pages from `src/pages/`
3. App creates routes dynamically from `PAGES` object
4. `/` → `mainPage` (currently `Home`)
5. `/:pageName` → corresponding page component
6. Layout wrapper injects navigation chrome around each page

**State Management Flow:**

1. Global: `AuthContext` (auth state, user), `queryClientInstance` (cached queries)
2. Feature-level: Component state via `useState()`
3. UI state: Modals, filters, pagination via component state
4. No Redux/Zustand; Context + React Query sufficient for this architecture

## Key Abstractions

**Base44Client:**
- Purpose: Centralized SDK initialization and configuration
- Location: `src/api/base44Client.js`
- Pattern: Singleton client wrapping `@base44/sdk`
- Used by: All API calls, entities proxy

**Entity Proxy:**
- Purpose: Typed access to database entities
- Example: `base44.entities.Post.filter()`, `base44.entities.User.update()`
- Pattern: SDK entity methods (filter, create, update, delete)
- Used by: All data operations in components and functions

**Query Client:**
- Purpose: Centralized React Query configuration
- Location: `src/lib/query-client.js`
- Pattern: Singleton `QueryClient` with default options (refetchOnWindowFocus: false, retry: 1)
- Used by: All `useQuery()` and `useMutation()` calls

**Auth Context:**
- Purpose: Global auth state and user session
- Location: `src/lib/AuthContext.jsx`
- Pattern: React Context provider with `checkAppState()`, `checkUserAuth()` methods
- Used by: App root, pages, components via `useAuth()` hook

**Feature Components:**
- Purpose: Encapsulated feature UI with local state and queries
- Examples: `src/components/feed/PostCard.jsx`, `src/components/marketplace/CreateListingModal.jsx`
- Pattern: Functional component with `useState()`, `useQuery()`, `useMutation()`
- Used by: Pages and other components

**Page Components:**
- Purpose: Route-mapped full-page views
- Location: `src/pages/[PageName].jsx`
- Pattern: Functional component with layout and feature components
- Used by: React Router

## Entry Points

**Browser Entry:**
- Location: `index.html`
- Triggers: Page load
- Responsibilities: Loads React DOM root, imports `src/main.jsx`

**App Root:**
- Location: `src/main.jsx`
- Triggers: Vite dev server, build output
- Responsibilities: Renders `App` component to DOM root, handles HMR

**App Component:**
- Location: `src/App.jsx`
- Triggers: Main JSX entry point
- Responsibilities: Wraps app in providers (Auth, QueryClient, WalletProvider, Router), sets up route rendering, injects global components (Toaster, VisualEditAgent)

**Layout Wrapper:**
- Location: `src/Layout.jsx`
- Triggers: Every route (via `LayoutWrapper` in App.jsx)
- Responsibilities: Renders navigation sidebar, mobile menu, user context, notification bell, create button

**Pages (22 routes):**
- Location: `src/pages/[PageName].jsx`
- Examples: `Home.jsx`, `CreatorDashboard.jsx`, `Wallet.jsx`, `Marketplace.jsx`
- Triggers: Route match (e.g., `/Home`, `/CreatorDashboard`)
- Responsibilities: Feature-specific logic, data loading, component orchestration

**Serverless Functions:**
- Location: `base44/functions/[FunctionName]/entry.ts`
- Examples: `processContentPurchase`, `processEngagementReward`, `completeMilestone`
- Triggers: Client-side calls or backend events
- Responsibilities: Critical transactions, wallet updates, smart contract interactions, record creation

## Error Handling

**Strategy:** Layered error handling with UI feedback via `toast` (Sonner) and graceful fallbacks.

**Patterns:**

- **Auth Errors:** `AuthContext` catches 403 errors, identifies error type (auth_required, user_not_registered), sets `authError` state, shows `UserNotRegisteredError` component or redirects to login
- **Data Fetch Errors:** `useQuery` retries once (default), shows skeleton while loading, page handles empty states gracefully
- **Mutation Errors:** `useMutation` returns error, component catches and calls `toast.error()` with message
- **Serverless Errors:** Function returns error JSON with status code, client validates response and shows toast
- **Blockchain Errors:** Catch Solana transaction failures, show user-friendly message, allow retry
- **Type Errors:** tsconfig checkJs enabled, catches undefined entity references

**Cross-Cutting Concerns:**

**Logging:**
- `console.log()` for debug info (auth state, user load, queries)
- `console.error()` for exceptions
- No structured logging framework deployed

**Validation:**
- Zod schemas not yet deployed; form validation via react-hook-form + manual checks
- SDK validates entity creation/update payloads server-side
- Frontend client-side URL/parameter validation in `app-params.js`

**Authentication:**
- Token-based via Base44 SDK (`base44.auth.me()`, `base44.auth.redirectToLogin()`)
- Token sourced from URL query param or localStorage
- Checked on app load and page transitions
- Public settings check before user auth to handle permission modes

---

*Architecture analysis: 2026-03-18*
