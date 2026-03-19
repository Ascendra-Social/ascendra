# Coding Conventions

**Analysis Date:** 2026-03-18

## Naming Patterns

**Files:**
- React Components: PascalCase (e.g., `AdCard.jsx`, `TipButton.jsx`, `Profile.jsx`)
- Utility/library files: camelCase (e.g., `query-client.js`, `app-params.js`, `utils.js`)
- TypeScript functions: camelCase (e.g., `createPageUrl`, `processContentPurchase`)
- Pages: PascalCase (e.g., `Profile.jsx`, `Marketplace.jsx`, `ListingDetail.jsx`)
- Directories: kebab-case or descriptive names (e.g., `src/components/ads`, `src/components/creator`, `src/lib`)

**Functions:**
- camelCase for function names across all files
- Arrow functions and regular function declarations both used
- Example patterns from codebase: `createPageUrl()`, `recordImpression()`, `handleClick()`, `cn()`

**Variables:**
- camelCase for all variables and constants
- useState hooks: descriptive names like `isOpen`, `isEditing`, `hasViewed`, `currentUser`, `currentImageIndex`
- Boolean prefixes: `is*`, `has*`, `show*` (e.g., `isAuthenticated`, `hasViewed`, `showCreate`)
- Constants in UPPERCASE: `MOBILE_BREAKPOINT`, `CATEGORIES` arrays

**Types:**
- No strict TypeScript enforcement in JSX components (jsconfig.json, not tsconfig)
- TypeScript used in Deno functions (`base44/functions/`) with `.ts` extension
- Type checking enabled with `checkJs: true` in jsconfig.json
- No prop-types used (disabled in ESLint rules)

## Code Style

**Formatting:**
- No Prettier configuration found - ESLint-based linting only
- Files use standard JS/JSX spacing and indentation
- Imports are separated by blank lines: external → local paths
- Import paths use `@/*` alias for src directory

**Linting:**
- ESLint with flat config (`eslint.config.js`)
- Target: ES2022 (ecmaVersion: 2022)
- Applied to: `src/components/**/*.{js,mjs,cjs,jsx}`, `src/pages/**/*.{js,mjs,cjs,jsx}`, `src/Layout.jsx`
- Ignored: `src/lib/**/*`, `src/components/ui/**/*`
- Run commands:
  - `npm run lint` - Check with quiet output
  - `npm run lint:fix` - Auto-fix issues

**ESLint Rules:**
- `unused-imports/no-unused-imports`: error - removes unused imports
- `unused-imports/no-unused-vars`: warning with underscore pattern (`_` prefix ignores variables)
- `react/prop-types`: off - no prop-type validation
- `react/react-in-jsx-scope`: off - React imports not required
- `react/jsx-uses-vars`: error - ensures variables used in JSX aren't marked unused
- `react/jsx-uses-react`: error - prevents React import removal
- `react-hooks/rules-of-hooks`: error - enforces hook rules
- `react/no-unknown-property`: error with custom allowlist (`cmdk-input-wrapper`, `toast-close`)

## Import Organization

**Order:**
1. React and core libraries (e.g., `import React, { useState, useEffect } from 'react'`)
2. External packages (e.g., `import { base44 } from '@/api/base44Client'`, Tanstack Query, Lucide icons)
3. Internal imports using alias (e.g., `import { Button } from "@/components/ui/button"`)
4. Relative imports (e.g., CSS files)

**Path Aliases:**
- `@/*` maps to `./src/*` (defined in jsconfig.json)
- All internal imports use `@/` prefix for clarity
- Examples: `@/api/base44Client`, `@/lib/utils`, `@/components/ui/button`

**Import Grouping Example from codebase:**
```jsx
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Filter } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import './App.css'
```

## Error Handling

**Patterns:**
- Try-catch blocks in async functions for error capture
- Errors logged to console with descriptive messages (e.g., `console.error()`, `console.log()`)
- Errors passed to UI layer via toast notifications using `sonner` library
- Error messages shown to users via `toast.error(error.message || 'Failed to...')`
- Fallback messages when errors lack detailed description
- Database operations wrapped in try-catch with empty catch blocks logging non-fatal errors
- Example from `processContentPurchase/entry.ts`:
  ```typescript
  try {
    // operation
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  ```

## Logging

**Framework:** `console` object (no dedicated logging library)

**Patterns:**
- `console.log()` for info-level messages
- `console.error()` for error logging
- Common in development: `console.log('Starting mutation', { ...data })`
- Logging used for debugging async operations and state changes
- Examples from codebase:
  ```javascript
  console.log('Starting tip mutation', { tipAmount, wallet, currentUserId });
  console.error('Tip mutation error:', error);
  console.log('Not logged in'); // Non-error informational logs
  ```

## Comments

**When to Comment:**
- Sparse comment usage in codebase - code is largely self-documenting
- Comments used for non-obvious logic or workarounds
- Example from `TipButton.jsx`: `// Filter for Ascendra Social token wallets only`
- Example from `AuthContext.jsx`: `// First, check app public settings (with token if available)`

**JSDoc/TSDoc:**
- Not consistently used in JSX files
- Not observed in the codebase
- Deno functions may benefit from JSDoc but none present in current files

## Function Design

**Size:**
- React components average 100-300 lines for page components
- Functional components preferred over class components
- Component logic kept within single file unless reusable

**Parameters:**
- Destructuring props at function signature: `export default function AdCard({ ad, currentUserId })`
- Query functions passed as async arrow functions to hooks
- Mutation functions return promises

**Return Values:**
- Components return JSX or null conditionally
- Async functions return Response objects (Deno) or promises
- Query functions return filtered entity arrays or single objects
- Null returned when authentication required but not present

## Module Design

**Exports:**
- Default export for page components and main component modules
- Named exports used in utility modules (e.g., `export function useIsMobile()`)
- Example: `export default function TipButton({ ... })`

**Barrel Files:**
- Index files used minimally in codebase
- `src/utils/index.ts` exports single utility function: `createPageUrl`
- No explicit barrel file pattern observed for components

## State Management

**Pattern:** Tanstack React Query (TanStack/react-query v5.84.1)

**Usage:**
- `useQuery()` for server state fetching with automatic caching
- `useMutation()` for mutations with `onSuccess`/`onError` callbacks
- `useQueryClient()` for manual cache invalidation
- Example:
  ```javascript
  const { data: wallet, isLoading } = useQuery({
    queryKey: ['wallet', currentUserId],
    queryFn: async () => { /* fetch logic */ },
    enabled: !!currentUserId,
    retry: false
  });
  ```

**Local State:** React hooks (`useState`) for UI state like modals, forms, temporary values

**API Client:**
- Base44 SDK client (`@base44/sdk`) instantiated once in `src/api/base44Client.js`
- Singleton pattern: `export const base44 = createClient({ ... })`
- Used across all components via `import { base44 } from '@/api/base44Client'`

---

*Convention analysis: 2026-03-18*
