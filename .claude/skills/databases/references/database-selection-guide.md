# Database Selection Guide

## Quick Decision Framework

```
Need ACID transactions + complex JOINs?  → PostgreSQL
Need flexible schema + horizontal scale? → MongoDB
Need sub-ms caching + real-time?         → Redis
Need all three?                          → Use them together!
```

## Detailed Comparison

| Aspect | PostgreSQL | MongoDB | Redis |
|--------|-----------|---------|-------|
| **Type** | Relational (SQL) | Document (NoSQL) | In-memory key-value |
| **Schema** | Strict, migrations | Flexible, dynamic | Schema-less |
| **Consistency** | Strong ACID | Tunable (strong → eventual) | Single-threaded atomic |
| **Scaling** | Vertical + read replicas | Horizontal sharding | Cluster (hash slots) |
| **Query** | SQL (very powerful) | MQL + aggregation | Commands only |
| **JOINs** | Native, optimized | $lookup (limited) | None |
| **Best latency** | 1-10ms | 1-10ms | 0.1-1ms |
| **Max data size** | Terabytes | Petabytes | Limited by RAM |

## Use Case Matrix

### E-Commerce Platform
```
PostgreSQL: Orders, payments, inventory (ACID critical)
MongoDB:    Product catalog (flexible attributes)  
Redis:      Shopping cart, session, price cache
```

### Social Network
```
PostgreSQL: User accounts, friendships (referential integrity)
MongoDB:    Posts, comments (nested, variable structure)
Redis:      Feed cache, online status, notifications
```

### IoT / Analytics
```
PostgreSQL: Device registry, billing
MongoDB:    Sensor readings (time-series, high write throughput)
Redis:      Real-time dashboards, alerting
```

### SaaS Application
```
PostgreSQL: Core business data, multi-tenant with RLS
Redis:      Session store, rate limiting, feature flags
MongoDB:    Audit logs, user activity (high volume, flexible)
```

## Hybrid Architecture Pattern

```
Client Request
    │
    ├─→ Redis (cache layer, 0.1ms)
    │     miss?
    │       │
    │       ├─→ PostgreSQL (source of truth, 5ms)
    │       │     write-through cache update
    │       │
    │       └─→ MongoDB (flexible data, 3ms)
    │             analytical queries, logs
    │
    └─→ Redis Pub/Sub (real-time events)
          → WebSocket to client
```

## Migration Strategies

### PostgreSQL ↔ MongoDB
```
PG → Mongo:
1. Export with pg_dump --format=csv
2. Use mongoimport for each table
3. Restructure: flatten JOINs into embedded documents
4. Create indexes matching query patterns

Mongo → PG:
1. Export with mongoexport --jsonArray
2. Design normalized schema
3. Transform JSON → relational (jq + psql COPY)
4. Add foreign keys and constraints
```

### Adding Redis Cache Layer
```
1. Identify hot queries (pg_stat_statements / profiler)
2. Add Redis for top 10 slowest queries
3. Implement cache-aside pattern
4. Set TTL based on data freshness requirements
5. Add cache invalidation on writes
6. Monitor hit rate (target > 90%)
```
