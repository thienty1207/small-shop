---
name: authentication
description: Authentication & authorization with Better Auth — email/password, OAuth (Google, GitHub, Discord), 2FA/TOTP, passkeys/WebAuthn, magic links, session management, RBAC, organizations/multi-tenant, rate limiting. Framework-agnostic TypeScript. Use for adding auth to any web app.
license: MIT
---

# Authentication Mastery (Better Auth)

Framework-agnostic TypeScript authentication with Better Auth. Supports email/password, social OAuth, 2FA, passkeys, and enterprise features.

## Auth Method Selection

| Method | Use When | Complexity |
|--------|----------|-----------|
| Email/Password | Standard web app, full control | Low |
| OAuth (GitHub/Google) | Quick signup, social integration | Low |
| Magic Link | Passwordless, email-first users | Medium |
| Passkeys/WebAuthn | Maximum security, modern browsers | Medium |
| 2FA/TOTP | Enhanced security requirement | Medium |
| Organization/Multi-tenant | SaaS, team features | High |

## Quick Start

```bash
npm install better-auth
```

```env
BETTER_AUTH_SECRET=<generated-secret-32-chars-min>
BETTER_AUTH_URL=http://localhost:3000
```

### Server Setup
```typescript
// lib/auth.ts
import { betterAuth } from "better-auth"

export const auth = betterAuth({
  database: { /* see references/database-integration.md */ },
  emailAndPassword: { enabled: true, autoSignIn: true },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }
  }
})
```

### Client Setup
```typescript
// lib/auth-client.ts
import { createAuthClient } from "authentication/client"

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3000"
})
```

### Mount API (Next.js)
```typescript
// app/api/auth/[...all]/route.ts
import { auth } from "@/lib/auth"
import { toNextJsHandler } from "authentication/next-js"
export const { POST, GET } = toNextJsHandler(auth)
```

### Basic Usage
```typescript
// Sign up
await authClient.signUp.email({ email, password, name })

// Sign in
await authClient.signIn.email({ email, password })
await authClient.signIn.social({ provider: "github" })

// Session (React hook)
const { data: session } = authClient.useSession()

// Protected route
if (!session) redirect('/login')
```

## Reference Navigation

- **[Email/Password Auth](references/email-password-auth.md)** — Setup, verification, password reset, username auth
- **[OAuth Providers](references/oauth-providers.md)** — Social login, provider config, token management
- **[Advanced Features](references/advanced-features.md)** — 2FA, passkeys, magic links, organizations, RBAC
- **[Database Integration](references/database-integration.md)** — Adapters, schema, migrations for PostgreSQL/MongoDB
- **[Security Best Practices](references/auth-security.md)** — Rate limiting, session management, CSRF, secure cookies

## Implementation Checklist

- [ ] Install `better-auth`, set env vars
- [ ] Create auth server with database config
- [ ] Run `npx @authentication/cli generate` for schema
- [ ] Mount API handler in framework
- [ ] Create client instance
- [ ] Build sign-up/sign-in UI
- [ ] Add session management
- [ ] Set up protected routes/middleware
- [ ] Configure email sending (verification/reset)
- [ ] Enable rate limiting for production
- [ ] Add plugins as needed (regenerate schema after)

## Related Skills

| Skill | When to Use |
|-------|-------------|
| [nextjs-turborepo](../nextjs-turborepo/SKILL.md) | Next.js integration, API routes |
| [databases](../databases/SKILL.md) | User data storage, session management |
| [rust-backend-advance](../rust-backend-advance/SKILL.md) | Rust backend authentication patterns |
| [testing](../testing/SKILL.md) | Authentication flow testing |
