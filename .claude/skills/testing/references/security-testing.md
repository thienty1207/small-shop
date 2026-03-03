# Security Testing

Testing web applications for security vulnerabilities.

## OWASP Top 10 Testing

### 1. Injection (SQL, NoSQL, Command)

#### SQL Injection Test
```typescript
// Manual test cases
const sqlInjectionPayloads = [
  "' OR '1'='1",
  "'; DROP TABLE users; --",
  "1; SELECT * FROM users",
  "admin'--",
  "1 UNION SELECT * FROM passwords",
]

// Automated test
test('SQL injection protection', async () => {
  for (const payload of sqlInjectionPayloads) {
    const response = await fetch('/api/users/search', {
      method: 'POST',
      body: JSON.stringify({ query: payload }),
    })
    
    // Should not return 500 (indicates unhandled injection)
    expect(response.status).not.toBe(500)
    
    // Should not leak data
    const data = await response.json()
    expect(data).not.toHaveProperty('password')
  }
})
```

#### Command Injection Test
```typescript
const commandInjectionPayloads = [
  "; ls -la",
  "| cat /etc/passwd",
  "`whoami`",
  "$(rm -rf /)",
]

test('command injection protection', async () => {
  for (const payload of commandInjectionPayloads) {
    const response = await fetch('/api/export', {
      method: 'POST',
      body: JSON.stringify({ filename: payload }),
    })
    
    expect(response.status).toBe(400) // Should be rejected
  }
})
```

### 2. Broken Authentication

```typescript
describe('Authentication Security', () => {
  test('rate limits login attempts', async () => {
    const attempts = []
    
    for (let i = 0; i < 10; i++) {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'wrong-password',
        }),
      })
      attempts.push(response.status)
    }
    
    // Should eventually return 429 Too Many Requests
    expect(attempts).toContain(429)
  })
  
  test('session invalidated on logout', async () => {
    // Login
    const loginRes = await fetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'user@test.com', password: 'password' }),
    })
    const { token } = await loginRes.json()
    
    // Logout
    await fetch('/api/auth/logout', {
      headers: { Authorization: `Bearer ${token}` },
    })
    
    // Try to use old token
    const response = await fetch('/api/protected', {
      headers: { Authorization: `Bearer ${token}` },
    })
    
    expect(response.status).toBe(401)
  })
  
  test('password reset token expires', async () => {
    // Request reset
    await fetch('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' }),
    })
    
    // Simulate expired token (wait or use test clock)
    const expiredToken = 'expired-test-token'
    
    const response = await fetch('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        token: expiredToken,
        password: 'new-password',
      }),
    })
    
    expect(response.status).toBe(400)
  })
})
```

### 3. Cross-Site Scripting (XSS)

```typescript
const xssPayloads = [
  '<script>alert("XSS")</script>',
  '<img src=x onerror=alert("XSS")>',
  '<svg onload=alert("XSS")>',
  'javascript:alert("XSS")',
  '"><script>alert("XSS")</script>',
  "'-alert('XSS')-'",
]

test('XSS protection in user content', async ({ page }) => {
  for (const payload of xssPayloads) {
    // Submit malicious content
    await page.goto('/posts/new')
    await page.fill('input[name="title"]', payload)
    await page.fill('textarea[name="content"]', payload)
    await page.click('button[type="submit"]')
    
    // Verify it's escaped, not executed
    await page.goto('/posts/1')
    
    // Should not trigger alert
    page.on('dialog', () => {
      throw new Error('XSS vulnerability detected!')
    })
    
    // Content should be escaped
    const html = await page.content()
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;') // Escaped
  }
})
```

### 4. Cross-Site Request Forgery (CSRF)

```typescript
test('CSRF protection on state-changing requests', async () => {
  // Request without CSRF token
  const response = await fetch('/api/user/delete', {
    method: 'POST',
    credentials: 'include',
    // No CSRF token
  })
  
  expect(response.status).toBe(403)
})

test('CSRF token is validated', async () => {
  // Request with invalid token
  const response = await fetch('/api/user/update', {
    method: 'POST',
    headers: {
      'X-CSRF-Token': 'invalid-token',
    },
    credentials: 'include',
  })
  
  expect(response.status).toBe(403)
})
```

### 5. Security Misconfiguration

