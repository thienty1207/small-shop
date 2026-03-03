# Turborepo Monorepo

## Project Structure

```
my-monorepo/
├── apps/
│   ├── web/                # Customer-facing Next.js app
│   │   ├── app/
│   │   ├── package.json    # name: "@myapp/web"
│   │   └── next.config.js
│   ├── admin/              # Admin dashboard
│   │   ├── app/
│   │   └── package.json    # name: "@myapp/admin"
│   └── docs/               # Documentation site
│       └── package.json    # name: "@myapp/docs"
├── packages/
│   ├── ui/                 # Shared UI components
│   │   ├── src/
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   └── index.ts
│   │   ├── package.json    # name: "@myapp/ui"
│   │   └── tsconfig.json
│   ├── config-typescript/  # Shared tsconfig
│   │   ├── base.json
│   │   ├── nextjs.json
│   │   └── package.json    # name: "@myapp/config-typescript"
│   ├── config-eslint/      # Shared ESLint config
│   │   └── package.json    # name: "@myapp/config-eslint"
│   └── types/              # Shared TypeScript types
│       ├── src/
│       │   ├── user.ts
│       │   └── index.ts
│       └── package.json    # name: "@myapp/types"
├── turbo.json
├── package.json            # Root workspace
└── pnpm-workspace.yaml     # (or npm workspaces)
```

## Setup

### Root package.json
```json
{
  "name": "my-monorepo",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "test": "turbo test",
    "clean": "turbo clean"
  },
  "devDependencies": {
    "turbo": "^2.0.0"
  }
}
```

### turbo.json
```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "clean": {
      "cache": false
    }
  }
}
```

### pnpm-workspace.yaml
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

## Shared Package Pattern

### packages/ui/package.json
```json
{
  "name": "@myapp/ui",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./button": "./src/button.tsx",
    "./card": "./src/card.tsx"
  },
  "dependencies": {
    "react": "^19.0.0"
  },
  "devDependencies": {
    "@myapp/config-typescript": "workspace:*",
    "typescript": "^5.0.0"
  }
}
```

### Consuming in an app
```json
// apps/web/package.json
{
  "dependencies": {
    "@myapp/ui": "workspace:*",
    "@myapp/types": "workspace:*"
  }
}
```

```tsx
// apps/web/app/page.tsx
import { Button } from '@myapp/ui/button'
import type { User } from '@myapp/types'
```

## Essential Commands

```bash
# Run all apps in dev mode
turbo dev

# Build everything
turbo build

# Run specific app
turbo dev --filter=@myapp/web

# Run specific package + dependencies
turbo build --filter=@myapp/ui...

# Run everything except one app
turbo build --filter=!@myapp/docs

# Add dependency to specific workspace
pnpm add lodash --filter=@myapp/web

# Add shared dependency to root
pnpm add -w -D turbo

# Clean all builds
turbo clean
```

## Remote Caching

```bash
# Login to Vercel (free tier)
npx turbo login

# Link to remote cache
npx turbo link

# Now build outputs are cached remotely
# Team members skip rebuilds for unchanged packages
turbo build  # First run: builds all
turbo build  # Second run (or CI): cache hit → instant
```

## Best Practices

1. **Keep packages focused** — one responsibility per package
2. **Internal packages stay private** — `"private": true`
3. **Use `workspace:*` protocol** — for internal deps
4. **Shared configs** — TypeScript, ESLint, Prettier as packages
5. **Define `outputs` correctly** — enables effective caching
6. **Use `--filter`** — for targeted operations in CI
