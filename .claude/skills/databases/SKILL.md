---
name: databases
description: Advanced database engineering — PostgreSQL (schema design, advanced queries, optimization, replication, administration), MongoDB (document modeling, aggregation pipelines, sharding, Atlas), Redis (caching, pub/sub, streams). Use for schema design, query optimization, database administration, backup/restore, replication, and performance tuning.
license: MIT
---

# Database Engineering Mastery

Production-ready database patterns for PostgreSQL, MongoDB, and Redis. Focuses on **design, optimization, and administration** — language-agnostic fundamentals that work with any backend (Rust, Go, Python, Node.js, etc.).

## Backend-Agnostic Design

This skill focuses on **database fundamentals** that work with ANY backend:

| This Skill (databases) | Backend Implementation |
|------------------------|------------------------|
| Pure SQL, schema design | SQLx (Rust), GORM (Go), SQLAlchemy (Python), Prisma (Node) |
| `EXPLAIN ANALYZE`, indexing | Query optimization in any language |
| DBA tasks (VACUUM, replication) | Database administration (language-independent) |
| MongoDB shell & aggregation | Official drivers: Rust, Go, Python, Node, Java |
| Redis CLI patterns | Redis clients: redis-rs, go-redis, redis-py, ioredis |

**Implementation Examples:**
- Rust: See [rust-backend-advance](../rust-backend-advance/SKILL.md)
- Go: Use Gin/Echo + GORM or sqlx
- Python: Use FastAPI + SQLAlchemy or asyncpg
- Node.js: Use Express + Prisma or Knex

## Database Selection

| Criteria | PostgreSQL | MongoDB | Redis |
|----------|-----------|---------|-------|
| **Data model** | Relational tables | JSON documents | Key-value / streams |
| **Best for** | ACID transactions, complex JOINs | Flexible schema, rapid iteration | Caching, real-time, pub/sub |
| **Scaling** | Vertical + read replicas | Horizontal sharding | In-memory, cluster |
| **Query language** | SQL | MQL (MongoDB Query Language) | Redis commands |
| **When to pick** | Data integrity critical | Schema evolves fast | Sub-ms latency needed |

## Quick Start

### PostgreSQL
```sql
-- Create with constraints
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_users_email ON users(email);

-- Performance check
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM users WHERE email = 'test@example.com';
```

### MongoDB
```javascript
// Insert with validation
db.createCollection("users", {
  validator: { $jsonSchema: {
    bsonType: "object",
    required: ["email", "name"],
    properties: {
      email: { bsonType: "string", pattern: "^.+@.+$" },
      name: { bsonType: "string", minLength: 1 }
    }
  }}
});

// Aggregation pipeline
db.orders.aggregate([
  { $match: { status: "completed" } },
  { $group: { _id: "$userId", total: { $sum: "$amount" } } },
  { $sort: { total: -1 } },
  { $limit: 10 }
]);
```

### Redis
```bash
# Caching pattern
SET user:123 '{"name":"Alice"}' EX 3600
GET user:123

# Pub/Sub
PUBLISH notifications '{"type":"order","id":456}'
SUBSCRIBE notifications

# Sorted set leaderboard
ZADD leaderboard 100 "player1" 200 "player2"
ZREVRANGE leaderboard 0 9 WITHSCORES
```

## Reference Navigation

### PostgreSQL Deep-Dive
- **[Schema Design](references/postgresql-schema-design.md)** — Normalization, partitioning, JSONB, constraints, migrations
- **[Advanced Queries](references/postgresql-advanced-queries.md)** — CTEs, Window Functions, lateral joins, recursive queries
- **[Optimization](references/postgresql-optimization.md)** — EXPLAIN, indexing strategies, query planner, statistics
- **[Administration](references/postgresql-administration.md)** — Users, backups, VACUUM, monitoring, pgBouncer
- **[Replication & HA](references/postgresql-replication.md)** — Streaming replication, failover, pg_basebackup

### MongoDB Deep-Dive
- **[Document Modeling](references/mongodb-document-modeling.md)** — Embedding vs referencing, schema patterns, polymorphism
- **[Aggregation Mastery](references/mongodb-aggregation.md)** — Pipeline stages, $lookup, $graphLookup, optimization
- **[Indexing & Performance](references/mongodb-indexing.md)** — Compound, multikey, text, 2dsphere, covered queries
- **[Atlas & Operations](references/mongodb-atlas-ops.md)** — Atlas setup, monitoring, sharding, backup, security

### Redis Deep-Dive
- **[Patterns & Use Cases](references/redis-patterns.md)** — Caching, sessions, rate limiting, pub/sub, streams, Lua scripts

### Cross-Database
- **[Selection Guide](references/database-selection-guide.md)** — When to use what, hybrid architectures, migration strategies

## Best Practices

**PostgreSQL:** Normalize to 3NF first, denormalize for read performance. Always use `EXPLAIN ANALYZE`. Index foreign keys. VACUUM regularly. Use pgBouncer for connection pooling.

**MongoDB:** Embed for 1-to-few, reference for 1-to-many. Index every query pattern. Use aggregation pipeline over map-reduce. Enable authentication. Use Atlas for production.

**Redis:** Set TTL on everything. Use pipelines for bulk ops. Don't store data you can't lose (unless persisted). Monitor memory with `INFO memory`.

## Related Skills

| Skill | When to Use |
|-------|-------------|
| [rust-backend-advance](../rust-backend-advance/SKILL.md) | Rust/Axum/SQLx implementation (one backend option) |
| [authentication](../authentication/SKILL.md) | User/session storage, auth tables |
| [payments](../payments/SKILL.md) | Orders, transactions, subscriptions storage |
| [devops](../devops/SKILL.md) | Database hosting, backups, Docker containers |
| [debugging](../debugging/SKILL.md) | Query performance issues, connection problems |
| [testing](../testing/SKILL.md) | Database integration tests |