```typescript
describe('Security Headers', () => {
  test('has secure headers', async () => {
    const response = await fetch('/')
    const headers = response.headers
    
    // Content Security Policy
    expect(headers.get('Content-Security-Policy')).toBeTruthy()
    
    // Prevent clickjacking
    expect(headers.get('X-Frame-Options')).toBe('DENY')
    
    // Prevent MIME type sniffing
    expect(headers.get('X-Content-Type-Options')).toBe('nosniff')
    
    // Enable browser XSS protection
    expect(headers.get('X-XSS-Protection')).toBe('1; mode=block')
    
    // Enforce HTTPS
    expect(headers.get('Strict-Transport-Security')).toContain('max-age=')
    
    // Restrict referrer
    expect(headers.get('Referrer-Policy')).toBeTruthy()
  })
  
  test('no sensitive info in error responses', async () => {
    const response = await fetch('/api/nonexistent')
    const data = await response.json()
    
    // Should not expose stack traces
    expect(JSON.stringify(data)).not.toContain('at ')
    expect(JSON.stringify(data)).not.toContain('.js:')
    
    // Should not expose internal paths
    expect(JSON.stringify(data)).not.toContain('/home/')
    expect(JSON.stringify(data)).not.toContain('node_modules')
  })
  
  test('debug mode disabled in production', async () => {
    const response = await fetch('/__debug')
    expect(response.status).toBe(404)
    
    const errorResponse = await fetch('/api/error-test')
    const data = await errorResponse.json()
    expect(data).not.toHaveProperty('stack')
  })
})
```

### 6. Sensitive Data Exposure

```typescript
describe('Data Protection', () => {
  test('passwords not exposed in responses', async () => {
    const response = await fetch('/api/users/me')
    const user = await response.json()
    
    expect(user).not.toHaveProperty('password')
    expect(user).not.toHaveProperty('passwordHash')
    expect(JSON.stringify(user)).not.toMatch(/\$2[aby]?\$/)  // bcrypt hash pattern
  })
  
  test('sensitive data masked in logs', async () => {
    // This would be tested against your logging system
    const logOutput = await getLogs()
    
    expect(logOutput).not.toMatch(/password[=:]\s*[^*]/)
    expect(logOutput).not.toMatch(/apiKey[=:]\s*[^*]/)
    expect(logOutput).not.toMatch(/secret[=:]\s*[^*]/)
  })
  
  test('API keys not exposed to client', async () => {
    const response = await fetch('/')
    const html = await response.text()
    
    // Should not contain API keys
    expect(html).not.toMatch(/sk_live_/)
    expect(html).not.toMatch(/AKIA[A-Z0-9]{16}/)  // AWS key pattern
    expect(html).not.toMatch(/AIza[A-Za-z0-9_-]{35}/)  // Google API key
  })
})
```

### 7. Broken Access Control

```typescript
describe('Access Control', () => {
  test('cannot access other user resources', async () => {
    // Login as user A
    const userAToken = await loginAsUser('user-a@test.com')
    
    // Try to access user B's data
    const response = await fetch('/api/users/user-b-id/private', {
      headers: { Authorization: `Bearer ${userAToken}` },
    })
    
    expect(response.status).toBe(403)
  })
  
  test('admin endpoints require admin role', async () => {
    const regularUserToken = await loginAsUser('regular@test.com')
    
    const response = await fetch('/api/admin/users', {
      headers: { Authorization: `Bearer ${regularUserToken}` },
    })
    
    expect(response.status).toBe(403)
  })
  
  test('IDOR protection on direct object references', async () => {
    const userToken = await loginAsUser('test@test.com')
    
    // Try sequential IDs
    const responses = await Promise.all([
      fetch('/api/orders/1', { headers: { Authorization: `Bearer ${userToken}` } }),
      fetch('/api/orders/2', { headers: { Authorization: `Bearer ${userToken}` } }),
      fetch('/api/orders/999', { headers: { Authorization: `Bearer ${userToken}` } }),
    ])
    
    // Should only return user's own orders
    for (const response of responses) {
      if (response.status === 200) {
        const order = await response.json()
        expect(order.userId).toBe('current-user-id')
      }
    }
  })
})
```

## Automated Security Scanning

### OWASP ZAP Integration
```bash
# Docker-based scan
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t https://your-app.com \
  -r report.html
```

### In CI Pipeline
```yaml
# .github/workflows/security.yml
name: Security Scan

on: [push]

jobs:
  zap-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: zaproxy/action-baseline@v0.10.0
        with:
          target: 'https://staging.your-app.com'
          rules_file_name: '.zap/rules.tsv'
  
  dependency-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm audit --audit-level=high
      
  secret-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          extra_args: --only-verified
```

## Security Test Checklist

```markdown
Authentication:
- [ ] Brute force protection (rate limiting)
- [ ] Session timeout
- [ ] Secure password requirements
- [ ] Password reset security

Authorization:
- [ ] Role-based access enforced
- [ ] IDOR protection
- [ ] Admin functions protected

Input Validation:
- [ ] SQL injection prevented
- [ ] XSS prevented
- [ ] Command injection prevented
- [ ] File upload restrictions

Data Protection:
- [ ] HTTPS enforced
- [ ] Sensitive data encrypted
- [ ] No secrets in code/logs
- [ ] Secure cookies (HttpOnly, Secure, SameSite)

Headers:
- [ ] CSP configured
- [ ] HSTS enabled
- [ ] X-Frame-Options set
- [ ] X-Content-Type-Options set
```

## Related Skills

- [Auth Security](../../authentication/references/auth-security.md) — Authentication security
- [Common Bug Patterns](../../debugging/references/common-bug-patterns.md) — Security-related bugs
- [Test Strategy](test-strategy-guide.md) — Security in test planning
