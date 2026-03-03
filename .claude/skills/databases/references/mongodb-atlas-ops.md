# MongoDB Atlas & Operations

## Atlas Setup

### Create Cluster
1. Sign up at mongodb.com/atlas
2. Create Organization → Project → Cluster
3. Choose tier: M0 (free), M10+ (production)
4. Select region closest to your app servers

### Connection
```bash
# Connection string format
mongodb+srv://user:password@cluster.mongodb.net/dbname?retryWrites=true&w=majority

# mongosh
mongosh "mongodb+srv://cluster.mongodb.net/mydb" --username admin
```

### Network & Security
```
Atlas UI → Security → Network Access:
  - Add IP: specific IPs or 0.0.0.0/0 (dev only!)
  - VPC Peering: connect Atlas to your cloud VPC

Atlas UI → Security → Database Access:
  - Create users with specific roles
  - Built-in roles: readWrite, dbAdmin, atlasAdmin
  - Custom roles for fine-grained access
```

## Atlas Features

### Atlas Search (Lucene-based)
```javascript
// Create search index (Atlas UI or API)
{
  "mappings": {
    "dynamic": false,
    "fields": {
      "title": { "type": "string", "analyzer": "lucene.standard" },
      "body": { "type": "string", "analyzer": "lucene.english" },
      "tags": { "type": "token" }
    }
  }
}

// Aggregation with $search
db.articles.aggregate([
  { $search: {
    index: "articles_search",
    compound: {
      must: [{ text: { query: "rust backend", path: "title", score: { boost: { value: 3 } } } }],
      should: [{ text: { query: "rust backend", path: "body" } }],
      filter: [{ equals: { path: "published", value: true } }]
    },
    highlight: { path: ["title", "body"] }
  }},
  { $limit: 10 },
  { $project: {
    title: 1, score: { $meta: "searchScore" },
    highlights: { $meta: "searchHighlights" }
  }}
])
```

### Atlas Triggers
```javascript
// Database trigger (change streams)
exports = async function(changeEvent) {
  const { operationType, fullDocument, ns } = changeEvent;
  if (operationType === "insert" && ns.coll === "orders") {
    // Send notification
    await context.services.get("http").post({
      url: "https://api.example.com/webhooks/order",
      body: JSON.stringify(fullDocument),
      headers: { "Content-Type": ["application/json"] }
    });
  }
};
```

## Backup & Restore

### Atlas Backup (managed)
```
Atlas UI → Backup:
  - Continuous backup with point-in-time restore
  - Snapshot schedule: every 6h, daily, weekly, monthly
  - Restore: to same cluster, new cluster, or download
```

### mongodump / mongorestore (self-managed)
```bash
# Full backup
mongodump --uri="mongodb+srv://user:pass@cluster.mongodb.net/mydb" \
    --out=/backups/$(date +%Y%m%d)

# Specific collection
mongodump --uri="..." --collection=users --out=/backups/users

# Restore
mongorestore --uri="mongodb+srv://user:pass@cluster.mongodb.net/mydb" \
    --drop /backups/20240115/mydb/

# Compressed backup
mongodump --uri="..." --gzip --archive=/backups/mydb.gz
mongorestore --uri="..." --gzip --archive=/backups/mydb.gz
```

## Monitoring

### Atlas Monitoring
```
Atlas UI → Monitoring:
  - Real-time performance panels
  - Query targeting (scanned/returned ratio)
  - Operations per second
  - Connection count
  - Disk I/O, CPU, memory
  
Atlas UI → Performance Advisor:
  - Auto-suggested indexes
  - Slow query analysis
  - Schema anti-pattern detection
```

### Key Metrics to Monitor
```javascript
// Server status
db.serverStatus()

// Key areas:
// connections.current    → active connections
// opcounters             → operations per second
// mem.resident           → memory usage (MB)
// wiredTiger.cache       → cache utilization
// globalLock.activeClients → concurrent operations
```

## Production Checklist

- [ ] Authentication enabled (SCRAM-SHA-256)
- [ ] TLS/SSL for all connections
- [ ] IP whitelist configured (no 0.0.0.0/0)
- [ ] Automated backups enabled
- [ ] Monitoring alerts configured
- [ ] Read preference set (primaryPreferred for HA)
- [ ] Write concern: majority for critical data
- [ ] Connection pooling configured (maxPoolSize)
- [ ] Indexes cover all query patterns
- [ ] Schema validation enabled
