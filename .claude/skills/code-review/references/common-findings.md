# Common Code Review Findings

Quick reference for frequent issues spotted during code reviews.

## Security Issues

### SQL Injection
```typescript
// ❌ VULNERABLE - String interpolation
const query = `SELECT * FROM users WHERE id = ${userId}`

// ✅ SAFE - Parameterized query
const query = `SELECT * FROM users WHERE id = $1`
await db.query(query, [userId])
```

### XSS (Cross-Site Scripting)
```tsx
// ❌ VULNERABLE - Unescaped HTML
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ SAFE - Use DOMPurify for user HTML
import DOMPurify from 'dompurify'
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userInput) }} />

// ✅ BEST - Avoid dangerouslySetInnerHTML entirely
<div>{userInput}</div>
```

### Hardcoded Secrets
```typescript
// ❌ NEVER commit secrets
const apiKey = "sk-1234567890abcdef"

// ✅ Use environment variables
const apiKey = process.env.API_KEY
```

### Missing Authentication
```typescript
// ❌ No auth check
app.get('/admin/users', async (req, res) => {
  const users = await db.query('SELECT * FROM users')
  res.json(users)
})

// ✅ Auth middleware
app.get('/admin/users', requireAuth, requireAdmin, async (req, res) => {
  const users = await db.query('SELECT * FROM users')
  res.json(users)
})
```

## Performance Issues

### N+1 Query Problem
```typescript
// ❌ N+1 queries (1 + N database calls)
const posts = await db.query('SELECT * FROM posts')
for (const post of posts) {
  post.author = await db.query('SELECT * FROM users WHERE id = $1', [post.authorId])
}

// ✅ Single query with JOIN
const posts = await db.query(`
  SELECT posts.*, users.name as author_name 
  FROM posts 
  JOIN users ON posts.author_id = users.id
`)

// ✅ Or batch load with IN clause
const posts = await db.query('SELECT * FROM posts')
const authorIds = [...new Set(posts.map(p => p.authorId))]
const authors = await db.query('SELECT * FROM users WHERE id = ANY($1)', [authorIds])
const authorMap = new Map(authors.map(a => [a.id, a]))
posts.forEach(p => p.author = authorMap.get(p.authorId))
```

### No Pagination
```typescript
// ❌ Loading all records
const users = await db.query('SELECT * FROM users')

// ✅ Paginated with limits
const users = await db.query(
  'SELECT * FROM users ORDER BY id LIMIT $1 OFFSET $2',
  [pageSize, (page - 1) * pageSize]
)
```

### Missing Index
```sql
-- ❌ Full table scan on frequently queried column
SELECT * FROM orders WHERE customer_id = 123;

-- ✅ Add index for frequently queried columns
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
```

### Unnecessary Re-renders (React)
```tsx
// ❌ New object on every render
<Child style={{ color: 'red' }} onClick={() => doSomething()} />

// ✅ Memoize objects and functions
const style = useMemo(() => ({ color: 'red' }), [])
const handleClick = useCallback(() => doSomething(), [])
<Child style={style} onClick={handleClick} />
```

## Code Quality Issues

### Magic Numbers/Strings
```typescript
// ❌ Magic values
if (user.role === 3) { ... }
if (retries > 5) { ... }

// ✅ Named constants
const ADMIN_ROLE = 3
const MAX_RETRIES = 5
if (user.role === ADMIN_ROLE) { ... }
if (retries > MAX_RETRIES) { ... }
```

### Missing Error Handling
```typescript
// ❌ Unhandled promise rejection
async function fetchUser(id: string) {
  const response = await fetch(`/api/users/${id}`)
  return response.json()
}

// ✅ Proper error handling
async function fetchUser(id: string) {
  try {
    const response = await fetch(`/api/users/${id}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch user: ${response.status}`)
    }
    return response.json()
  } catch (error) {
    console.error('fetchUser failed:', error)
    throw error // Re-throw or return null based on requirements
  }
}
```

### Mutating Function Arguments
```typescript
// ❌ Mutates the original array
function addItem(items: Item[], newItem: Item) {
  items.push(newItem)
  return items
}

// ✅ Returns new array (immutable)
function addItem(items: Item[], newItem: Item) {
  return [...items, newItem]
}
```

### Overly Complex Conditionals
```typescript
// ❌ Hard to read
if (user && user.role && (user.role === 'admin' || user.role === 'superadmin') && user.active && !user.suspended) {
  // ...
}

// ✅ Extract to readable functions
const isAdmin = (user: User) => ['admin', 'superadmin'].includes(user?.role)
const isActiveUser = (user: User) => user?.active && !user?.suspended

if (isAdmin(user) && isActiveUser(user)) {
  // ...
}
```

## TypeScript Issues

### Using `any`
```typescript
// ❌ Avoids type checking
function process(data: any) { ... }

// ✅ Define proper types
interface UserData {
  id: string
  name: string
}
function process(data: UserData) { ... }

// ✅ If truly unknown, use unknown with type narrowing
function process(data: unknown) {
  if (isUserData(data)) {
    // data is now typed as UserData
  }
}
```

### Non-null Assertion Overuse
```typescript
// ❌ Dangerous assumption
const user = users.find(u => u.id === id)!
console.log(user.name) // Runtime error if not found

// ✅ Handle the null case
const user = users.find(u => u.id === id)
if (!user) {
  throw new Error(`User ${id} not found`)
}
console.log(user.name)
```

## React-Specific Issues

### Missing Key Prop
```tsx
// ❌ No key or using index as key
{items.map((item, index) => <Item key={index} {...item} />)}

// ✅ Use stable unique identifier
{items.map(item => <Item key={item.id} {...item} />)}
```

### useEffect Dependency Issues
```tsx
// ❌ Missing dependency (stale closure)
useEffect(() => {
  fetchData(userId)
}, []) // Should include userId

// ❌ Object dependency causes infinite loop
useEffect(() => {
  doSomething(options)
}, [options]) // options is new object each render

// ✅ Correct dependencies
useEffect(() => {
  fetchData(userId)
}, [userId])

// ✅ Memoize object dependencies
const options = useMemo(() => ({ limit: 10 }), [])
useEffect(() => {
  doSomething(options)
}, [options])
```

## Related Skills

- [Security Testing](../../testing/references/security-testing.md) — Automated security checks
- [Debugging Tools](../../debugging/references/debugging-tools.md) — Finding root causes
- [PostgreSQL Optimization](../../databases/references/postgresql-optimization.md) — Query performance
