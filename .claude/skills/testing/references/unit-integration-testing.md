# Unit & Integration Testing with Vitest

## Setup

```bash
npm install -D vitest @vitest/coverage-v8 @vitest/ui
```

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',  // or 'node' for backend
    coverage: { provider: 'v8', reporter: ['text', 'html'] },
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}']
  }
})
```

## Unit Test Patterns

### Pure Functions
```typescript
import { describe, it, expect } from 'vitest'
import { calculateTotal, formatCurrency } from './utils'

describe('calculateTotal', () => {
  it('sums items with tax', () => {
    const items = [{ price: 10, qty: 2 }, { price: 5, qty: 1 }]
    expect(calculateTotal(items, 0.1)).toBe(27.5) // (20+5) * 1.1
  })

  it('returns 0 for empty cart', () => {
    expect(calculateTotal([], 0.1)).toBe(0)
  })

  it('throws on negative tax rate', () => {
    expect(() => calculateTotal([], -0.1)).toThrow('Invalid tax rate')
  })
})
```

### Mocking
```typescript
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { fetchUser } from './api'
import { getUserProfile } from './userService'

vi.mock('./api')
const mockFetchUser = vi.mocked(fetchUser)

describe('getUserProfile', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns formatted profile', async () => {
    mockFetchUser.mockResolvedValue({ id: 1, name: 'Alice', email: 'a@b.com' })
    const profile = await getUserProfile(1)
    expect(profile).toEqual({ id: 1, displayName: 'Alice', email: 'a@b.com' })
    expect(mockFetchUser).toHaveBeenCalledWith(1)
  })

  it('handles API error', async () => {
    mockFetchUser.mockRejectedValue(new Error('Network error'))
    await expect(getUserProfile(1)).rejects.toThrow('Failed to load profile')
  })
})
```

### Spies & Stubs
```typescript
const spy = vi.spyOn(console, 'log')
myFunction()
expect(spy).toHaveBeenCalledWith('expected output')
spy.mockRestore()

// Timer mocking
vi.useFakeTimers()
const callback = vi.fn()
setTimeout(callback, 1000)
vi.advanceTimersByTime(1000)
expect(callback).toHaveBeenCalled()
vi.useRealTimers()
```

## Integration Testing with MSW

```typescript
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

const handlers = [
  http.get('/api/users/:id', ({ params }) => {
    return HttpResponse.json({ id: params.id, name: 'Alice' })
  }),
  http.post('/api/orders', async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({ id: 'order-123', ...body }, { status: 201 })
  }),
  http.get('/api/error', () => {
    return HttpResponse.json({ error: 'Not Found' }, { status: 404 })
  })
]

const server = setupServer(...handlers)
beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('API Integration', () => {
  it('fetches user data', async () => {
    const response = await fetch('/api/users/1')
    const data = await response.json()
    expect(data.name).toBe('Alice')
  })

  it('handles server errors', async () => {
    server.use(
      http.get('/api/users/:id', () => {
        return HttpResponse.json(null, { status: 500 })
      })
    )
    const response = await fetch('/api/users/1')
    expect(response.status).toBe(500)
  })
})
```

## Test Data Factories

```typescript
// test/factories.ts
let nextId = 1

export function createUser(overrides = {}) {
  return {
    id: nextId++,
    name: `User ${nextId}`,
    email: `user${nextId}@example.com`,
    role: 'user' as const,
    createdAt: new Date().toISOString(),
    ...overrides
  }
}

export function createOrder(overrides = {}) {
  return {
    id: `order-${nextId++}`,
    userId: 1,
    items: [{ productId: 'p1', qty: 1, price: 29.99 }],
    total: 29.99,
    status: 'pending' as const,
    ...overrides
  }
}

// Usage in tests
const admin = createUser({ role: 'admin' })
const bigOrder = createOrder({ total: 999.99, status: 'completed' })
```

## Assertion Patterns

```typescript
// Object matching
expect(result).toEqual({ name: 'Alice', age: 30 })
expect(result).toMatchObject({ name: 'Alice' }) // partial
expect(result).toHaveProperty('name', 'Alice')

// Arrays
expect(items).toHaveLength(3)
expect(items).toContain('apple')
expect(items).toEqual(expect.arrayContaining(['apple', 'banana']))

// Async
await expect(asyncFn()).resolves.toBe(42)
await expect(asyncFn()).rejects.toThrow('error')

// Snapshots (use sparingly)
expect(component).toMatchSnapshot()
expect(data).toMatchInlineSnapshot(`{ "name": "Alice" }`)
```
