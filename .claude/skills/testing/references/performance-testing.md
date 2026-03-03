# Performance Testing

Testing and monitoring web performance.

## Core Web Vitals

### Key Metrics

| Metric | Good | Needs Work | Poor | What It Measures |
|--------|------|------------|------|------------------|
| **LCP** (Largest Contentful Paint) | ≤2.5s | ≤4s | >4s | Loading performance |
| **INP** (Interaction to Next Paint) | ≤200ms | ≤500ms | >500ms | Interactivity |
| **CLS** (Cumulative Layout Shift) | ≤0.1 | ≤0.25 | >0.25 | Visual stability |

### Measuring in Code
```typescript
// Using web-vitals library
import { onLCP, onINP, onCLS } from 'web-vitals'

function sendToAnalytics(metric) {
  // Send to your analytics service
  console.log(metric.name, metric.value)
}

onLCP(sendToAnalytics)
onINP(sendToAnalytics)
onCLS(sendToAnalytics)

// Next.js built-in
export function reportWebVitals(metric) {
  if (metric.label === 'web-vital') {
    console.log(metric.name, metric.value)
  }
}
```

## Lighthouse Testing

### CLI Usage
```bash
# Basic audit
npx lighthouse https://example.com --output=html --output-path=./report.html

# Specific categories
npx lighthouse https://example.com --only-categories=performance,accessibility

# CI-friendly JSON output
npx lighthouse https://example.com --output=json --output-path=./report.json

# Mobile vs Desktop
npx lighthouse https://example.com --preset=desktop
npx lighthouse https://example.com --preset=mobile  # default
```

### Lighthouse CI

```bash
npm install -D @lhci/cli
```

```javascript
// lighthouserc.js
module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:3000/', 'http://localhost:3000/dashboard'],
      numberOfRuns: 3,
      startServerCommand: 'npm run start',
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],
        'first-contentful-paint': ['error', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
}
```

```bash
# Run LHCI
npx lhci autorun
```

### GitHub Actions Integration
```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse CI

on: [push]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
      
      - name: Install and Build
        run: |
          npm ci
          npm run build
      
      - name: Lighthouse CI
        run: |
          npm install -g @lhci/cli
          lhci autorun
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
```

## Bundle Analysis

### Next.js Bundle Analyzer
```bash
npm install -D @next/bundle-analyzer
```

```javascript
// next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

module.exports = withBundleAnalyzer({
  // Your Next.js config
})
```

```bash
# Generate report
ANALYZE=true npm run build
```

### Vite/Rollup Analysis
```bash
npm install -D rollup-plugin-visualizer
```

```typescript
// vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    visualizer({
      filename: 'dist/stats.html',
      open: true,
      gzipSize: true,
    }),
  ],
})
```

### Import Cost Tracking
```typescript
// Check import size impact
// VS Code extension: Import Cost

// Dynamic imports for code splitting
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <Skeleton />,
})
```

## Runtime Performance Testing

### Measuring with Performance API
```typescript
// Mark start
performance.mark('fetch-start')

// Do work
const data = await fetchData()

// Mark end and measure
performance.mark('fetch-end')
performance.measure('fetch-duration', 'fetch-start', 'fetch-end')

// Get results
const measures = performance.getEntriesByName('fetch-duration')
console.log(`Fetch took ${measures[0].duration}ms`)
```

### React Profiler
```tsx
import { Profiler, ProfilerOnRenderCallback } from 'react'

const onRender: ProfilerOnRenderCallback = (
  id,
  phase,
  actualDuration,
  baseDuration,
  startTime,
  commitTime
) => {
  console.log({
    component: id,
    phase,           // "mount" | "update"
    actualDuration,  // Time spent rendering
    baseDuration,    // Estimated time without memoization
    startTime,
    commitTime,
  })
}

function App() {
  return (
    <Profiler id="App" onRender={onRender}>
      <MyComponent />
    </Profiler>
  )
}
```

