# E2E Testing with Playwright

## Setup

```bash
npm init playwright@latest
# Creates: playwright.config.ts, tests/, .github/workflows/playwright.yml
```

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html'], ['json', { outputFile: 'results.json' }]],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'mobile', use: { ...devices['iPhone 14'] } }
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI
  }
})
```

## Test Patterns

### Basic Navigation & Assertions
```typescript
import { test, expect } from '@playwright/test'

test('homepage loads correctly', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/My App/)
  await expect(page.locator('h1')).toContainText('Welcome')
  await expect(page.locator('[data-testid="nav"]')).toBeVisible()
})
```

### User Authentication Flow
```typescript
test.describe('Authentication', () => {
  test('login with valid credentials', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill('user@example.com')
    await page.getByLabel('Password').fill('password123')
    await page.getByRole('button', { name: 'Sign In' }).click()

    await expect(page).toHaveURL('/dashboard')
    await expect(page.getByText('Welcome back')).toBeVisible()
  })

  test('show error for invalid credentials', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill('wrong@example.com')
    await page.getByLabel('Password').fill('wrong')
    await page.getByRole('button', { name: 'Sign In' }).click()

    await expect(page.getByText('Invalid credentials')).toBeVisible()
    await expect(page).toHaveURL('/login')
  })
})
```

### Form Submission
```typescript
test('create new order', async ({ page }) => {
  await page.goto('/orders/new')
  await page.getByLabel('Product').selectOption('widget-pro')
  await page.getByLabel('Quantity').fill('3')
  await page.getByLabel('Notes').fill('Rush delivery')
  await page.getByRole('button', { name: 'Place Order' }).click()

  // Wait for API response
  await page.waitForResponse(resp =>
    resp.url().includes('/api/orders') && resp.status() === 201
  )

  await expect(page.getByText('Order placed successfully')).toBeVisible()
})
```

## Page Object Model

```typescript
// pages/LoginPage.ts
import { Page, Locator, expect } from '@playwright/test'

export class LoginPage {
  readonly page: Page
  readonly emailInput: Locator
  readonly passwordInput: Locator
  readonly submitButton: Locator
  readonly errorMessage: Locator

  constructor(page: Page) {
    this.page = page
    this.emailInput = page.getByLabel('Email')
    this.passwordInput = page.getByLabel('Password')
    this.submitButton = page.getByRole('button', { name: 'Sign In' })
    this.errorMessage = page.getByTestId('login-error')
  }

  async goto() {
    await this.page.goto('/login')
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    await this.submitButton.click()
  }

  async expectError(message: string) {
    await expect(this.errorMessage).toContainText(message)
  }
}

// Usage in test
test('login flow', async ({ page }) => {
  const loginPage = new LoginPage(page)
  await loginPage.goto()
  await loginPage.login('user@example.com', 'password')
  await expect(page).toHaveURL('/dashboard')
})
```

## Debugging

```bash
# Run with browser visible
npx playwright test --headed

# Debug mode (step through)
npx playwright test --debug

# Generate tests by recording
npx playwright codegen http://localhost:3000

# View trace
npx playwright show-trace trace.zip

# View HTML report
npx playwright show-report
```

## Selector Priority
```
1. getByRole('button', { name: 'Submit' })  → Accessible role (BEST)
2. getByLabel('Email')                        → Form label
3. getByPlaceholder('Enter email')            → Placeholder
4. getByText('Welcome')                       → Visible text
5. getByTestId('submit-btn')                  → data-testid attribute
6. page.locator('.submit-btn')                → CSS selector (LAST RESORT)
```
