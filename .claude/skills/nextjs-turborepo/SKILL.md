---
name: nextjs-turborepo
description: Full-stack web frameworks — Next.js 15 (App Router, Server Components, RSC, PPR, SSR/SSG/ISR), Turborepo (monorepo, task pipelines, remote caching). Use for building React applications, server-side rendering, monorepo management, build optimization, and full-stack TypeScript projects.
license: MIT
---

# Web Frameworks Mastery

Build modern full-stack applications with Next.js App Router and Turborepo monorepo.

## Framework Selection

| Need | Choose |
|------|--------|
| Single full-stack app | Next.js standalone |
| Multiple apps sharing code | Next.js + Turborepo monorepo |
| Static marketing site | Next.js with SSG |
| SaaS with dashboard | Next.js App Router + RSC |
| API-only backend | Use `Rust-backend-advance` (Axum) instead |

## Quick Start

```bash
# Single app
npx create-next-app@latest my-app
cd my-app && npm run dev

# Monorepo
npx create-turbo@latest my-monorepo
cd my-monorepo && npm run dev
```

## Reference Navigation

### Next.js
- **[App Router Architecture](references/nextjs-app-router.md)** — Routing, layouts, pages, loading/error states, parallel routes
- **[Server Components](references/nextjs-server-components.md)** — RSC patterns, client vs server, streaming, use client/server
- **[Data Fetching](references/nextjs-data-fetching.md)** — fetch, caching, revalidation, server actions, loading.tsx
- **[Optimization](references/nextjs-optimization.md)** — Images, fonts, scripts, bundle analysis, PPR, metadata/SEO

### Turborepo
- **[Monorepo Setup](references/turborepo-setup.md)** — Workspace config, package structure, shared dependencies
- **[Pipelines & Caching](references/turborepo-pipelines.md)** — Task dependencies, remote cache, parallel execution

## Key Patterns

### App Router Structure
```
app/
├── layout.tsx          # Root layout (wraps all pages)
├── page.tsx            # Home page (/)
├── loading.tsx         # Loading UI
├── error.tsx           # Error boundary
├── not-found.tsx       # 404 page
├── dashboard/
│   ├── layout.tsx      # Dashboard layout
│   ├── page.tsx        # /dashboard
│   └── settings/
│       └── page.tsx    # /dashboard/settings
└── api/
    └── users/
        └── route.ts    # API route handler
```

### Server Component (default)
```tsx
// app/users/page.tsx — Server Component (no "use client")
export default async function UsersPage() {
  const users = await fetch('https://api.example.com/users', {
    next: { revalidate: 3600 }  // ISR: refresh every hour
  }).then(r => r.json())

  return (
    <main>
      <h1>Users</h1>
      {users.map(u => <UserCard key={u.id} user={u} />)}
    </main>
  )
}
```

### Client Component
```tsx
"use client"
import { useState } from 'react'

export function Counter() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(c => c + 1)}>Count: {count}</button>
}
```

### Monorepo Structure
```
my-monorepo/
├── apps/
│   ├── web/          # Customer-facing Next.js
│   ├── admin/        # Admin dashboard Next.js
│   └── docs/         # Documentation
├── packages/
│   ├── ui/           # Shared components
│   ├── config/       # ESLint, TypeScript configs
│   └── types/        # Shared types
├── turbo.json
└── package.json
```

## Best Practices

**Next.js:** Default to Server Components, use `"use client"` only when needed. Implement proper loading/error states. Use Image component for optimization. Set metadata for SEO.

**Turborepo:** Clear separation (apps/ + packages/). Define task dependencies correctly. Enable remote caching. Use `--filter` for targeted builds.

## Related Skills

| Skill | When to Use |
|-------|-------------|
| [ui-styling](../ui-styling/SKILL.md) | Tailwind CSS, shadcn/ui components |
| [frontend-design](../frontend-design/SKILL.md) | Design tokens, typography, color systems |
| [authentication](../authentication/SKILL.md) | Next.js authentication setup |
| [testing](../testing/SKILL.md) | E2E testing with Playwright |
| [devops](../devops/SKILL.md) | Deployment, Vercel, Docker |
