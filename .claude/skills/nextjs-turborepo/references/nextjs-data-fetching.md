# Next.js Data Fetching & Caching

## Server-Side Data Fetching

### Direct Database Queries (Preferred)
```tsx
// app/users/page.tsx — Server Component
import { db } from '@/lib/db'

export default async function UsersPage() {
  const users = await db.users.findMany()
  return <UserList users={users} />
}
```

### Fetch with Caching
```tsx
// Static (default) — cached indefinitely
const data = await fetch('https://api.example.com/data')

// Time-based revalidation (ISR)
const data = await fetch('https://api.example.com/data', {
  next: { revalidate: 3600 } // Refresh every hour
})

// No cache (SSR every request)
const data = await fetch('https://api.example.com/data', {
  cache: 'no-store'
})

// Tag-based revalidation
const data = await fetch('https://api.example.com/products', {
  next: { tags: ['products'] }
})
// Then revalidate from Server Action:
import { revalidateTag } from 'next/cache'
revalidateTag('products')
```

### unstable_cache (for non-fetch data sources)
```tsx
import { unstable_cache } from 'next/cache'

const getCachedUser = unstable_cache(
  async (userId: string) => {
    return await db.users.findUnique({ where: { id: userId } })
  },
  ['user'],                    // Cache key prefix
  { revalidate: 3600, tags: ['users'] }
)

export default async function UserPage({ params }) {
  const user = await getCachedUser(params.id)
  return <UserProfile user={user} />
}
```

## Server Actions (Mutations)

### Basic Server Action
```tsx
// app/actions.ts
"use server"

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const CreateUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email()
})

export async function createUser(formData: FormData) {
  const parsed = CreateUserSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email')
  })

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  await db.users.create({ data: parsed.data })
  revalidatePath('/users')
  redirect('/users')
}
```

### With useActionState (React 19)
```tsx
"use client"
import { useActionState } from 'react'
import { createUser } from './actions'

export function CreateUserForm() {
  const [state, action, isPending] = useActionState(createUser, null)

  return (
    <form action={action}>
      <input name="name" placeholder="Name" />
      {state?.error?.name && <p className="text-destructive">{state.error.name}</p>}
      
      <input name="email" placeholder="Email" />
      {state?.error?.email && <p className="text-destructive">{state.error.email}</p>}
      
      <button type="submit" disabled={isPending}>
        {isPending ? 'Creating...' : 'Create User'}
      </button>
    </form>
  )
}
```

### Optimistic Updates
```tsx
"use client"
import { useOptimistic } from 'react'

export function TodoList({ todos }: { todos: Todo[] }) {
  const [optimisticTodos, addOptimisticTodo] = useOptimistic(
    todos,
    (state, newTodo: Todo) => [...state, newTodo]
  )

  async function addTodo(formData: FormData) {
    const title = formData.get('title') as string
    addOptimisticTodo({ id: 'temp', title, completed: false })
    await createTodo(formData) // Server Action
  }

  return (
    <>
      <form action={addTodo}>
        <input name="title" />
        <button type="submit">Add</button>
      </form>
      <ul>
        {optimisticTodos.map(todo => (
          <li key={todo.id}>{todo.title}</li>
        ))}
      </ul>
    </>
  )
}
```

## Loading & Error States

```tsx
// app/dashboard/loading.tsx — Auto loading UI
export default function Loading() {
  return <DashboardSkeleton />
}

// app/dashboard/error.tsx — Auto error boundary
"use client"
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={reset}>Try again</button>
    </div>
  )
}
```

## Caching Strategy Guide

| Data Type | Strategy | Config |
|-----------|----------|--------|
| Static content | Build-time cache | `fetch()` default |
| Product catalog | ISR (hourly) | `{ next: { revalidate: 3600 } }` |
| User dashboard | No cache | `{ cache: 'no-store' }` |
| Search results | Tag revalidation | `{ next: { tags: ['search'] } }` |
| Form mutation | Server Action | `revalidatePath()` / `revalidateTag()` |
