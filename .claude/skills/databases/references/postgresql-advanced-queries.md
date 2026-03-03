# PostgreSQL Advanced Queries

## Common Table Expressions (CTEs)

### Basic CTE
```sql
WITH active_users AS (
    SELECT id, name, email, last_login
    FROM users
    WHERE last_login > now() - INTERVAL '30 days'
)
SELECT u.name, COUNT(o.id) as order_count
FROM active_users u
JOIN orders o ON u.id = o.user_id
GROUP BY u.name
ORDER BY order_count DESC;
```

### Recursive CTE (hierarchical data)
```sql
-- Organization hierarchy
WITH RECURSIVE org_tree AS (
    -- Base case: top-level managers
    SELECT id, name, manager_id, 1 as depth, ARRAY[name] as path
    FROM employees
    WHERE manager_id IS NULL

    UNION ALL

    -- Recursive: find subordinates
    SELECT e.id, e.name, e.manager_id, t.depth + 1,
           t.path || e.name
    FROM employees e
    JOIN org_tree t ON e.manager_id = t.id
    WHERE t.depth < 10  -- safety limit
)
SELECT depth, repeat('  ', depth - 1) || name as hierarchy
FROM org_tree
ORDER BY path;
```

### CTE with INSERT/UPDATE (writeable CTEs)
```sql
WITH expired AS (
    DELETE FROM sessions
    WHERE expires_at < now()
    RETURNING user_id, session_id
)
INSERT INTO session_archive (user_id, session_id, archived_at)
SELECT user_id, session_id, now() FROM expired;
```

## Window Functions

### ROW_NUMBER / RANK / DENSE_RANK
```sql
-- Top 3 products per category
SELECT * FROM (
    SELECT
        p.name,
        p.category,
        p.price,
        ROW_NUMBER() OVER (PARTITION BY category ORDER BY price DESC) as rank
    FROM products p
) ranked
WHERE rank <= 3;
```

### Running Totals & Moving Averages
```sql
SELECT
    date,
    amount,
    SUM(amount) OVER (ORDER BY date) as running_total,
    AVG(amount) OVER (
        ORDER BY date
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) as moving_avg_7d,
    amount - LAG(amount) OVER (ORDER BY date) as daily_change
FROM daily_revenue;
```

### NTILE for Distribution Analysis
```sql
-- Divide customers into quartiles by spending
SELECT
    name,
    total_spent,
    NTILE(4) OVER (ORDER BY total_spent) as spending_quartile
FROM customers;
```

## LATERAL Joins

```sql
-- Latest 3 orders per user (much faster than window + filter)
SELECT u.name, o.order_id, o.amount, o.created_at
FROM users u
CROSS JOIN LATERAL (
    SELECT order_id, amount, created_at
    FROM orders
    WHERE user_id = u.id
    ORDER BY created_at DESC
    LIMIT 3
) o;
```

## JSONB Queries

### Path Operators
```sql
-- Extract values
SELECT data->>'name' as name FROM products;          -- text
SELECT data->'address'->>'city' as city FROM users;   -- nested text
SELECT data#>>'{address,city}' FROM users;            -- path extraction

-- Contains / Exists
SELECT * FROM products WHERE data @> '{"active": true}';
SELECT * FROM products WHERE data ? 'discount';
SELECT * FROM products WHERE data ?| ARRAY['sale', 'clearance'];
SELECT * FROM products WHERE data ?& ARRAY['name', 'price'];

-- JSONB array operations
SELECT * FROM products
WHERE data->'tags' @> '["electronics"]'::jsonb;
```

### JSONB Aggregation
```sql
SELECT
    jsonb_build_object(
        'user', u.name,
        'orders', jsonb_agg(
            jsonb_build_object('id', o.id, 'amount', o.amount)
            ORDER BY o.created_at DESC
        )
    ) as user_data
FROM users u
JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name;
```

## Full-Text Search

```sql
-- Setup
ALTER TABLE articles ADD COLUMN search_vector tsvector;
UPDATE articles SET search_vector =
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(body, '')), 'B');
CREATE INDEX idx_articles_search ON articles USING GIN(search_vector);

-- Search with ranking
SELECT title, ts_rank(search_vector, query) as rank
FROM articles, to_tsquery('english', 'rust & backend') as query
WHERE search_vector @@ query
ORDER BY rank DESC
LIMIT 20;
```

## Useful Patterns

### UPSERT (INSERT ... ON CONFLICT)
```sql
INSERT INTO user_stats (user_id, login_count, last_login)
VALUES ($1, 1, now())
ON CONFLICT (user_id)
DO UPDATE SET
    login_count = user_stats.login_count + 1,
    last_login = now();
```

### Batch Operations with UNNEST
```sql
-- Bulk insert from arrays
INSERT INTO tags (name, category)
SELECT * FROM UNNEST(
    ARRAY['rust', 'python', 'go'],
    ARRAY['backend', 'backend', 'backend']
);
```

### Generate Series (test data, time ranges)
```sql
-- Daily totals including days with no data
SELECT
    d.day,
    COALESCE(SUM(o.amount), 0) as total
FROM generate_series(
    '2024-01-01'::date,
    '2024-01-31'::date,
    '1 day'::interval
) as d(day)
LEFT JOIN orders o ON o.created_at::date = d.day
GROUP BY d.day ORDER BY d.day;
```
