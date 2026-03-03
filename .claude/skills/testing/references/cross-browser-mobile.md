# Cross-Browser & Mobile Testing

Testing across browsers and devices.

## Browser Matrix

### Recommended Coverage

| Browser | Engine | Market Share | Priority |
|---------|--------|--------------|----------|
| Chrome | Blink | ~65% | High |
| Safari | WebKit | ~19% | High |
| Firefox | Gecko | ~3% | Medium |
| Edge | Blink | ~5% | Medium |
| Samsung Internet | Blink | ~3% | Low |

### Playwright Multi-Browser Config
```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  projects: [
    // Desktop browsers
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    
    // Mobile browsers
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 14'] },
    },
    
    // Tablets
    {
      name: 'iPad',
      use: { ...devices['iPad Pro 11'] },
    },
  ],
})
```

### Run Specific Browsers
```bash
# All browsers
npx playwright test

# Specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox

# Multiple browsers
npx playwright test --project=chromium --project=webkit
```

## Device Emulation

### Common Device Configs
```typescript
// Custom device configuration
const customDevice = {
  viewport: { width: 393, height: 851 },
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0...',
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
}

test('custom device test', async ({ browser }) => {
  const context = await browser.newContext({
    ...customDevice,
  })
  const page = await context.newPage()
  // ...
})
```

### Viewport Testing
```typescript
const viewports = [
  { name: 'mobile-s', width: 320, height: 568 },   // iPhone SE
  { name: 'mobile-m', width: 375, height: 667 },   // iPhone 8
  { name: 'mobile-l', width: 414, height: 896 },   // iPhone 11
  { name: 'tablet', width: 768, height: 1024 },    // iPad
  { name: 'laptop', width: 1366, height: 768 },    // Laptop
  { name: 'desktop', width: 1920, height: 1080 },  // Full HD
]

for (const { name, width, height } of viewports) {
  test(`responsive at ${name}`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    await page.goto('/')
    
    // Test responsive behavior
    if (width < 768) {
      await expect(page.locator('.mobile-menu')).toBeVisible()
      await expect(page.locator('.desktop-nav')).toBeHidden()
    } else {
      await expect(page.locator('.desktop-nav')).toBeVisible()
    }
  })
}
```

## Touch Interactions

### Simulating Touch Events
```typescript
test('swipe gesture', async ({ page }) => {
  await page.goto('/gallery')
  
  const gallery = page.locator('.gallery')
  const box = await gallery.boundingBox()
  
  // Swipe left
  await page.mouse.move(box.x + box.width - 50, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + 50, box.y + box.height / 2, { steps: 10 })
  await page.mouse.up()
  
  // Verify slide changed
  await expect(page.locator('.slide-2')).toBeVisible()
})

test('pinch to zoom', async ({ page }) => {
  // Note: Complex gestures may require real device testing
  await page.goto('/map')
  
  // Use touch events API
  await page.evaluate(() => {
    const map = document.querySelector('.map')
    const touchStart = new TouchEvent('touchstart', {
      touches: [
        new Touch({ identifier: 1, target: map, clientX: 100, clientY: 100 }),
        new Touch({ identifier: 2, target: map, clientX: 200, clientY: 200 }),
      ],
    })
    map.dispatchEvent(touchStart)
  })
})
```

### Touch Target Sizes
```typescript
test('touch targets are large enough', async ({ page }) => {
  await page.goto('/')
  
  const buttons = await page.locator('button, a, [role="button"]').all()
  
  for (const button of buttons) {
    const box = await button.boundingBox()
    
    // WCAG recommends minimum 44x44px touch targets
    expect(box.width).toBeGreaterThanOrEqual(44)
    expect(box.height).toBeGreaterThanOrEqual(44)
  }
})
```

## Network Conditions

### Simulating Mobile Networks
```typescript
test('works on slow 3G', async ({ browser }) => {
  const context = await browser.newContext()
  const page = await context.newPage()
  
  // Simulate slow 3G
  const client = await page.context().newCDPSession(page)
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    downloadThroughput: (500 * 1024) / 8,  // 500 Kbps
    uploadThroughput: (500 * 1024) / 8,
    latency: 400,  // 400ms
  })
  
  const startTime = Date.now()
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const loadTime = Date.now() - startTime
  
  // Should still load within acceptable time
  expect(loadTime).toBeLessThan(10000)
  
  // Content should be usable
  await expect(page.locator('h1')).toBeVisible()
})

test('offline fallback', async ({ page }) => {
  await page.goto('/')
  
  // Go offline
  await page.context().setOffline(true)
  
  // Navigate to another page
  await page.click('a[href="/about"]')
  
  // Should show offline indicator or cached content
  await expect(page.locator('.offline-banner')).toBeVisible()
})
```

