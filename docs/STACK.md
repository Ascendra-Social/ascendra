# Technology Stack

**Analysis Date:** 2026-03-18

## Languages

**Primary:**
- JavaScript - Frontend application logic and components
- JSX - React component syntax for UI
- CSS - Styling with Tailwind CSS

**Secondary:**
- JSON - Configuration files

## Runtime

**Environment:**
- Node.js (ES2022+ support implied by build configuration)

**Package Manager:**
- npm (inferred from package.json structure)
- Lockfile: Not present in scanned files (likely `package-lock.json` exists)

## Frameworks

**Core:**
- React 18.2.0 - UI library and component framework
- React DOM 18.2.0 - DOM rendering for React
- React Router DOM 6.26.0 - Client-side routing

**UI Components:**
- Radix UI (25+ primitive components) - Unstyled, accessible component library for dropdowns, dialogs, buttons, navigation, forms, etc.
- Lucide React 0.475.0 - Icon library

**State Management & Data:**
- TanStack React Query 5.84.1 - Server state management and caching
- React Hook Form 7.54.2 - Form state management
- Zod 3.24.2 - TypeScript-first schema validation

**Styling:**
- Tailwind CSS 3.4.17 - Utility-first CSS framework
- Tailwind Merge 3.0.2 - Merge Tailwind class conflicts
- Tailwindcss Animate 1.0.7 - Animation utilities
- PostCSS 8.5.3 - CSS transformation tool
- Autoprefixer 10.4.20 - Vendor prefix management

**Animation & Graphics:**
- Framer Motion 11.16.4 - React animation library
- Three.js 0.171.0 - 3D graphics library
- Canvas Confetti 1.9.4 - Confetti animation effects
- Embla Carousel React 8.5.2 - Carousel/slider component

**Forms & Input:**
- @hookform/resolvers 4.1.2 - Form validation resolvers
- Input OTP 1.4.2 - OTP input component
- React Day Picker 8.10.1 - Date picker component
- CMDk 1.0.0 - Command palette/menu component

**Rich Content & Export:**
- React Markdown 9.0.1 - Markdown rendering
- React Quill 2.0.0 - Rich text editor
- jsPDF 2.5.2 - PDF generation
- html2canvas 1.4.1 - HTML to canvas conversion
- React Leaflet 4.2.1 - Interactive maps
- Recharts 2.15.4 - Data visualization library

**Utilities:**
- Lodash 4.17.21 - Utility functions library
- Moment 2.30.1 - Date manipulation (deprecated, use date-fns)
- Date-fns 3.6.0 - Modern date utility library
- Class Variance Authority 0.7.1 - CSS class variance management
- CLSX 2.1.1 - Conditional className utility
- Sonner 2.0.1 - Toast notification library
- React Hot Toast 2.6.0 - Toast notifications
- Vaul 1.1.2 - Drawer component
- Next Themes 0.4.4 - Theme management
- React Resizable Panels 2.1.7 - Resizable layout panels
- @hello-pangea/dnd 17.0.0 - Drag and drop library

**Blockchain/Crypto:**
- @solana/web3.js 1.87.6 - Solana blockchain SDK
- @solana/wallet-adapter-react 0.15.35 - React wallet adapter
- @solana/wallet-adapter-wallets 0.19.32 - Wallet implementations (Phantom, etc.)
- @solana/wallet-adapter-react-ui 0.9.35 - React UI for wallet adapter
- @stripe/react-stripe-js 3.0.0 - Stripe React integration
- @stripe/stripe-js 5.2.0 - Stripe JavaScript SDK

**Build & Development:**
- Vite 6.1.0 - Fast build tool and dev server
- @vitejs/plugin-react 4.3.4 - React plugin for Vite
- @base44/vite-plugin 1.0.0 - Custom Base44 Vite plugin
- ESLint 9.19.0 - Linting
- @eslint/js 9.19.0 - ESLint JavaScript rules
- ESLint Plugin React 7.37.4 - React linting rules
- ESLint Plugin React Hooks 5.0.0 - React hooks linting
- ESLint Plugin Unused Imports 4.3.0 - Unused import detection
- TypeScript 5.8.2 - Type checking (used via jsconfig.json)
- Globals 15.14.0 - Global variable definitions

**Base44 Integration:**
- @base44/sdk 0.8.0 - Custom backend SDK for entity queries, integrations, authentication
- baseline-browser-mapping 2.8.32 - Browser mapping utility

## Configuration

**Environment:**
- Configuration via `import.meta.env.VITE_*` environment variables
- Required environment variables:
  - `VITE_BASE44_APP_ID` - Application identifier
  - `VITE_BASE44_BACKEND_URL` - Backend server URL
  - `VITE_BASE44_FUNCTIONS_VERSION` - Functions API version
- Runtime parameters also configurable via URL search params (`?app_id=...&server_url=...&access_token=...`)
- Local storage used for persistence: `base44_access_token`, `base44_app_id`, `base44_server_url`, `base44_functions_version`

**Build:**
- `vite.config.js` - Vite configuration with React and Base44 plugins
- `jsconfig.json` - JavaScript/JSX configuration with path aliases (`@/*` → `./src/*`)
- `tailwind.config.js` - Tailwind CSS customization with extended colors, animations, dark mode support
- `postcss.config.js` - PostCSS plugin configuration (Tailwind + Autoprefixer)
- `eslint.config.js` - ESLint configuration for React components

## Platform Requirements

**Development:**
- Node.js runtime with ES2022+ support
- npm package manager

**Production:**
- Modern browser with ES2022 JavaScript support
- Solana mainnet RPC endpoint (for wallet functionality)
- Base44 backend server (configured via environment)

---

*Stack analysis: 2026-03-18*
