# OAuth Providers Configuration

Setting up social authentication with Better Auth.

## Provider Setup Overview

| Provider | Difficulty | Notes |
|----------|------------|-------|
| GitHub | Easy | Best for developer-focused apps |
| Google | Easy | Most universal, requires verification |
| Discord | Easy | Gaming/community apps |
| Apple | Medium | Required for iOS apps |
| Microsoft | Medium | Enterprise/B2B apps |
| Twitter/X | Medium | Social apps |

## GitHub OAuth

### 1. Create GitHub OAuth App
1. Go to GitHub → Settings → Developer Settings → OAuth Apps
2. Click "New OAuth App"
3. Fill in:
   - Application name: `My App`
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
4. Save Client ID and generate Client Secret

### 2. Configure Better Auth
```typescript
// lib/auth.ts
import { betterAuth } from "better-auth"

export const auth = betterAuth({
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      // Optional: Request additional scopes
      scope: ["user:email", "read:user"],
    },
  },
})
```

### 3. Environment Variables
```env
GITHUB_CLIENT_ID=Ov23li...
GITHUB_CLIENT_SECRET=abc123...
```

### 4. Client Usage
```typescript
import { authClient } from "@/lib/auth-client"

// Trigger GitHub login
await authClient.signIn.social({
  provider: "github",
  callbackURL: "/dashboard", // Where to redirect after login
})
```

## Google OAuth

### 1. Create Google OAuth Credentials
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create project or select existing
3. APIs & Services → Credentials → Create Credentials → OAuth client ID
4. Application type: Web application
5. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://yourdomain.com/api/auth/callback/google`
6. Save Client ID and Client Secret

### 2. Configure Consent Screen
1. OAuth consent screen → Configure
2. Add scopes: `email`, `profile`, `openid`
3. For production: Submit for verification

### 3. Configure Better Auth
```typescript
export const auth = betterAuth({
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // Optional: Force account selection
      prompt: "select_account",
      // Optional: Restrict to specific domain
      hostedDomain: "company.com",
    },
  },
})
```

### 4. Environment Variables
```env
GOOGLE_CLIENT_ID=123456789.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
```

## Discord OAuth

### 1. Create Discord Application
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. New Application
3. OAuth2 → Add redirect:
   - `http://localhost:3000/api/auth/callback/discord`
4. Copy Client ID and reset/copy Client Secret

### 2. Configure Better Auth
```typescript
export const auth = betterAuth({
  socialProviders: {
    discord: {
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      // Optional scopes
      scope: ["identify", "email", "guilds"],
    },
  },
})
```

### 3. Environment Variables
```env
DISCORD_CLIENT_ID=123456789012345678
DISCORD_CLIENT_SECRET=abcdef...
```

## Apple Sign In