### Memory Leak Detection
```typescript
// In tests
test('no memory leaks on unmount', async () => {
  const initialMemory = performance.memory?.usedJSHeapSize
  
  // Mount and unmount many times
  for (let i = 0; i < 100; i++) {
    const { unmount } = render(<ComponentUnderTest />)
    unmount()
  }
  
  // Force garbage collection (if available)
  if (global.gc) global.gc()
  
  const finalMemory = performance.memory?.usedJSHeapSize
  const memoryGrowth = finalMemory - initialMemory
  
  // Should not grow significantly
  expect(memoryGrowth).toBeLessThan(1_000_000) // 1MB
})
```

## Database Query Performance

### PostgreSQL EXPLAIN ANALYZE
```sql
EXPLAIN ANALYZE 
SELECT * FROM orders 
WHERE customer_id = 123 
ORDER BY created_at DESC 
LIMIT 20;

-- Output shows:
-- - Execution time
-- - Rows examined
-- - Index usage
-- - Sequential vs index scan
```

### Query Timing in Application
```typescript
// Prisma query logging
const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
  ],
})

prisma.$on('query', (e) => {
  console.log(`Query: ${e.query}`)
  console.log(`Duration: ${e.duration}ms`)
})
```

## Performance Budgets

### Define Budgets
```json
// performance-budget.json
{
  "budgets": [
    {
      "path": "/*",
      "resourceSizes": [
        { "resourceType": "document", "budget": 50 },
        { "resourceType": "script", "budget": 300 },
        { "resourceType": "stylesheet", "budget": 50 },
        { "resourceType": "image", "budget": 500 },
        { "resourceType": "total", "budget": 1000 }
      ],
      "resourceCounts": [
        { "resourceType": "script", "budget": 10 },
        { "resourceType": "third-party", "budget": 5 }
      ]
    }
  ]
}
```

### Enforce in CI
```typescript
// In Lighthouse CI
{
  assert: {
    assertions: {
      'resource-summary:script:size': ['error', { maxNumericValue: 300000 }],
      'resource-summary:total:size': ['error', { maxNumericValue: 1000000 }],
    },
  },
}
```

## Automated Performance Tests

### Playwright Performance
```typescript
import { test, expect } from '@playwright/test'

test('page load performance', async ({ page }) => {
  // Start performance measurement
  await page.goto('/', { waitUntil: 'networkidle' })
  
  // Get performance metrics
  const metrics = await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    return {
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.startTime,
      load: navigation.loadEventEnd - navigation.startTime,
      ttfb: navigation.responseStart - navigation.startTime,
    }
  })
  
  // Assert thresholds
  expect(metrics.ttfb).toBeLessThan(200)
  expect(metrics.domContentLoaded).toBeLessThan(1500)
  expect(metrics.load).toBeLessThan(3000)
})

test('interaction performance', async ({ page }) => {
  await page.goto('/search')
  
  const startTime = Date.now()
  
  await page.fill('input[name="query"]', 'test')
  await page.click('button[type="submit"]')
  await page.waitForSelector('.results')
  
  const duration = Date.now() - startTime
  
  expect(duration).toBeLessThan(500)
})
```

## Monitoring Checklist

```markdown
Pre-deploy:
- [ ] Bundle size within budget
- [ ] Lighthouse score > 90
- [ ] No new render-blocking resources
- [ ] Images optimized (WebP, lazy loading)
- [ ] Code splitting for heavy components

Post-deploy:
- [ ] Monitor RUM (Real User Monitoring)
- [ ] Check Core Web Vitals in Search Console
- [ ] Compare before/after in analytics
- [ ] Watch for performance regression alerts
```

## Related Skills

- [Load Testing with k6](load-testing-k6.md) — Server load testing
- [Test Strategy](test-strategy-guide.md) — When to test performance
- [Next.js Optimization](../../nextjs-turborepo/references/nextjs-optimization.md) — Framework optimizations
