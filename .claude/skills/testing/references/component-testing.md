# Component Testing

Testing React components with React Testing Library and Vitest.

## Setup

### Installation
```bash
npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event vitest jsdom
```

### Vitest Configuration
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    include: ['**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
})
```

### Test Setup File
```typescript
// test/setup.ts
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Clean up after each test
afterEach(() => {
  cleanup()
})
```

## Basic Component Testing

### Simple Render Test
```tsx
// components/Button.test.tsx
import { render, screen } from '@testing-library/react'
import { Button } from './Button'

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>)
    
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
  })

  it('applies variant styles', () => {
    render(<Button variant="primary">Primary</Button>)
    
    const button = screen.getByRole('button')
    expect(button).toHaveClass('bg-primary')
  })

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>)
    
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
```

### Testing User Interactions
```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Counter } from './Counter'

describe('Counter', () => {
  it('increments when clicked', async () => {
    const user = userEvent.setup()
    render(<Counter initialCount={0} />)
    
    const button = screen.getByRole('button', { name: /increment/i })
    
    expect(screen.getByText('Count: 0')).toBeInTheDocument()
    
    await user.click(button)
    
    expect(screen.getByText('Count: 1')).toBeInTheDocument()
  })

  it('calls onChange when count changes', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(<Counter initialCount={0} onChange={handleChange} />)
    
    await user.click(screen.getByRole('button', { name: /increment/i }))
    
    expect(handleChange).toHaveBeenCalledWith(1)
  })
})
```

## Query Priorities

### Recommended Query Order (Accessibility First)
```typescript
// 1. Accessible queries (best)
screen.getByRole('button', { name: /submit/i })
screen.getByLabelText(/email/i)
screen.getByPlaceholderText(/search/i)
screen.getByText(/welcome/i)
screen.getByDisplayValue(/john@example.com/i)

// 2. Semantic queries
screen.getByAltText(/profile picture/i)
screen.getByTitle(/close/i)

// 3. Test IDs (last resort)
screen.getByTestId('submit-button')
```

### Query Types

| Query | Returns | Throws | Use Case |
|-------|---------|--------|----------|
| `getBy*` | Element | Yes (if not found) | Element must exist |
| `queryBy*` | Element or null | No | Element may not exist |
| `findBy*` | Promise<Element> | Yes (timeout) | Async elements |
| `getAllBy*` | Element[] | Yes (if empty) | Multiple elements |

```tsx
// Element must exist
const button = screen.getByRole('button')

// Element might not exist
const error = screen.queryByText(/error/i)
expect(error).not.toBeInTheDocument()

// Wait for element to appear
const data = await screen.findByText(/loaded/i)
```

## Testing Forms

### Form Submission
```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm } from './LoginForm'

describe('LoginForm', () => {
  it('submits with form data', async () => {
    const user = userEvent.setup()
    const handleSubmit = vi.fn()
    render(<LoginForm onSubmit={handleSubmit} />)
    
    // Fill form
    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    
    // Submit
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    
    // Verify
    expect(handleSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    })
  })

  it('shows validation errors', async () => {
    const user = userEvent.setup()
    render(<LoginForm onSubmit={vi.fn()} />)
    
    // Submit empty form
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    
    // Check for validation messages
    expect(screen.getByText(/email is required/i)).toBeInTheDocument()
    expect(screen.getByText(/password is required/i)).toBeInTheDocument()
  })
})
```

### Select and Checkbox
```tsx
it('selects option from dropdown', async () => {
  const user = userEvent.setup()
  render(<Form />)
  
  // Select dropdown
  await user.selectOptions(
    screen.getByRole('combobox', { name: /country/i }),
    'US'
  )
  
  expect(screen.getByRole('combobox')).toHaveValue('US')
})

