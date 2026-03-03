# PostgreSQL Query Optimization

## EXPLAIN ANALYZE — Your Best Friend

### Reading an Execution Plan
```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT u.name, COUNT(o.id)
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE u.created_at > '2024-01-01'
GROUP BY u.name;
```

**Key metrics to watch:**
```
Seq Scan on users     → Table scan (BAD for large tables)
Index Scan            → Using index (GOOD)
Index Only Scan       → Covering index, no table access (BEST)
Bitmap Index Scan     → Multiple index conditions combined
Hash Join             → Building hash table for join
Nested Loop           → Inner loop per outer row (OK for small sets)
Sort                  → In-memory or disk sort
actual time=X..Y      → Startup..Total time in ms
rows=N                → Actual rows processed
Buffers: shared hit=X → Pages found in cache (GOOD)
Buffers: shared read=X → Pages read from disk (SLOW)
```

### Cost Estimates vs Actual
```
Cost: estimated by planner (arbitrary units)
Actual: real measured time

If estimated rows ≠ actual rows → stale statistics → run ANALYZE
```

## Indexing Strategies

### B-Tree (default, most common)
```sql
-- Single column (most queries)
CREATE INDEX idx_users_email ON users(email);

-- Composite (multi-column filter/sort)
CREATE INDEX idx_orders_user_status ON orders(user_id, status);
-- Column order matters! Left-to-right matching.
-- Good: WHERE user_id = X AND status = Y
-- Good: WHERE user_id = X
-- BAD:  WHERE status = Y (can't use index alone)

-- Sort optimization
CREATE INDEX idx_orders_date ON orders(created_at DESC);
```

### Partial Index (filtered subset)
```sql
-- Only index active users (much smaller index)
CREATE INDEX idx_active_users ON users(email)
    WHERE deleted_at IS NULL AND status = 'active';

-- Only index recent unprocessed items
CREATE INDEX idx_pending_orders ON orders(created_at)
    WHERE status = 'pending';
```

### Expression Index
```sql
-- Index on lowercase email
CREATE INDEX idx_users_lower_email ON users(LOWER(email));
-- Query: WHERE LOWER(email) = 'test@example.com'

-- Index on JSONB field
CREATE INDEX idx_products_category ON products((data->>'category'));
-- Query: WHERE data->>'category' = 'electronics'
```

### Covering Index (Index-Only Scan)
```sql
-- Include extra columns to avoid table lookup
CREATE INDEX idx_users_email_name ON users(email) INCLUDE (name, avatar_url);
-- Query: SELECT name, avatar_url FROM users WHERE email = 'x'
-- → Index Only Scan (no heap access!)
```

### GIN Index (JSONB, arrays, full-text)
```sql
CREATE INDEX idx_products_attrs ON products USING GIN (attributes);
CREATE INDEX idx_articles_search ON articles USING GIN (search_vector);
CREATE INDEX idx_tags ON posts USING GIN (tags);  -- array column
```

## Query Planner Tuning

### Statistics
```sql
-- Refresh statistics for a table
ANALYZE users;

-- Increase sample size for skewed distributions
ALTER TABLE orders ALTER COLUMN status SET STATISTICS 1000;
ANALYZE orders;

-- Check current statistics
SELECT attname, n_distinct, most_common_vals, correlation
FROM pg_stats WHERE tablename = 'users';
```

### Planner Hints (via GUC)
```sql
-- Encourage/discourage specific plans (session-level)
SET enable_seqscan = off;       -- Force index usage (debugging only!)
SET random_page_cost = 1.1;     -- SSD (default 4, for HDD)
SET effective_cache_size = '4GB'; -- Available memory for caching
SET work_mem = '256MB';          -- Sort/hash memory per operation
```

## Common Anti-Patterns

### ❌ Functions on Indexed Columns
```sql
-- BAD: can't use index on created_at
WHERE EXTRACT(year FROM created_at) = 2024

-- GOOD: range scan uses index
WHERE created_at >= '2024-01-01' AND created_at < '2025-01-01'
```

### ❌ Leading Wildcards
```sql
-- BAD: no index usage  
WHERE name LIKE '%smith%'

-- GOOD: prefix match uses B-tree index
WHERE name LIKE 'smith%'

-- BETTER: use trigram index for any-position search
CREATE INDEX idx_name_trgm ON users USING GIN (name gin_trgm_ops);
WHERE name ILIKE '%smith%'  -- now uses GIN index
```

### ❌ SELECT *
```sql
-- BAD: fetches all columns, no covering index possible
SELECT * FROM users WHERE email = 'x'

-- GOOD: only fetch what you need
SELECT id, name FROM users WHERE email = 'x'
```

## Monitoring Slow Queries

### pg_stat_statements
```sql
-- Enable (postgresql.conf)
-- shared_preload_libraries = 'pg_stat_statements'

-- Top 10 slowest queries by total time
SELECT
    calls,
    round(total_exec_time::numeric, 2) as total_ms,
    round(mean_exec_time::numeric, 2) as avg_ms,
    round((100 * total_exec_time / sum(total_exec_time) OVER())::numeric, 2) as pct,
    substr(query, 1, 100) as query_preview
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;
```

### Table Bloat & Index Usage
```sql
-- Tables with most dead tuples (need VACUUM)
SELECT relname, n_dead_tup, n_live_tup,
       round(n_dead_tup::numeric / GREATEST(n_live_tup, 1) * 100, 1) as dead_pct
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY n_dead_tup DESC;

-- Unused indexes (candidates for removal)
SELECT indexrelname, idx_scan, pg_size_pretty(pg_relation_size(indexrelid))
FROM pg_stat_user_indexes
WHERE idx_scan = 0 AND indexrelname NOT LIKE '%_pkey'
ORDER BY pg_relation_size(indexrelid) DESC;
```
