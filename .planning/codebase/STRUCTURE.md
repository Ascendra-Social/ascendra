# Codebase Structure

**Analysis Date:** 2026-03-18

## Directory Layout

```
/Users/serhii_kucherenko/Documents/work/freelance/ascendra/
├── .planning/               # Planning and documentation (generated)
│   └── codebase/           # Codebase analysis docs
├── base44/                 # Serverless functions (Deno)
│   └── functions/          # Backend transaction/event handlers
├── src/                    # Frontend source
│   ├── pages/              # Route-mapped page components (22 pages)
│   ├── components/         # Feature and UI components (101+ components)
│   ├── lib/                # Core context, utilities, configuration
│   ├── api/                # SDK client and entity proxies
│   ├── hooks/              # React hooks (custom hooks)
│   ├── utils/              # Helper functions and utilities
│   ├── assets/             # Static assets (images, SVGs)
│   ├── App.jsx             # Root app component with routing
│   ├── Layout.jsx          # Global layout wrapper (nav, menu)
│   ├── main.jsx            # React DOM entry point
│   ├── index.css           # Global styles
│   └── pages.config.js     # Page routing auto-configuration
├── public/                 # Static files served as-is
├── node_modules/           # Dependencies (npm)
├── .git/                   # Git repository
├── .planning/              # GSD planning docs
├── package.json            # Node dependencies and scripts
├── jsconfig.json           # JavaScript path aliases and config
├── tsconfig.json           # TypeScript config (for checkJs)
├── vite.config.js          # Vite build configuration
├── eslint.config.js        # ESLint rules
├── tailwind.config.js      # TailwindCSS configuration
├── postcss.config.js       # PostCSS plugins
├── index.html              # HTML entry template
├── components.json         # shadcn/ui component registry
└── README.md               # Project overview
```

## Directory Purposes

**`.planning/`:**
- Purpose: GSD (GitStartDev) orchestration and planning docs
- Contains: Codebase analysis (ARCHITECTURE.md, STRUCTURE.md, etc.)
- Key files: `.planning/codebase/`

**`base44/functions/`:**
- Purpose: Serverless backend functions (Deno runtime) for critical operations
- Contains: Payment processing, reward calculations, smart contract interactions
- Key files:
  - `processContentPurchase/entry.ts`: Handles premium content purchases, wallet deductions, creator payments, platform fees
  - `processEngagementReward/entry.ts`: Allocates rewards for likes, comments, shares
  - `processRoyaltyDistribution/entry.ts`: Distributes revenue from marketplace sales
  - `processPlatformFee/entry.ts`: Collects and manages platform fees
  - `completeMilestone/entry.ts`: Completes smart contract milestones, triggers payouts

**`src/pages/`:**
- Purpose: Route-mapped page components (one per route)
- Contains: 22 full-page views for major features
- Key files:
  - `Home.jsx`: Main feed (For You, Trending, Following tabs)
  - `CreatorDashboard.jsx`: Creator analytics, tier/product management
  - `Wallet.jsx`: Token balance, transaction history, Solana integration
  - `Marketplace.jsx`: Buy/sell listings
  - `Communities.jsx`: Community list and discovery
  - `CommunityDetail.jsx`: Community feed and member management
  - `Messages.jsx`: Direct messaging interface
  - `SmartContracts.jsx`: Smart contract creation and management
  - `Profile.jsx`: User profile, followers/following
  - `VerificationReview.jsx`: Admin verification queue
  - Other pages: AppStore, FeatureRequests, Reels, Onboarding, Moderation, etc.

