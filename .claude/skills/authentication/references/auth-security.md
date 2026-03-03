# Auth Security Best Practices

## Session Security

```typescript
// Server config — production hardening
export const auth = betterAuth({
  session: {
    expiresIn: 60 * 60 * 24 * 7,     // 7 days max
    updateAge: 60 * 60 * 24,           // Refresh token daily
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60                    // 5 min cookie cache
    }
  },
  
  // Secure cookies in production
  advanced: {
    useSecureCookies: process.env.NODE_ENV === 'production',
    crossSubDomainCookies: {
      enabled: false                    // Set true for *.myapp.com
    }
  }
})
```

## Rate Limiting

```typescript
export const auth = betterAuth({
  rateLimit: {
    window: 60,                         // 60 second window
    max: 10,                            // 10 requests per window
    custom: {
      "sign-in-email": { window: 60, max: 5 },
      "sign-up-email": { window: 300, max: 3 },
      "forgot-password": { window: 600, max: 3 },
      "verify-email": { window: 60, max: 5 },
      "reset-password": { window: 300, max: 3 }
    }
  }
})
```

## CSRF Protection
Better Auth includes CSRF protection by default for state-mutating operations using the `better-auth` CSRF token pattern.

```typescript
// Client automatically sends CSRF token
// No additional setup needed for standard operations

// For custom API routes, check session:
const session = await auth.api.getSession({ headers: await headers() })
if (!session) return new Response('Unauthorized', { status: 401 })
```

## Password Security

```typescript
export const auth = betterAuth({
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    requireEmailVerification: true,     // Require email verification
    
    // Custom password validation
    password: {
      hash: async (password) => {
        // Better Auth uses bcrypt by default (10 rounds)
        // Override only if you need specific hashing
        return await bcrypt.hash(password, 12)
      },
      verify: async (data) => {
        return await bcrypt.compare(data.password, data.hash)
      }
    }
  }
})
```

## Security Checklist

### Authentication
- [ ] Email verification enabled
- [ ] Password minimum length ≥ 8 characters
- [ ] Rate limiting on auth endpoints
- [ ] Account lockout after multiple failed attempts
- [ ] Secure password hashing (bcrypt, argon2)
- [ ] No password hints or suggestions in error messages
  - ❌ "Password is incorrect" 
  - ✅ "Invalid email or password"

### Sessions
- [ ] HTTPS-only cookies in production
- [ ] HttpOnly cookies (can't be accessed by JS)
- [ ] SameSite=Lax or Strict
- [ ] Session expiration (7 days recommended)
- [ ] Session rotation on privilege changes
- [ ] Invalidate all sessions on password change

### OAuth
- [ ] State parameter validated (CSRF protection)
- [ ] Redirect URI strictly validated
- [ ] Token stored securely (not in localStorage)
- [ ] Handle token refresh properly
- [ ] Revoke tokens on logout

### API Security
- [ ] Auth check on every protected endpoint
- [ ] Authorization (not just authentication) — check permissions
- [ ] Input validation on all parameters
- [ ] No sensitive data in URLs or logs
- [ ] Proper error responses (don't leak internal details)

### Infrastructure
- [ ] HTTPS everywhere (no mixed content)
- [ ] CORS configured restrictively  
- [ ] CSP headers set
- [ ] Environment variables for secrets (not in code)
- [ ] Secrets rotated periodically
- [ ] Security headers: `X-Frame-Options`, `X-Content-Type-Options`

## Common Mistakes

```typescript
// ❌ Comparing user IDs without authorization
app.get('/api/users/:id', async (req, res) => {
  const user = await db.users.findById(req.params.id) // Anyone can access any user!
  return res.json(user)
})

// ✅ Check that requesting user has permission
app.get('/api/users/:id', async (req, res) => {
  const session = await getSession(req)
  if (session.user.id !== req.params.id && session.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' })
  }
  const user = await db.users.findById(req.params.id)
  return res.json(user)
})
```