## Real Device Testing

### BrowserStack Integration
```typescript
// browserstack.config.ts
export const bsCapabilities = [
  {
    'bstack:options': {
      os: 'OS X',
      osVersion: 'Sonoma',
      browserVersion: 'latest',
      browserName: 'Safari',
    },
  },
  {
    'bstack:options': {
      deviceName: 'iPhone 15',
      osVersion: '17',
      browserName: 'safari',
      realMobile: 'true',
    },
  },
  {
    'bstack:options': {
      deviceName: 'Samsung Galaxy S23',
      osVersion: '13.0',
      browserName: 'chrome',
      realMobile: 'true',
    },
  },
]
```

### LambdaTest Integration
```bash
# Run Playwright tests on LambdaTest
LT_USERNAME=<username> LT_ACCESS_KEY=<key> \
npx playwright test --config=lambdatest.config.ts
```

## Browser-Specific Issues

### Safari Quirks
```typescript
test('Safari date input', async ({ page, browserName }) => {
  test.skip(browserName !== 'webkit', 'Safari-specific test')
  
  await page.goto('/form')
  
  // Safari handles date inputs differently
  const dateInput = page.locator('input[type="date"]')
  await dateInput.fill('2024-01-15')
  
  await expect(dateInput).toHaveValue('2024-01-15')
})
```

### Firefox Considerations
```typescript
test('Firefox scroll behavior', async ({ page, browserName }) => {
  test.skip(browserName !== 'firefox', 'Firefox-specific test')
  
  await page.goto('/long-page')
  
  // Firefox may handle smooth scroll differently
  await page.evaluate(() => {
    window.scrollTo({ top: 1000, behavior: 'smooth' })
  })
  
  await page.waitForTimeout(500)  // Wait for scroll animation
  
  const scrollY = await page.evaluate(() => window.scrollY)
  expect(scrollY).toBeGreaterThanOrEqual(1000)
})
```

## Responsive Testing Patterns

```typescript
test.describe('Responsive Navigation', () => {
  test('mobile: hamburger menu', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    
    // Desktop nav hidden
    await expect(page.locator('nav.desktop')).toBeHidden()
    
    // Mobile hamburger visible
    const hamburger = page.locator('[aria-label="Menu"]')
    await expect(hamburger).toBeVisible()
    
    // Opens mobile menu
    await hamburger.click()
    await expect(page.locator('nav.mobile')).toBeVisible()
  })
  
  test('desktop: horizontal nav', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/')
    
    // Desktop nav visible
    await expect(page.locator('nav.desktop')).toBeVisible()
    
    // Hamburger hidden
    await expect(page.locator('[aria-label="Menu"]')).toBeHidden()
  })
})
```

## CI Matrix Strategy

```yaml
# .github/workflows/cross-browser.yml
name: Cross-Browser Tests

on: [push, pull_request]

jobs:
  test:
    strategy:
      matrix:
        browser: [chromium, firefox, webkit]
        os: [ubuntu-latest, macos-latest, windows-latest]
        exclude:
          # WebKit not supported on Windows in Playwright
          - browser: webkit
            os: windows-latest
    
    runs-on: ${{ matrix.os }}
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      
      - run: npm ci
      
      - run: npx playwright install ${{ matrix.browser }} --with-deps
      
      - run: npx playwright test --project=${{ matrix.browser }}
      
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: test-results-${{ matrix.browser }}-${{ matrix.os }}
          path: test-results/
```

## Testing Checklist

```markdown
Browsers:
- [ ] Chrome (latest, latest-1)
- [ ] Safari (macOS, iOS)
- [ ] Firefox
- [ ] Edge

Devices:
- [ ] iPhone (latest iOS)
- [ ] Android phone (Chrome)
- [ ] iPad / Android tablet

Viewports:
- [ ] 320px (small mobile)
- [ ] 375px (standard mobile)
- [ ] 768px (tablet)
- [ ] 1024px (small desktop)
- [ ] 1440px+ (large desktop)

Conditions:
- [ ] Slow network (3G)
- [ ] Offline mode
- [ ] Touch interactions
```

## Related Skills

- [E2E Testing](e2e-playwright.md) — Playwright fundamentals
- [Visual Regression](visual-regression.md) — Screenshot comparisons
- [Responsive Design](../../ui-styling/references/responsive-design.md) — Responsive patterns
