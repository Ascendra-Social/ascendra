# Testing Patterns

**Analysis Date:** 2026-03-18

## Test Framework

**Status:** No test framework configured or test files present

**Finding:** The codebase contains no test files (no `.test.*` or `.spec.*` files found). No testing dependencies are installed:
- Jest not configured
- Vitest not configured
- Testing library not present
- Playwright/Cypress for E2E not present

**Recommendation:** Testing should be added to the project. Priority areas (based on CONCERNS analysis) are:
- Complex state mutations in components like `TipButton.jsx`, `AdCard.jsx`
- API integration functions in `base44/functions/`
- Authentication and authorization in `src/lib/AuthContext.jsx`

## Run Commands

**Current commands (from package.json):**
```bash
npm run dev              # Start dev server
npm run build            # Build for production
npm run lint             # Check code with ESLint
npm run lint:fix         # Auto-fix ESLint issues
npm run typecheck        # Run TypeScript type checking
npm run preview          # Preview production build
```

**Missing test commands:** No test runner configured

## Test File Organization

**Current state:** Not applicable - no tests exist

**Recommended Structure (when implementing):**
- Co-located tests: Place `ComponentName.test.jsx` next to `ComponentName.jsx`
- Page tests: `src/pages/__tests__/Profile.test.jsx`
- Hook tests: `src/hooks/__tests__/useIsMobile.test.jsx`
- Integration tests: `src/__tests__/integration/`
- API function tests: `base44/functions/__tests__/`

## Test Structure

**Pattern to establish:** Not present in current codebase

**Recommended from existing patterns:**
Given the use of Tanstack React Query and React hooks, tests should follow this pattern:

```javascript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
```

**Setup/Teardown:**
- Query client setup required for components using `useQuery`/`useMutation`
- Mock API client (`base44`) before each test
- Clear mocks after each test

## Mocking

**Framework to use:** Vitest with `vitest/vi` mocking utilities (recommended for this stack)

**Patterns to establish:**

**Mock API Client:**
```javascript
import { vi } from 'vitest';
import { base44 } from '@/api/base44Client';

vi.mock('@/api/base44Client', () => ({
  base44: {
    auth: {
      me: vi.fn(),
      updateMe: vi.fn(),
    },
    entities: {
      User: {
        filter: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      TokenWallet: {
        filter: vi.fn(),
        update: vi.fn(),
      },
      // ... other entities
    }
  }
}));
```

**Mock Tanstack Query:**
```javascript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

// Wrap component in QueryClientProvider for tests
```

**What to Mock:**
- External API calls (base44 SDK)
- Tanstack React Query hooks (useQuery, useMutation)
- React Router (useNavigate, useParams)
- Components from external libraries (Dialog, Button, etc.)

**What NOT to Mock:**
- Core React hooks (useState, useEffect)
- Utility functions (cn(), createPageUrl())
- UI component library internals
- Custom hooks logic (test actual behavior)

## Fixtures and Factories

**Test Data Strategy (to implement):**

**Location:** `src/__tests__/fixtures/` directory structure

**Factory Example for User:**
```javascript
export function createMockUser(overrides = {}) {
  return {
    id: 'user-123',
    full_name: 'Test User',
    username: 'testuser',
    avatar_url: 'https://example.com/avatar.jpg',
    role: 'user',
    online_status: 'online',
    ...overrides,
  };
}
```

**Factory Example for TokenWallet:**
```javascript
export function createMockWallet(userId, overrides = {}) {
  return {
    id: `wallet-${userId}`,
    user_id: userId,
    balance: 1000,
    lifetime_earnings: 5000,
    token_contract_address: 'ATF7deyT7FdS7GHip1Btv8t6Mj9vhsfzffoMZhE2vvwR',
    ...overrides,
  };
}
```

**Common Fixtures Location:**
- `src/__tests__/fixtures/users.js`
- `src/__tests__/fixtures/wallets.js`
- `src/__tests__/fixtures/posts.js`

## Coverage

**Requirements:** None currently enforced

**Recommendation:** When tests are added, target:
- Critical paths: 80%+ coverage
- Components with side effects: 100% coverage
- API functions: 100% coverage

**View Coverage (when implemented):**
```bash
vitest --coverage
```

## Test Types

**Unit Tests** (to implement):
- Test individual utility functions (`createPageUrl()`)
- Test hooks in isolation (`useIsMobile()`)
- Test component rendering with different props
- Focus: Specific units with minimal dependencies
- Example: Testing `cn()` utility with various className inputs

**Integration Tests** (to implement):
- Test components with mocked API calls
- Example: `TipButton` with mocked `base44.entities.TokenWallet`
- Test data flow between components and React Query
- Example: Component queries wallet, renders balance, mutation sends tip

**E2E Tests** (not currently planned):
- Playwright or Cypress would be needed
- Test full user flows like: login → view profile → send tip → verify transaction
- Not observed in dependencies

## Mocking Patterns by Feature

**Async Data Fetching with useQuery:**
```javascript
// Test: Component loads and displays wallet balance
const mockWallets = [createMockWallet('user-123', { balance: 500 })];
vi.mocked(base44.entities.TokenWallet.filter).mockResolvedValue(mockWallets);

render(<TipButton post={post} currentUserId="user-123" />);
await waitFor(() => {
  expect(screen.getByText('Available: 500 $ASC')).toBeInTheDocument();
});
```

**Mutations with onSuccess/onError:**
```javascript
// Test: Mutation updates query cache on success
vi.mocked(base44.entities.Tip.create).mockResolvedValue({ id: 'tip-123' });

const { rerender } = render(<TipButton />);
await userEvent.click(screen.getByText('Send Tip'));
await waitFor(() => {
  expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
    queryKey: ['wallet']
  });
});
```

**Error Handling:**
```javascript
// Test: Error toast shown on failure
vi.mocked(base44.entities.TokenWallet.update).mockRejectedValue(
  new Error('Insufficient balance')
);

render(<TipButton />);
await userEvent.click(screen.getByText('Send Tip'));
await waitFor(() => {
  expect(screen.getByText('Insufficient balance')).toBeInTheDocument();
});
```

## Critical Components Needing Tests

Based on codebase complexity:

**High Priority:**
1. `src/lib/AuthContext.jsx` - Authentication state, user registration checks
2. `src/components/creator/TipButton.jsx` - Complex mutations, balance validation
3. `src/components/ads/AdCard.jsx` - Impression tracking, reward calculations
4. `base44/functions/processContentPurchase/entry.ts` - Financial transaction logic
5. `src/lib/query-client.js` - Query client configuration

**Medium Priority:**
1. `src/pages/Profile.jsx` - User data fetching and editing
2. `src/pages/Marketplace.jsx` - Search and filtering logic
3. `src/components/creator/SubscriptionTiers.jsx` - Tier rendering and logic

## Configuration to Add

**Recommended vitest.config.js:**
```javascript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/__tests__/setup.js',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

**Recommended package.json additions:**
```json
{
  "devDependencies": {
    "vitest": "^1.0.0",
    "@vitest/ui": "^1.0.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/user-event": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "jsdom": "^23.0.0",
    "@vitest/coverage-v8": "^1.0.0"
  },
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

---

*Testing analysis: 2026-03-18*
