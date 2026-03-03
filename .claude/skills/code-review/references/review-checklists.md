# Code Review — Checklists & Common Findings

## Review Checklist Templates

### Feature Review
```markdown
## Feature: [Name]
PR: [link]

### Functionality
- [ ] Feature works as described in requirements
- [ ] Edge cases handled (empty, null, max values)
- [ ] Error states handled gracefully
- [ ] Loading states implemented

### Code Quality  
- [ ] No dead code or commented-out code
- [ ] Functions are focused (single responsibility)
- [ ] Naming is clear and consistent
- [ ] No magic numbers (use constants)
- [ ] Types are properly defined (no `any`)

### Tests
- [ ] Unit tests for business logic
- [ ] Integration tests for API endpoints
- [ ] Edge case tests (empty input, invalid data)
- [ ] Error path tests

### Security
- [ ] User input validated
- [ ] Auth/authz checks in place
- [ ] No secrets in code
- [ ] SQL injection / XSS prevented

### Performance
- [ ] No N+1 queries
- [ ] Pagination for lists
- [ ] Images optimized
- [ ] Unnecessary re-renders avoided
```

### Bugfix Review
```markdown
## Bugfix: [Issue Description]
PR: [link]

### Root Cause
- [ ] Root cause clearly identified and documented
- [ ] Fix addresses root cause (not just symptom)

### Verification
- [ ] Regression test added
- [ ] Original bug is confirmed fixed
- [ ] No new issues introduced
- [ ] Related functionality still works

### Impact
- [ ] Change is minimal and focused
- [ ] No unrelated changes mixed in
- [ ] Migration needed? If so, is it reversible?
```

---

## Common Findings

### 1. Missing Error Handling
```typescript
// ❌ FOUND: Unhandled promise rejection
const data = await fetchUser(id)
return data.name

// ✅ FIX: Handle null and errors
const data = await fetchUser(id)
if (!data) throw new NotFoundError(`User ${id} not found`)
return data.name
```

### 2. Overly Broad Type
```typescript
// ❌ FOUND: Using `any` type
function processData(data: any) { ... }

// ✅ FIX: Define proper type
interface ProcessInput { id: string; values: number[] }
function processData(data: ProcessInput) { ... }
```

### 3. Side Effects in Components
```typescript
// ❌ FOUND: API call on every render
function UserList() {
  const [users, setUsers] = useState([])
  fetch('/api/users').then(r => r.json()).then(setUsers) // Infinite loop!
  
// ✅ FIX: Use useEffect or TanStack Query
function UserList() {
  const { data: users } = useQuery({ queryKey: ['users'], queryFn: fetchUsers })
```

### 4. Hardcoded Values
```typescript
// ❌ FOUND: Magic numbers
if (password.length < 8) { ... }
setTimeout(retry, 3000)

// ✅ FIX: Named constants
const MIN_PASSWORD_LENGTH = 8
const RETRY_DELAY_MS = 3000
if (password.length < MIN_PASSWORD_LENGTH) { ... }
setTimeout(retry, RETRY_DELAY_MS)
```

### 5. Missing Cleanup
```typescript
// ❌ FOUND: No cleanup in useEffect
useEffect(() => {
  const ws = new WebSocket(url)
  ws.onmessage = handleMessage
}, [])

// ✅ FIX: Return cleanup function
useEffect(() => {
  const ws = new WebSocket(url)
  ws.onmessage = handleMessage
  return () => ws.close()
}, [])
```

### 6. Insecure Patterns
```typescript
// ❌ FOUND: HTML injection
element.innerHTML = userInput

// ✅ FIX: Use textContent or sanitize
element.textContent = userInput
// or in React, use JSX (auto-escapes)
```

### 7. Missing TypeScript Strict Checks
```typescript
// ❌ FOUND: Optional access without check
function getCity(user: User) {
  return user.address.city // address might be undefined!
}

// ✅ FIX: Null-safe access
function getCity(user: User) {
  return user.address?.city ?? 'Unknown'
}
```

## Giving Good Feedback

```markdown
Structure: [Category] + [What's Wrong] + [Why] + [Suggested Fix]

🔴 MUST FIX: `userInput` is passed directly to `innerHTML` (line 45).
This creates an XSS vulnerability where malicious scripts can be injected.
Fix: Use `textContent` or a sanitization library like DOMPurify.

🟡 SUGGESTION: Consider extracting the retry logic (lines 23-45) into a
`withRetry()` utility function. This pattern is used in 3 other files
and would reduce duplication.

💡 FYI: The `formatDate` utility in `@/lib/utils` already handles this
date formatting. Could simplify line 67.
```
