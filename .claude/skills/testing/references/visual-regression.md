# Visual Regression Testing

Catch unintended UI changes with screenshot comparison.

## Tools Overview

| Tool | Best For | Integration |
|------|----------|-------------|
| Playwright (built-in) | E2E visual tests | Native |
| Percy | CI/CD workflow | GitHub, GitLab |
| Chromatic | Storybook components | Storybook |
| Argos | Open source friendly | GitHub |
| Applitools | AI-powered diffing | Enterprise |

## Playwright Visual Testing

### Basic Screenshot Comparison
```typescript
// tests/visual.spec.ts
import { test, expect } from '@playwright/test'

test('homepage visual regression', async ({ page }) => {
  await page.goto('/')
  
  // Wait for content to load
  await page.waitForLoadState('networkidle')
  
  // Compare screenshot
  await expect(page).toHaveScreenshot('homepage.png')
})

test('button states', async ({ page }) => {
  await page.goto('/components')
  
  const button = page.getByRole('button', { name: 'Submit' })
  
  // Default state
  await expect(button).toHaveScreenshot('button-default.png')
  
  // Hover state
  await button.hover()
  await expect(button).toHaveScreenshot('button-hover.png')
  
  // Focus state
  await button.focus()
  await expect(button).toHaveScreenshot('button-focus.png')
})
```

### Element Screenshots
```typescript
test('card component', async ({ page }) => {
  await page.goto('/cards')
  
  const card = page.locator('.card').first()
  
  await expect(card).toHaveScreenshot('card.png', {
    // Ignore animations
    animations: 'disabled',
    // Allow small pixel differences
    maxDiffPixels: 100,
  })
})
```

### Full Page Screenshots
```typescript
test('full page screenshot', async ({ page }) => {
  await page.goto('/about')
  
  await expect(page).toHaveScreenshot('about-full.png', {
    fullPage: true,
  })
})
```

## Configuration

### Playwright Config
```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  
  // Snapshot settings
  snapshotDir: './tests/__snapshots__',
  snapshotPathTemplate: '{testDir}/__snapshots__/{testFilePath}/{arg}{ext}',
  
  expect: {
    toHaveScreenshot: {
      // Threshold for pixel comparison (0-1)
      threshold: 0.2,
      // Maximum different pixels allowed
      maxDiffPixels: 50,
      // Maximum diff ratio (0-1)
      maxDiffPixelRatio: 0.01,
      // Animation handling
      animations: 'disabled',
    },
  },
  
  // Run tests in multiple browsers
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'] } },
  ],
})
```

### Update Snapshots
```bash
# Update all snapshots
npx playwright test --update-snapshots

# Update specific test
npx playwright test homepage.spec.ts --update-snapshots
```

## Handling Dynamic Content

### Masking Dynamic Elements
```typescript
test('dashboard with dynamic data', async ({ page }) => {
  await page.goto('/dashboard')
  
  await expect(page).toHaveScreenshot('dashboard.png', {
    mask: [
      page.locator('.timestamp'),      // Hide timestamps
      page.locator('.avatar'),          // Hide user avatars
      page.locator('[data-testid="chart"]'),  // Hide charts
    ],
    maskColor: '#ff00ff',  // Color for masked areas
  })
})
```

### Freezing Animations
```typescript
test('animated component', async ({ page }) => {
  await page.goto('/animations')
  
  // Disable CSS animations
  await page.emulateMedia({ reducedMotion: 'reduce' })
  
  // Or inject CSS to freeze
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        transition-duration: 0s !important;
      }
    `,
  })
  
  await expect(page).toHaveScreenshot('static.png')
})
```

### Waiting for Stability
```typescript
test('content loads then compare', async ({ page }) => {
  await page.goto('/data-page')
  
  // Wait for loading to complete
  await page.waitForSelector('.loading', { state: 'hidden' })
  await page.waitForSelector('.data-loaded')
  
  // Wait for fonts
  await page.waitForFunction(() => document.fonts.ready)
  
  // Additional stability wait
  await page.waitForTimeout(500)
  
  await expect(page).toHaveScreenshot('data-page.png')
})
```

## Responsive Screenshots

```typescript
const viewports = [
  { width: 375, height: 667, name: 'mobile' },
  { width: 768, height: 1024, name: 'tablet' },
  { width: 1280, height: 800, name: 'desktop' },
  { width: 1920, height: 1080, name: 'wide' },
]