### 1. Apple Developer Setup
1. [Apple Developer](https://developer.apple.com) → Certificates, IDs & Profiles
2. Create App ID with Sign In with Apple capability
3. Create Service ID for web authentication
4. Create private key for Sign In with Apple

### 2. Configure Better Auth
```typescript
export const auth = betterAuth({
  socialProviders: {
    apple: {
      clientId: process.env.APPLE_CLIENT_ID!, // Service ID
      clientSecret: process.env.APPLE_CLIENT_SECRET!, // Generated JWT
      // Apple requires additional config
      teamId: process.env.APPLE_TEAM_ID!,
      keyId: process.env.APPLE_KEY_ID!,
      privateKey: process.env.APPLE_PRIVATE_KEY!,
    },
  },
})
```

### 3. Generating Apple Client Secret
```typescript
// Apple requires a JWT as client secret, rotated every 6 months
import jwt from 'jsonwebtoken'

const clientSecret = jwt.sign(
  {
    iss: APPLE_TEAM_ID,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400 * 180, // 6 months
    aud: 'https://appleid.apple.com',
    sub: APPLE_CLIENT_ID,
  },
  APPLE_PRIVATE_KEY,
  {
    algorithm: 'ES256',
    header: { alg: 'ES256', kid: APPLE_KEY_ID },
  }
)
```

## Microsoft OAuth

### 1. Azure AD Setup
1. [Azure Portal](https://portal.azure.com) → Azure Active Directory
2. App registrations → New registration
3. Add redirect URI: `http://localhost:3000/api/auth/callback/microsoft`
4. Certificates & secrets → New client secret

### 2. Configure Better Auth
```typescript
export const auth = betterAuth({
  socialProviders: {
    microsoft: {
      clientId: process.env.MICROSOFT_CLIENT_ID!,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
      // Tenant: "common" | "organizations" | "consumers" | specific-tenant-id
      tenant: "common",
    },
  },
})
```

## Multiple Providers Example

```typescript
export const auth = betterAuth({
  database: { /* ... */ },
  
  emailAndPassword: {
    enabled: true,
  },
  
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    discord: {
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    },
  },
})
```

## Login UI Component

```tsx
"use client"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { GithubIcon, GoogleIcon, DiscordIcon } from "@/components/icons"

export function SocialLoginButtons() {
  const handleSocialLogin = async (provider: "github" | "google" | "discord") => {
    await authClient.signIn.social({
      provider,
      callbackURL: "/dashboard",
    })
  }

  return (
    <div className="space-y-3">
      <Button 
        variant="outline" 
        className="w-full"
        onClick={() => handleSocialLogin("github")}
      >
        <GithubIcon className="w-5 h-5 mr-2" />
        Continue with GitHub
      </Button>
      
      <Button 
        variant="outline" 
        className="w-full"
        onClick={() => handleSocialLogin("google")}
      >
        <GoogleIcon className="w-5 h-5 mr-2" />
        Continue with Google
      </Button>
      
      <Button 
        variant="outline" 
        className="w-full"
        onClick={() => handleSocialLogin("discord")}
      >
        <DiscordIcon className="w-5 h-5 mr-2" />
        Continue with Discord
      </Button>
    </div>
  )
}
```

## Account Linking

### Linking Additional Providers
```typescript
// User is already logged in, link another provider
await authClient.linkSocialAccount({
  provider: "github",
  callbackURL: "/settings/accounts",
})
```

### Handling Existing Accounts
```typescript
export const auth = betterAuth({
  socialProviders: { /* ... */ },
  
  // What to do when email already exists
  account: {
    // Options: "link" | "error" | "new"
    existingUserBehavior: "link",
  },
})
```

## Token Management

### Accessing Provider Tokens
```typescript
// Server-side: Get provider access token
const account = await auth.api.getAccounts({ userId: user.id })
const githubAccount = account.find(a => a.provider === "github")
const accessToken = githubAccount?.accessToken

// Use token to call provider API
const repos = await fetch("https://api.github.com/user/repos", {
  headers: { Authorization: `Bearer ${accessToken}` },
})
```

### Refreshing Tokens
```typescript
// Some providers support refresh tokens
const refreshedAccount = await auth.api.refreshAccessToken({
  accountId: githubAccount.id,
})
```

## Callback URL Configuration

```env
# Development
BETTER_AUTH_URL=http://localhost:3000

# Production (update OAuth app settings too!)
BETTER_AUTH_URL=https://myapp.com
```

Callback URL pattern: `{BETTER_AUTH_URL}/api/auth/callback/{provider}`

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Redirect URI mismatch | Ensure callback URLs match exactly in provider settings |
| Invalid client | Check Client ID/Secret, ensure no extra whitespace |
| Scope not authorized | Request scope approval in provider console |
| CORS errors | Ensure proper origin configuration |

## Related Skills

- [Email/Password Auth](email-password-auth.md) — Email-based auth
- [Auth Security](auth-security.md) — Security best practices
- [Database Integration](database-integration.md) — Storing user data
