# Better Auth — Email/Password & OAuth

## Email/Password Setup

### Server Configuration
```typescript
import { betterAuth } from "better-auth"

export const auth = betterAuth({
  database: {
    provider: "pg",
    url: process.env.DATABASE_URL!
  },
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Reset your password",
        html: `<a href="${url}">Click here to reset your password</a>`
      })
    }
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Verify your email",
        html: `<a href="${url}">Click here to verify your email</a>`
      })
    }
  }
})
```

### Client Usage
```typescript
import { authClient } from "@/lib/auth-client"

// Sign up
const { data, error } = await authClient.signUp.email({
  email: "user@example.com",
  password: "SecureP@ssw0rd",
  name: "Alice"
})

// Sign in
const { data, error } = await authClient.signIn.email({
  email: "user@example.com",
  password: "SecureP@ssw0rd"
})

// Sign out
await authClient.signOut()

// Forgot password (sends reset email)
await authClient.forgetPassword({ email: "user@example.com" })

// Reset password (from reset link)
await authClient.resetPassword({
  newPassword: "NewSecureP@ssw0rd",
  token: "reset-token-from-url"
})

// Change password (while logged in)
await authClient.changePassword({
  currentPassword: "old-password",
  newPassword: "new-password"
})
```

---

## OAuth Providers

### Server Configuration
```typescript
export const auth = betterAuth({
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!
    },
    discord: {
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!
    }
  }
})
```

### Client Usage
```typescript
// Social sign-in (redirect-based)
await authClient.signIn.social({
  provider: "github",
  callbackURL: "/dashboard"  // Where to go after successful auth
})

await authClient.signIn.social({
  provider: "google",
  callbackURL: "/dashboard"
})
```

### OAuth Provider Setup

#### GitHub
1. Go to GitHub Settings → Developer Settings → OAuth Apps → New OAuth App
2. Set Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
3. Copy Client ID and Client Secret

#### Google
1. Go to Google Cloud Console → APIs & Services → Credentials → Create OAuth Client ID
2. Application type: Web application
3. Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
4. Copy Client ID and Client Secret

#### Discord
1. Go to Discord Developer Portal → Applications → New Application
2. OAuth2 → Redirects: `http://localhost:3000/api/auth/callback/discord`
3. Copy Client ID and Client Secret

### Session Hook (React)
```tsx
"use client"
import { authClient } from "@/lib/auth-client"

export function UserProfile() {
  const { data: session, isPending } = authClient.useSession()

  if (isPending) return <div>Loading...</div>
  if (!session) return <a href="/login">Sign in</a>

  return (
    <div>
      <p>Welcome, {session.user.name}!</p>
      <p>{session.user.email}</p>
      {session.user.image && <img src={session.user.image} alt="Avatar" />}
      <button onClick={() => authClient.signOut()}>Sign out</button>
    </div>
  )
}
```

### Protected Pages (Server-Side)
```typescript
// lib/auth-utils.ts
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

export async function requireAuth() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")
  return session
}

// Usage in page
export default async function DashboardPage() {
  const session = await requireAuth()
  return <h1>Welcome {session.user.name}</h1>
}
```
