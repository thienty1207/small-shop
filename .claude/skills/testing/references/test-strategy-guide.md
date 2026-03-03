# Test Strategy Guide

## What to Test (Priority Matrix)

| Priority | What | Test Type | Example |
|----------|------|-----------|---------|
| P0 Critical | Auth flows | E2E | Login, signup, password reset |
| P0 Critical | Payment flows | E2E | Checkout, subscription |
| P1 High | Core business logic | Unit | Pricing calculations, validations |
| P1 High | API contracts | Integration | Request/response schemas |
| P2 Medium | UI components | Component | Form validation, data display |
| P2 Medium | Error handling | Unit + E2E | Error boundaries, 404/500 pages |
| P3 Low | Styling/layout | Visual | Screenshot comparison |
| P3 Low | Performance | Lighthouse | Core Web Vitals thresholds |

## Flakiness Mitigation

### Common Causes & Fixes
```
Cause: Timing issues
Fix: Use Playwright auto-waiting, avoid arbitrary sleep()
     ❌ await page.waitForTimeout(3000)
     ✅ await page.waitForSelector('[data-loaded]')
     ✅ await expect(element).toBeVisible()

Cause: Shared state between tests
Fix: Isolate test data, use fresh DB state
     ❌ Tests depend on previous test's data
     ✅ Each test creates its own data via API/factory

Cause: Network dependencies
Fix: Mock external APIs with MSW or Playwright route
     await page.route('**/api/external/**', route =>
       route.fulfill({ body: JSON.stringify(mockData) })
     )

Cause: Animation/transition
Fix: Disable animations in test environment
     /* playwright global setup */
     *, *::before, *::after { animation-duration: 0s !important; }
```

### Retry Strategy
```typescript
// playwright.config.ts
retries: process.env.CI ? 2 : 0,  // Only retry in CI
// Quarantine flaky tests
test.fixme('flaky test to fix later', async ({ page }) => { ... })
```

## Test Data Management

### Strategies
```
1. API Seeding: Create test data via API before each test
   - Fast, reliable, mirrors real usage
   
2. Database Seeding: Insert directly into DB
   - Fastest, but couples tests to schema
   
3. Factories: Generate data in test code
   - Most flexible, no external deps
   
4. Fixtures: Static JSON files
   - Simple, but can get out of sync
```

### Cleanup
```typescript
// afterEach cleanup
test.afterEach(async ({ request }) => {
  await request.delete('/api/test/cleanup')
})

// Or use transactions (rollback after each test)
beforeEach(() => db.beginTransaction())
afterEach(() => db.rollback())
```

## Coverage Targets

| Type | Target | Why |
|------|--------|-----|
| Line coverage | 80% | Enough to catch most bugs |
| Branch coverage | 70% | Cover main code paths |
| Critical paths | 100% | Auth, payments, data mutations |
| New code | 90% | Prevent regression in new features |

```bash
# Vitest coverage
npx vitest run --coverage
# Enforce in CI
npx vitest run --coverage --coverage.thresholds.lines=80
```

## CI/CD Testing Pipeline

```
Commit → Lint → Unit Tests → Build → Integration Tests → E2E Tests → Deploy
  │         │          │          │           │                │          │
  │      <10s       <30s       <60s       <2min           <5min      <3min
  │                                                                    
  └── Total: <12 minutes (target)
```

### Parallel E2E Strategy
```
# Split E2E tests across CI workers
npx playwright test --shard=1/4  # Worker 1
npx playwright test --shard=2/4  # Worker 2
npx playwright test --shard=3/4  # Worker 3
npx playwright test --shard=4/4  # Worker 4
```