for (const viewport of viewports) {
  test(`homepage at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.goto('/')
    
    await expect(page).toHaveScreenshot(`homepage-${viewport.name}.png`)
  })
}
```

## CI Integration

### GitHub Actions
```yaml
# .github/workflows/visual.yml
name: Visual Regression

on: [push, pull_request]

jobs:
  visual-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
      
      - name: Install
        run: npm ci
      
      - name: Install Playwright
        run: npx playwright install --with-deps
      
      - name: Run visual tests
        run: npx playwright test --project=chromium
      
      - name: Upload diff artifacts
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: visual-diff
          path: test-results/
          retention-days: 7
```

### Handling Platform Differences
```typescript
// Different snapshots per platform
test('cross-platform', async ({ page }) => {
  await page.goto('/')
  
  await expect(page).toHaveScreenshot('homepage.png', {
    // Allow platform-specific snapshots
    // Creates homepage-chromium-linux.png, homepage-chromium-darwin.png, etc.
  })
})
```

## Storybook + Chromatic

### Setup
```bash
npm install -D chromatic

# Configure
npx chromatic --project-token=<your-token>
```

### Storybook Visual Tests
```typescript
// Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './Button'

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  // Enable visual snapshot
  parameters: {
    chromatic: { viewports: [320, 768, 1200] },
  },
}

export default meta
type Story = StoryObj<typeof Button>

export const Primary: Story = {
  args: { variant: 'primary', children: 'Click me' },
}

export const Secondary: Story = {
  args: { variant: 'secondary', children: 'Click me' },
}

// Disable snapshot for specific story
export const Animated: Story = {
  args: { animated: true },
  parameters: {
    chromatic: { disableSnapshot: true },
  },
}
```

### CI with Chromatic
```yaml
# .github/workflows/chromatic.yml
jobs:
  chromatic:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Required for Chromatic
      
      - uses: actions/setup-node@v4
      
      - run: npm ci
      
      - name: Chromatic
        uses: chromaui/action@latest
        with:
          projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
          # Auto-accept changes on main
          autoAcceptChanges: "main"
```

## Best Practices

### What to Test Visually
```markdown
✅ Good candidates:
- Component library (buttons, cards, forms)
- Critical pages (landing, pricing, checkout)
- Complex layouts (dashboards, tables)
- Brand-sensitive elements (headers, footers)
- Error states and empty states

❌ Avoid:
- Pages with highly dynamic content
- Real-time data displays
- Third-party widgets
- User-generated content
```

### Organizing Snapshots
```
tests/
├── __snapshots__/
│   ├── homepage/
│   │   ├── homepage-chromium.png
│   │   ├── homepage-firefox.png
│   │   └── homepage-mobile.png
│   ├── components/
│   │   ├── button-default.png
│   │   ├── button-hover.png
│   │   └── button-focus.png
│   └── pages/
│       ├── pricing.png
│       └── about.png
├── visual/
│   ├── homepage.spec.ts
│   └── components.spec.ts
```

### Review Workflow

1. **PR triggers visual tests** → CI runs comparisons
2. **Diff detected** → Artifacts uploaded
3. **Review diffs** → Approve or reject
4. **Update baseline** → `--update-snapshots`
5. **Merge** → New baseline becomes standard

## Related Skills

- [E2E Testing](e2e-playwright.md) — Playwright fundamentals
- [Component Testing](component-testing.md) — Component tests
- [Test Strategy](test-strategy-guide.md) — When to use visual tests
