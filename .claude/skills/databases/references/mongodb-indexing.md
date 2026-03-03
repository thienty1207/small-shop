# MongoDB Indexing & Performance

## Index Types

### Single Field
```javascript
db.users.createIndex({ email: 1 })          // Ascending
db.users.createIndex({ createdAt: -1 })      // Descending
db.users.createIndex({ email: 1 }, { unique: true })  // Unique
```

### Compound (multi-field)
```javascript
// ESR Rule: Equality → Sort → Range
db.orders.createIndex({ status: 1, createdAt: -1, amount: 1 })
// Good: find({ status: "active" }).sort({ createdAt: -1 })
// Good: find({ status: "active", amount: { $gt: 100 } })
// Bad:  find({ amount: { $gt: 100 } })  // can't skip prefix
```

### Multikey (arrays)
```javascript
db.products.createIndex({ tags: 1 })
// Query: db.products.find({ tags: "electronics" })
// Query: db.products.find({ tags: { $in: ["electronics", "sale"] } })
```

### Text Index
```javascript
db.articles.createIndex({
  title: "text",
  body: "text",
  tags: "text"
}, {
  weights: { title: 10, tags: 5, body: 1 },
  name: "article_search"
})
// Query: db.articles.find({ $text: { $search: "rust async await" } })
// Sort by relevance:
db.articles.find(
  { $text: { $search: "rust backend" } },
  { score: { $meta: "textScore" } }
).sort({ score: { $meta: "textScore" } })
```

### 2dsphere (geospatial)
```javascript
db.places.createIndex({ location: "2dsphere" })
// Find near point
db.places.find({
  location: {
    $near: {
      $geometry: { type: "Point", coordinates: [106.6, 10.8] },
      $maxDistance: 5000  // meters
    }
  }
})
```

### Partial Index
```javascript
db.orders.createIndex(
  { createdAt: -1 },
  { partialFilterExpression: { status: "pending" } }
)
// Smaller index, only covers pending orders
```

### TTL Index (auto-expire)
```javascript
db.sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
// Documents deleted when expiresAt < now()

// Fixed TTL from creation
db.logs.createIndex({ createdAt: 1 }, { expireAfterSeconds: 86400 })
// Deleted 24h after created
```

## Index Analysis

### explain()
```javascript
db.orders.find({ status: "pending" }).explain("executionStats")

// Key metrics:
// executionStats.nReturned        → docs returned
// executionStats.totalKeysExamined → index entries scanned
// executionStats.totalDocsExamined → documents scanned
// 
// IDEAL: keysExamined ≈ nReturned, docsExamined ≈ nReturned
// BAD: docsExamined >> nReturned (collection scan or inefficient index)
```

### Covered Queries (Index-Only)
```javascript
// If query + projection fully covered by index → no doc fetch
db.users.createIndex({ email: 1, name: 1 })
db.users.find(
  { email: "test@example.com" },
  { _id: 0, name: 1 }  // Must exclude _id
)
// explain: "IXSCAN" with totalDocsExamined = 0
```

## Performance Optimization

### currentOp (find slow queries)
```javascript
db.currentOp({
  "active": true,
  "secs_running": { "$gt": 5 },
  "op": { "$in": ["query", "update"] }
})
// Kill slow query
db.killOp(opId)
```

### Profiler
```javascript
// Enable profiling for slow queries (> 100ms)
db.setProfilingLevel(1, { slowms: 100 })

// View slow queries
db.system.profile.find().sort({ ts: -1 }).limit(10)
// Disable
db.setProfilingLevel(0)
```

### Index Maintenance
```javascript
// Check index sizes
db.orders.stats().indexSizes

// Find unused indexes
db.orders.aggregate([{ $indexStats: {} }])
// Look for accesses.ops = 0

// Drop unused index
db.orders.dropIndex("idx_unused")

// Rebuild all indexes
db.orders.reIndex()  // Blocking! Use rolling rebuild in production
```

## Sharding

### Shard Key Selection
```
Good shard key:
- High cardinality (many unique values)
- Even distribution (no hotspots)  
- Query isolation (queries hit single shard)

Example: { tenantId: 1, createdAt: 1 }  // compound shard key
```

### Enable Sharding
```javascript
sh.enableSharding("mydb")
sh.shardCollection("mydb.orders", { tenantId: 1, orderId: 1 })

// Check status
sh.status()
db.orders.getShardDistribution()
```
