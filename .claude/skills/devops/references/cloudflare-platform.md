# Cloudflare Platform

## Workers (Edge Functions)

### Setup
```bash
npm create cloudflare@latest my-worker
cd my-worker && npx wrangler dev  # Local development
npx wrangler deploy               # Deploy to edge
```

### Basic Worker
```typescript
// src/index.ts
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/api/hello') {
      return Response.json({ message: 'Hello from the edge!' })
    }

    if (url.pathname === '/api/data') {
      // Read from KV
      const data = await env.MY_KV.get('key', 'json')
      return Response.json(data ?? { error: 'Not found' })
    }

    return new Response('Not found', { status: 404 })
  }
}

interface Env {
  MY_KV: KVNamespace
  MY_DB: D1Database
  MY_BUCKET: R2Bucket
}
```

### wrangler.toml
```toml
name = "my-worker"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[vars]
API_URL = "https://api.example.com"

[[kv_namespaces]]
binding = "MY_KV"
id = "abc123"

[[d1_databases]]
binding = "MY_DB"
database_name = "mydb"
database_id = "def456"

[[r2_buckets]]
binding = "MY_BUCKET"
bucket_name = "my-bucket"
```

## R2 (Object Storage, zero egress)

```typescript
// Upload file
await env.MY_BUCKET.put('uploads/photo.jpg', fileBuffer, {
  httpMetadata: { contentType: 'image/jpeg' }
})

// Download file
const object = await env.MY_BUCKET.get('uploads/photo.jpg')
if (object) {
  return new Response(object.body, {
    headers: { 'Content-Type': object.httpMetadata?.contentType ?? 'application/octet-stream' }
  })
}

// List objects
const listed = await env.MY_BUCKET.list({ prefix: 'uploads/', limit: 100 })

// Delete
await env.MY_BUCKET.delete('uploads/photo.jpg')

// Presigned URL (via Worker)
// Create a Worker that validates auth then proxies R2 reads/writes
```

## D1 (SQLite at the Edge)

```typescript
// Create table
const stmt = env.MY_DB.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`)
await stmt.run()

// Insert
await env.MY_DB.prepare('INSERT INTO users (email, name) VALUES (?, ?)')
  .bind('alice@example.com', 'Alice')
  .run()

// Select
const { results } = await env.MY_DB.prepare('SELECT * FROM users WHERE email = ?')
  .bind('alice@example.com')
  .all()

// Batch (transaction)
await env.MY_DB.batch([
  env.MY_DB.prepare('INSERT INTO users (email, name) VALUES (?, ?)').bind('a@b.com', 'A'),
  env.MY_DB.prepare('INSERT INTO users (email, name) VALUES (?, ?)').bind('c@d.com', 'C')
])
```

```bash
# D1 CLI management
npx wrangler d1 create mydb
npx wrangler d1 execute mydb --local --command "SELECT * FROM users"
npx wrangler d1 migrations create mydb add_users_table
npx wrangler d1 migrations apply mydb
```

## Pages (Static Sites + Functions)

```bash
# Deploy static site
npx wrangler pages deploy ./dist

# Framework integration
npx wrangler pages deploy ./out          # Next.js static export
npx wrangler pages deploy ./dist         # Vite build output

# Pages Functions (API routes)
# Place in functions/ directory
# functions/api/hello.ts → /api/hello
```

```typescript
// functions/api/hello.ts
export const onRequestGet: PagesFunction = async (context) => {
  return Response.json({ message: 'Hello from Pages Function!' })
}
```

## KV (Key-Value Store)

```typescript
// Write with TTL
await env.MY_KV.put('session:abc', JSON.stringify(sessionData), {
  expirationTtl: 3600  // 1 hour
})

// Read
const value = await env.MY_KV.get('session:abc', 'json')

// Delete
await env.MY_KV.delete('session:abc')

// List keys
const { keys } = await env.MY_KV.list({ prefix: 'session:' })
```

## Platform Comparison

| Service | Best For | Latency | Limit |
|---------|----------|---------|-------|
| Workers | API, logic, routing | <10ms | 10ms CPU (free), 30s (paid) |
| KV | Config, sessions, cache | <50ms | Eventually consistent |
| R2 | Files, media, backups | <100ms | No egress fees |
| D1 | Relational data | <20ms | SQLite at edge |
| Pages | Static sites + API | <50ms | Git-integrated |
| Queues | Async processing | Variable | Guaranteed delivery |
| Durable Objects | Stateful coordination | <10ms | Strong consistency |
