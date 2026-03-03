# Next.js App Router Architecture

## Routing Conventions

```
app/
├── layout.tsx            # Root layout (required)
├── page.tsx              # / (home)
├── loading.tsx           # Streaming UI while loading
├── error.tsx             # Error boundary
├── not-found.tsx         # 404
├── global-error.tsx      # Root error boundary
│
├── dashboard/
│   ├── layout.tsx        # Nested layout
│   ├── page.tsx          # /dashboard
│   ├── loading.tsx       # /dashboard loading
│   ├── settings/
│   │   └── page.tsx      # /dashboard/settings
│   └── [teamId]/
│       └── page.tsx      # /dashboard/[teamId] (dynamic)
│
├── blog/
│   ├── page.tsx          # /blog (list)
│   └── [slug]/
│       └── page.tsx      # /blog/[slug] (detail)
│
├── (marketing)/          # Route group (no URL segment)
│   ├── layout.tsx        # Shared marketing layout
│   ├── about/page.tsx    # /about
│   └── pricing/page.tsx  # /pricing
│
├── @modal/               # Parallel route (intercepting)
│   └── login/page.tsx    
│
└── api/
    └── users/
        └── route.ts      # API route: GET/POST /api/users
```

## Layouts

```tsx
// app/layout.tsx — Root Layout (required)
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: { template: "%s | My App", default: "My App" },
  description: "My awesome application"
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <Header />
          <main>{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  )
}
```

```tsx
// app/dashboard/layout.tsx — Nested Layout
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 p-6">{children}</div>
    </div>
  )
}
```

## Loading States

```tsx
// app/dashboard/loading.tsx
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-[250px]" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}
```

## Error Handling

```tsx
// app/dashboard/error.tsx
"use client"

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-16">
      <h2 className="text-xl font-semibold">Something went wrong!</h2>
      <p className="text-muted-foreground">{error.message}</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  )
}
```

## Server Actions

```tsx
// app/actions.ts
"use server"

import { revalidatePath } from "next/cache"

export async function createUser(formData: FormData) {
  const name = formData.get("name") as string
  const email = formData.get("email") as string
  
  await db.users.create({ data: { name, email } })
  revalidatePath("/users")
}

// Usage in component
export default function CreateUserForm() {
  return (
    <form action={createUser}>
      <Input name="name" placeholder="Name" />
      <Input name="email" placeholder="Email" />
      <Button type="submit">Create</Button>
    </form>
  )
}
```

## API Routes

```typescript
// app/api/users/route.ts
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const page = parseInt(searchParams.get("page") || "1")
  const users = await db.users.findMany({ skip: (page - 1) * 10, take: 10 })
  return NextResponse.json(users)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const user = await db.users.create({ data: body })
  return NextResponse.json(user, { status: 201 })
}

// app/api/users/[id]/route.ts
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const user = await db.users.findUnique({ where: { id: params.id } })
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(user)
}
```

## Middleware

```typescript
// middleware.ts (root level)
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // Auth check
  const token = request.cookies.get("session")?.value
  if (!token && request.nextUrl.pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"]
}
```
