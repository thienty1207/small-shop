# Better Auth — Advanced Features

## Two-Factor Authentication (2FA)

### Server Setup
```typescript
import { betterAuth } from "better-auth"
import { twoFactor } from "authentication/plugins"

export const auth = betterAuth({
  plugins: [
    twoFactor({
      issuer: "MyApp",
      otpOptions: { period: 30, digits: 6 }
    })
  ]
})
```

### Client Flow
```typescript
import { createAuthClient } from "authentication/client"
import { twoFactorClient } from "authentication/client/plugins"

const authClient = createAuthClient({
  plugins: [twoFactorClient()]
})

// Enable 2FA: returns QR code URI
const { data } = await authClient.twoFactor.enable({ password: "current-password" })
// Show data.totpURI as QR code (use qrcode library)

// Verify during login
await authClient.twoFactor.verifyTotp({ code: "123456" })

// Disable 2FA
await authClient.twoFactor.disable({ password: "current-password" })
```

## Passkeys (WebAuthn)

### Server Setup
```typescript
import { passkey } from "authentication/plugins"

export const auth = betterAuth({
  plugins: [
    passkey({
      rpID: "myapp.com",
      rpName: "My App",
      origin: "https://myapp.com"
    })
  ]
})
```

### Client Flow
```typescript
import { passkeyClient } from "authentication/client/plugins"

const authClient = createAuthClient({
  plugins: [passkeyClient()]
})

// Register passkey
await authClient.passkey.addPasskey()

// Sign in with passkey
await authClient.signIn.passkey()
```

## Organizations (Multi-Tenant)

### Server Setup
```typescript
import { organization } from "authentication/plugins"

export const auth = betterAuth({
  plugins: [
    organization({
      roles: {
        owner: { permissions: ["*"] },
        admin: { permissions: ["member:manage", "settings:edit"] },
        member: { permissions: ["content:read", "content:create"] }
      }
    })
  ]
})
```

### Usage
```typescript
import { organizationClient } from "authentication/client/plugins"

const authClient = createAuthClient({
  plugins: [organizationClient()]
})

// Create organization
await authClient.organization.create({ name: "My Team", slug: "my-team" })

// Invite member
await authClient.organization.inviteMember({
  email: "user@example.com",
  role: "member",
  organizationId: "org-id"
})

// Set active organization
await authClient.organization.setActive({ organizationId: "org-id" })

// Check permissions
const session = await authClient.useSession()
const canManage = session.data?.user.permissions?.includes("member:manage")
```

## Magic Links

```typescript
// Server
import { magicLink } from "authentication/plugins"

export const auth = betterAuth({
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, token, url }) => {
        await sendEmail({
          to: email,
          subject: "Sign in to MyApp",
          html: `<a href="${url}">Click here to sign in</a>`
        })
      }
    })
  ]
})

// Client
await authClient.signIn.magicLink({ email: "user@example.com" })
```

## Session Management

```typescript
// Server config
export const auth = betterAuth({
  session: {
    expiresIn: 60 * 60 * 24 * 7,     // 7 days
    updateAge: 60 * 60 * 24,           // Refresh daily
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60                    // 5 min cache
    }
  }
})

// Client: useSession hook
const { data: session, isPending, error } = authClient.useSession()

// Middleware protection (Next.js)
import { auth } from "@/lib/auth"
import { headers } from "next/headers"

export async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")
  return session
}
```

## Rate Limiting

```typescript
export const auth = betterAuth({
  rateLimit: {
    window: 60,          // 60 second window
    max: 10,             // 10 requests per window
    custom: {
      "sign-in": { window: 60, max: 5 },
      "sign-up": { window: 300, max: 3 },
      "forgot-password": { window: 600, max: 3 }
    }
  }
})
```

## Plugin Composition Pattern
```typescript
// Combine multiple features
export const auth = betterAuth({
  emailAndPassword: { enabled: true },
  socialProviders: { github: {...}, google: {...} },
  plugins: [
    twoFactor(),
    passkey({ rpID: "myapp.com" }),
    organization({ roles: {...} }),
    magicLink({ sendMagicLink: async (...) => {...} })
  ]
})

// IMPORTANT: After adding plugins, regenerate schema:
// npx @authentication/cli generate
```