it('toggles checkbox', async () => {
  const user = userEvent.setup()
  render(<Form />)
  
  const checkbox = screen.getByRole('checkbox', { name: /agree/i })
  
  expect(checkbox).not.toBeChecked()
  
  await user.click(checkbox)
  
  expect(checkbox).toBeChecked()
})
```

## Testing Async Behavior

### Waiting for Loading States
```tsx
it('shows loading then data', async () => {
  render(<UserProfile userId="123" />)
  
  // Initially shows loading
  expect(screen.getByText(/loading/i)).toBeInTheDocument()
  
  // Wait for data to load
  const userName = await screen.findByText(/john doe/i)
  expect(userName).toBeInTheDocument()
  
  // Loading should be gone
  expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
})
```

### Testing with Timers
```tsx
import { vi } from 'vitest'

it('shows notification then hides after timeout', async () => {
  vi.useFakeTimers()
  
  render(<Toast message="Saved!" duration={3000} />)
  
  expect(screen.getByText(/saved/i)).toBeInTheDocument()
  
  // Fast-forward time
  vi.advanceTimersByTime(3000)
  
  expect(screen.queryByText(/saved/i)).not.toBeInTheDocument()
  
  vi.useRealTimers()
})
```

## Mocking

### Mocking API Calls with MSW
```typescript
// mocks/handlers.ts
import { http, HttpResponse } from 'msw'

export const handlers = [
  http.get('/api/users/:id', ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      name: 'John Doe',
      email: 'john@example.com',
    })
  }),
  
  http.post('/api/login', async ({ request }) => {
    const body = await request.json()
    if (body.email === 'test@example.com') {
      return HttpResponse.json({ token: 'fake-token' })
    }
    return HttpResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    )
  }),
]

// mocks/server.ts
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)

// test/setup.ts
import { server } from '../mocks/server'

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

### Mocking Modules
```typescript
// Mock a module
vi.mock('@/lib/analytics', () => ({
  trackEvent: vi.fn(),
}))

// In test
import { trackEvent } from '@/lib/analytics'

it('tracks button click', async () => {
  const user = userEvent.setup()
  render(<AnalyticsButton />)
  
  await user.click(screen.getByRole('button'))
  
  expect(trackEvent).toHaveBeenCalledWith('button_click')
})
```

### Mocking Hooks
```typescript
// Mock a custom hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: '1', name: 'Test User' },
    isAuthenticated: true,
  }),
}))

// Or mock conditionally
import * as authHook from '@/hooks/useAuth'

beforeEach(() => {
  vi.spyOn(authHook, 'useAuth').mockReturnValue({
    user: null,
    isAuthenticated: false,
  })
})
```

## Testing Context Providers

### Wrapper Pattern
```tsx
// test/utils.tsx
import { ReactNode } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { ThemeProvider } from '@/providers/ThemeProvider'
import { AuthProvider } from '@/providers/AuthProvider'

const AllProviders = ({ children }: { children: ReactNode }) => (
  <AuthProvider>
    <ThemeProvider>
      {children}
    </ThemeProvider>
  </AuthProvider>
)

export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllProviders, ...options })
}

// Re-export everything
export * from '@testing-library/react'
export { renderWithProviders as render }
```

### Usage
```tsx
import { render, screen } from '@/test/utils'
import { UserMenu } from './UserMenu'

it('shows user name from context', () => {
  render(<UserMenu />)
  
  expect(screen.getByText(/test user/i)).toBeInTheDocument()
})
```

## Snapshot Testing

```tsx
it('matches snapshot', () => {
  const { container } = render(<Card title="Hello" description="World" />)
  
  expect(container).toMatchSnapshot()
})

// Inline snapshot
it('renders correctly', () => {
  const { container } = render(<Badge>New</Badge>)
  
  expect(container.innerHTML).toMatchInlineSnapshot(
    `"<span class=\"badge badge-default\">New</span>"`
  )
})
```

## Debugging Tips

```tsx
// Print DOM to console
screen.debug()

// Print specific element
screen.debug(screen.getByRole('dialog'))

// Log testing playground URL
screen.logTestingPlaygroundURL()
```

## Related Skills

- [Unit & Integration Testing](unit-integration-testing.md) — Vitest patterns
- [E2E Testing](e2e-playwright.md) — Full application tests
- [Accessibility Testing](accessibility-testing.md) — A11y in tests