**`src/components/`:**
- Purpose: Reusable and feature-specific UI components
- Contains: 101+ React components organized by feature
- Subdirectories:
  - `ui/`: Radix UI primitives (Button, Card, Dialog, Input, etc.) - 50+ components
  - `feed/`: Post display, comments, trending reels (PostCard, CommentsSection, TrendingReelsStrip)
  - `creator/`: Creator-specific UI (SubscriptionTiers, DigitalProductsGrid, TipButton)
  - `wallet/`: Token balance, transactions, Solana integration (TokenBalance, SendTokensModal, WalletConnectionModal)
  - `marketplace/`: Listing creation, browsing (CreateListingModal, ListingCard)
  - `messages/`: Direct messaging (MessageThread, ChatInput)
  - `community/`: Community features (CommunityCard, MemberList)
  - `ads/`: Advertisement creation and analytics (CreateAdModal, AdAnalytics, AdvancedTargeting)
  - `smartcontracts/`: Contract creation and management
  - `monetization/`: Paywall, subscription, tipping flows
  - `create/`: Post, reel, listing creation UI (CreateModal)
  - `ai/`: AI assistant features (AIFloatingButton, AIAssistantModal)
  - `verification/`: User verification workflow
  - `moderation/`: Content reporting, flagging
  - `notifications/`: Notification display (NotificationBell)
  - `onboarding/`: User signup/setup flow
  - `appstore/`: App discovery and installation
  - `reels/`: Short-form video display
  - `features/`: Feature request browsing

**`src/lib/`:**
- Purpose: Core app logic, context, configuration, utilities
- Contains: Authentication, query client, app parameters, navigation tracking
- Key files:
  - `AuthContext.jsx`: User authentication and app public settings provider
  - `query-client.js`: @tanstack/react-query configuration
  - `app-params.js`: URL and localStorage parameter resolution
  - `NavigationTracker.jsx`: Analytics/tracking for page visits
  - `VisualEditAgent.jsx`: Base44 visual editing system
  - `PageNotFound.jsx`: 404 fallback component
  - `utils.js`: Helper functions (createPageUrl)

**`src/api/`:**
- Purpose: Base44 SDK client and entity access
- Contains: SDK initialization, entity proxies
- Key files:
  - `base44Client.js`: SDK singleton with appId, serverUrl, token, functionsVersion
  - `entities.js`: Entity proxy exports (Post, User, Comment, etc.)
  - `integrations.js`: External service integrations

**`src/hooks/`:**
- Purpose: Custom React hooks
- Key files:
  - `use-mobile.jsx`: Mobile screen breakpoint detection

**`src/utils/`:**
- Purpose: Shared utility functions
- Key files:
  - `index.ts`: createPageUrl utility for route linking

**`src/assets/`:**
- Purpose: Static images and media
- Contains: SVGs, logos, placeholder images
- Key files: `react.svg`

**`src/`:**
- Purpose: Top-level source directory
- Key files:
  - `App.jsx`: Root component with providers, routing, global components
  - `Layout.jsx`: Global layout wrapper with navigation
  - `main.jsx`: React DOM entry point
  - `index.css`: Global styles (TailwindCSS imports)

## Key File Locations

**Entry Points:**
- `index.html`: HTML template, loads React app
- `src/main.jsx`: Vite entry point, mounts React to DOM
- `src/App.jsx`: React root, sets up providers and routing
- `src/pages.config.js`: Route configuration (auto-generated)

