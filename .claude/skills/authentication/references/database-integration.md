# Better Auth — Database Integration

## Adapter Selection

| Database | Adapter | Package |
|----------|---------|---------|
| PostgreSQL | pg / Drizzle / Prisma | Built-in |
| MySQL | mysql2 / Drizzle / Prisma | Built-in |
| SQLite | better-sqlite3 / Drizzle | Built-in |
| MongoDB | mongodb | `authentication/adapters/mongodb` |

## PostgreSQL Setup

### Direct (pg adapter)
```typescript
import { betterAuth } from "better-auth"
import { Pool } from "pg"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export const auth = betterAuth({
  database: pool
})
```

### Drizzle ORM
```typescript
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "authentication/adapters/drizzle"
import { db } from "@/lib/db" // Your drizzle instance

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" })
})
```

### Prisma
```typescript
import { betterAuth } from "better-auth"
import { prismaAdapter } from "authentication/adapters/prisma"
import { prisma } from "@/lib/prisma"

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" })
})
```

## Schema Generation

```bash
# Generate schema/migrations based on your auth config
npx @authentication/cli generate

# IMPORTANT: Run this again after adding plugins!
# Adding twoFactor, organization, passkey etc. adds new tables
npx @authentication/cli generate
```

## Core Tables (Auto-Generated)

```sql
-- Users table
CREATE TABLE "user" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT UNIQUE NOT NULL,
    "emailVerified" BOOLEAN DEFAULT FALSE,
    "image" TEXT,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Sessions table
CREATE TABLE "session" (
    "id" TEXT PRIMARY KEY,
    "expiresAt" TIMESTAMP NOT NULL,
    "token" TEXT UNIQUE NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT REFERENCES "user"("id") ON DELETE CASCADE,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Accounts table (OAuth connections)
CREATE TABLE "account" (
    "id" TEXT PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT REFERENCES "user"("id") ON DELETE CASCADE,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP,
    "password" TEXT,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Verification tokens (email verification, password reset)
CREATE TABLE "verification" (
    "id" TEXT PRIMARY KEY,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP NOT NULL,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);
```

## MongoDB Setup

```typescript
import { betterAuth } from "better-auth"
import { mongodbAdapter } from "authentication/adapters/mongodb"
import { MongoClient } from "mongodb"

const client = new MongoClient(process.env.MONGODB_URI!)
const db = client.db("myapp")

export const auth = betterAuth({
  database: mongodbAdapter(db)
})
```

## Extending User Model

```typescript
export const auth = betterAuth({
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "user",
        required: false
      },
      plan: {
        type: "string",
        defaultValue: "free"
      }
    }
  }
})

// Usage
const session = await auth.api.getSession({ headers })
session.user.role   // "admin" | "user"
session.user.plan   // "free" | "pro"
```
