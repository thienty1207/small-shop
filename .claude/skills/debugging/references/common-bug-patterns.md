# Common Bug Patterns

## 1. Race Conditions

```typescript
// ❌ BAD: Two requests can create duplicate users
app.post('/users', async (req, res) => {
  const exists = await db.users.findByEmail(req.body.email)
  if (!exists) {
    await db.users.create(req.body) // Another request might squeeze in!
  }
})

// ✅ FIX: Use database-level unique constraint + upsert
app.post('/users', async (req, res) => {
  try {
    await db.users.create(req.body) // DB enforces uniqueness
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'User exists' })
    throw e
  }
})
```

## 2. Off-by-One Errors

```typescript
// ❌ BAD: Skips last element
for (let i = 0; i < items.length - 1; i++) { ... }

// ❌ BAD: Array index out of bounds  
const last = items[items.length] // undefined!

// ✅ FIX
for (let i = 0; i < items.length; i++) { ... }
const last = items[items.length - 1]
const last = items.at(-1) // Modern JS
```

## 3. Null/Undefined Reference

```typescript
// ❌ BAD: Crashes if user or address is null
const city = user.address.city

// ✅ FIX: Optional chaining + default
const city = user?.address?.city ?? 'Unknown'

// ✅ FIX: Validate early
if (!user?.address) throw new Error('User address required')
```

## 4. Async/Await Mistakes

```typescript
// ❌ BAD: forEach doesn't await
items.forEach(async (item) => {
  await processItem(item) // These run in parallel, not sequential!
})

// ✅ FIX: Serial processing
for (const item of items) {
  await processItem(item)
}

// ✅ FIX: Parallel processing (intentional)
await Promise.all(items.map(item => processItem(item)))

// ❌ BAD: Missing error handling
const data = await fetchData() // Throws on network error!

// ✅ FIX: try/catch or .catch()
try {
  const data = await fetchData()
} catch (error) {
  console.error('Fetch failed:', error)
  return fallbackData
}
```

## 5. Stale Closures (React)

```typescript
// ❌ BAD: count is stale in the closure
const [count, setCount] = useState(0)
useEffect(() => {
  const id = setInterval(() => {
    console.log(count) // Always logs initial value (0)!
    setCount(count + 1) // Always sets to 1!
  }, 1000)
  return () => clearInterval(id)
}, []) // Empty deps = stale

// ✅ FIX: Use functional updater
setCount(prev => prev + 1)

// ✅ FIX: Include in dependency array
useEffect(() => { ... }, [count])
```

## 6. N+1 Query Problem

```typescript
// ❌ BAD: 1 query for users + N queries for orders
const users = await db.users.findAll()
for (const user of users) {
  user.orders = await db.orders.findByUserId(user.id) // N queries!
}

// ✅ FIX: Single JOIN query
const users = await db.query(`
  SELECT u.*, json_agg(o) as orders 
  FROM users u 
  LEFT JOIN orders o ON u.id = o.user_id 
  GROUP BY u.id
`)

// ✅ FIX: Batch loader (DataLoader pattern)
const ordersByUser = await db.orders.findByUserIds(users.map(u => u.id))
```

## 7. Memory Leaks

```typescript
// ❌ BAD: Event listener never cleaned up
useEffect(() => {
  window.addEventListener('resize', handleResize)
}, [])

// ✅ FIX: Cleanup function
useEffect(() => {
  window.addEventListener('resize', handleResize)
  return () => window.removeEventListener('resize', handleResize)
}, [])

// ❌ BAD: Timer never cleared  
useEffect(() => {
  setInterval(pollData, 5000)
}, [])

// ✅ FIX
useEffect(() => {
  const id = setInterval(pollData, 5000)
  return () => clearInterval(id)
}, [])
```

## 8. Type Coercion Bugs (JavaScript)

```typescript
// Surprise results
"5" + 3    // "53" (string concat)
"5" - 3    // 2 (numeric subtraction)
"" == false // true
0 == false  // true
null == undefined // true

// ✅ Always use strict equality
"5" === 5  // false
0 === false // false

// ✅ Explicit conversion
Number("5") + 3 // 8
String(42)      // "42"
Boolean("")     // false
```

## Quick Diagnosis Matrix

| Symptom | Likely Bug Pattern | Investigation |
|---------|-------------------|---------------|
| Works sometimes, fails sometimes | Race condition | Add logging with timestamps |
| Off by one, missing last item | Off-by-one | Check loop bounds and indices |
| Cannot read property of undefined | Null reference | Check data flow, add validation |
| Data is stale or wrong | Stale closure / cache | Check deps array, cache invalidation |
| Gets slower over time | Memory leak / N+1 | Profile memory, check query count |
| Works in dev, fails in prod | Env config | Check env vars, CORS, SSL |