**Configuration:**
- `package.json`: Dependencies, scripts (dev, build, lint)
- `vite.config.js`: Vite config with Base44 vite plugin and React plugin
- `jsconfig.json`: Path aliases (`@/*` → `./src/*`), JSX settings
- `tsconfig.json`: TypeScript config (checkJs enabled), includes pages/** and components/**
- `tailwind.config.js`: TailwindCSS theming (dark mode, gradient colors)
- `postcss.config.js`: PostCSS for Tailwind processing
- `eslint.config.js`: ESLint rules for code quality
- `components.json`: shadcn/ui component registry

**Core Logic:**
- `src/api/base44Client.js`: SDK client configuration
- `src/lib/AuthContext.jsx`: Authentication provider
- `src/lib/app-params.js`: App configuration resolution
- `src/Layout.jsx`: Global navigation and layout

**Testing:**
- No test files found; testing structure not deployed

## Naming Conventions

**Files:**
- PascalCase for React components (e.g., `PostCard.jsx`, `CreateModal.jsx`)
- camelCase for utilities and hooks (e.g., `query-client.js`, `use-mobile.jsx`)
- SCREAMING_SNAKE_CASE for constants (e.g., `ASCENDRA_TOKEN_MINT`)
- lowercase hyphenated for config files (e.g., `tailwind.config.js`)

**Directories:**
- camelCase or kebab-case for feature directories (e.g., `smartcontracts/`, `feed/`)
- Prefer descriptive names matching feature names (e.g., `wallet/` for wallet features)

**Functions:**
- camelCase for all functions (e.g., `createPageUrl`, `checkAppState`, `loadUser`)
- Verb-first naming convention (e.g., `handleClick`, `fetchPosts`, `createListing`)

**Variables:**
- camelCase for all variables (e.g., `isAuthenticated`, `queryKey`, `userName`)
- Boolean prefixes: `is`, `has`, `show`, `should` (e.g., `isLoading`, `hasError`, `showModal`)

**Types/Classes:**
- PascalCase (e.g., `User`, `Post`, `CreatorTier`)
- Used implicitly via Base44 SDK entity names

**Constants:**
- SCREAMING_SNAKE_CASE in component scope (e.g., `ASCENDRA_TOKEN_MINT`, `MODES`)
- camelCase for exported config objects (e.g., `queryClientInstance`, `appParams`)

## Where to Add New Code

**New Page/Feature:**
1. Create page file: `src/pages/[FeatureName].jsx`
2. Export default component: `export default function FeatureName() { ... }`
3. `pages.config.js` auto-registers it (regenerates on Vite startup)
4. Page available at route: `/:FeatureName`

**New Feature Component:**
1. Create component directory: `src/components/[feature]/[ComponentName].jsx`
2. If reusable across features, place in feature-agnostic directory
3. Import in page or other components as needed
4. Example: `src/components/feed/NewPostComponent.jsx`

**New UI Component (Radix-based):**
1. Use shadcn/ui CLI: `npx shadcn-ui@latest add [component-name]`
2. Generated in: `src/components/ui/[component-name].jsx`
3. Import in feature components as: `import { Button } from "@/components/ui/button"`

**New Utility/Helper:**
1. Add to `src/utils/index.ts` (if shared)
2. Or create `src/utils/[category].ts` for grouped utilities
3. Import in components as: `import { functionName } from "@/utils"`

**New Hook:**
1. Create: `src/hooks/use-[name].jsx`
2. Export custom hook function
3. Use in components with `const value = useCustom()`

**New Serverless Function:**
1. Create directory: `base44/functions/[FunctionName]/`
2. Add `entry.ts` file with Deno.serve() handler
3. Import Base44 SDK: `import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6'`
4. Called from client via Base44 function invocation

**New API Integration:**
1. Add to `src/api/integrations.js`
2. Export client or methods
3. Import in components as needed
4. Example: Stripe client for payment processing

## Special Directories

**`.planning/`:**
- Purpose: GSD analysis and planning output
- Generated: True (auto-generated by GSD commands)
- Committed: Yes (contains planning docs)
- Contains: Codebase analysis (ARCHITECTURE.md, STRUCTURE.md, TESTING.md, etc.)

**`node_modules/`:**
- Purpose: npm installed dependencies
- Generated: True (installed from package-lock.json)
- Committed: No (.gitignore excludes)
- Size: ~500MB+

**`dist/` (not shown, created on build):**
- Purpose: Production build output
- Generated: True (vite build)
- Committed: No (.gitignore excludes)
- Entry: `dist/index.html` after build

**`base44/functions/`:**
- Purpose: Serverless Deno functions deployed to Base44 platform
- Generated: False (hand-written)
- Committed: Yes
- Runtime: Deno (not Node.js)
- Execution: Server-side, triggered by client or backend events

**`public/`:**
- Purpose: Static files served as-is by Vite
- Generated: False (hand-written)
- Committed: Yes
- Usage: SVGs, fonts, manifest, robots.txt

---

*Structure analysis: 2026-03-18*
