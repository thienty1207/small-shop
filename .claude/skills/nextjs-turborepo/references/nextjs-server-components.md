# Next.js Server Components (RSC)

## Server vs Client Components

```
Server Components (DEFAULT):           Client Components ("use client"):
✅ Fetch data directly                 ✅ useState, useEffect, hooks
✅ Access backend resources             ✅ Event handlers (onClick, onChange)
✅ Keep secrets on server               ✅ Browser APIs (window, document)
✅ Reduce client bundle size            ✅ Custom hooks with state
✅ Stream content progressively         ✅ Third-party client libraries
❌ No hooks, no state                   ❌ Larger bundle
❌ No event handlers                    ❌ No direct DB/file access
❌ No browser APIs                      ❌ Secrets visible in bundle
```

## Patterns

### Server Component (default — no directive needed)
```tsx
// app/products/page.tsx — Server Component
import { db } from '@/lib/db'

export default async function ProductsPage() {
  // Direct database query — no API needed!
  const products = await db.products.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20
  })

  return (
    <main className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Products</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {products.map(p => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </main>
  )
}

// Server component that receives data (no fetch needed)
function ProductCard({ product }: { product: Product }) {
  return (
    <div className="border rounded-lg p-4">
      <h2 className="font-semibold">{product.name}</h2>
      <p className="text-muted-foreground">${product.price}</p>
    </div>
  )
}
```

### Client Component
```tsx
"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'

export function AddToCartButton({ productId }: { productId: string }) {
  const [isAdding, setIsAdding] = useState(false)

  async function handleAdd() {
    setIsAdding(true)
    await fetch('/api/cart', {
      method: 'POST',
      body: JSON.stringify({ productId })
    })
    setIsAdding(false)
  }

  return (
    <Button onClick={handleAdd} disabled={isAdding}>
      {isAdding ? 'Adding...' : 'Add to Cart'}
    </Button>
  )
}
```

### Composition: Server wraps Client
```tsx
// app/products/[id]/page.tsx — SERVER component
import { db } from '@/lib/db'
import { AddToCartButton } from './add-to-cart-button' // CLIENT component

export default async function ProductPage({ params }: { params: { id: string } }) {
  const product = await db.products.findUnique({ where: { id: params.id } })
  if (!product) notFound()

  return (
    <main>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      <p className="text-2xl font-bold">${product.price}</p>
      {/* Server passes data DOWN to client component */}
      <AddToCartButton productId={product.id} />
    </main>
  )
}
```

### Streaming with Suspense
```tsx
import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardPage() {
  return (
    <main>
      <h1>Dashboard</h1>
      {/* Fast content renders immediately */}
      <UserGreeting />
      
      {/* Slow queries stream in */}
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <RevenueChart />  {/* Slow DB query — streams when ready */}
      </Suspense>
      
      <Suspense fallback={<Skeleton className="h-48 w-full" />}>
        <RecentOrders />  {/* Another slow query */}
      </Suspense>
    </main>
  )
}

async function RevenueChart() {
  const data = await db.revenue.aggregate({ ... }) // Takes 2s
  return <Chart data={data} />
}
```

## Rules

1. **Default = Server Component** — only add `"use client"` when you need interactivity
2. **Push `"use client"` down** — wrap only the interactive leaf, not the whole page
3. **Pass serializable props** — Server → Client boundary only allows JSON-serializable data
4. **No importing Server into Client** — pass Server Components as `children` instead
5. **Async only on Server** — use `async function` on Server Components for data fetching

## Decision Tree
```
Need useState/useEffect/hooks?           → "use client"
Need onClick/onChange/onSubmit?           → "use client"  
Need browser API (window/document)?       → "use client"
Using 3rd party lib that needs client?    → "use client"
Everything else?                          → Server Component (default)
```
