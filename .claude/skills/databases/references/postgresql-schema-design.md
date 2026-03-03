# PostgreSQL Schema Design

## Data Types Selection

### Common Types
```sql
-- Identifiers
UUID          -- gen_random_uuid(), globally unique
SERIAL/BIGSERIAL -- auto-increment (legacy, prefer UUID for distributed)

-- Text
TEXT          -- variable-length, no limit (preferred over VARCHAR)
VARCHAR(n)   -- only when hard limit needed (e.g., country_code VARCHAR(2))
CHAR(n)      -- fixed-length, rare use

-- Numeric
INTEGER       -- -2B to +2B
BIGINT        -- -9.2E18 to +9.2E18
NUMERIC(p,s)  -- exact precision (money: NUMERIC(12,2))
REAL/DOUBLE   -- floating point (avoid for money!)

-- Date/Time
TIMESTAMPTZ   -- ALWAYS use TZ variant, stores UTC internally
DATE          -- date only
INTERVAL      -- duration ('2 hours', '3 days')

-- JSON
JSONB         -- binary JSON, indexable, preferred over JSON
JSON          -- text JSON, preserves order (rarely needed)

-- Boolean & Binary
BOOLEAN       -- true/false/null
BYTEA         -- binary data (files, images)

-- Network & Geo
INET/CIDR     -- IP addresses
POINT/POLYGON -- basic geometry
```

## Normalization Strategy

### Normal Forms (Practical Guide)
```
1NF: No repeated groups → each column holds atomic values
2NF: No partial dependencies → composite PKs fully determine all columns  
3NF: No transitive dependencies → non-key columns depend only on PK

Rule of thumb: Start at 3NF, denormalize for READ performance
```

### When to Denormalize
```sql
-- BEFORE (normalized, 3 JOINs for one page load)
SELECT o.*, u.name, u.email, a.street, a.city
FROM orders o
JOIN users u ON o.user_id = u.id
JOIN addresses a ON o.address_id = a.id;

-- AFTER (denormalized, single table scan)
-- Add redundant columns to orders table:
ALTER TABLE orders ADD COLUMN user_name TEXT;
ALTER TABLE orders ADD COLUMN user_email TEXT;
ALTER TABLE orders ADD COLUMN shipping_address JSONB;

-- Use triggers to keep in sync
CREATE OR REPLACE FUNCTION sync_order_user_name()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE orders SET user_name = NEW.name WHERE user_id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## Table Partitioning

### Range Partitioning (time-series data)
```sql
CREATE TABLE events (
    id UUID DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
) PARTITION BY RANGE (created_at);

-- Monthly partitions
CREATE TABLE events_2024_01 PARTITION OF events
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
CREATE TABLE events_2024_02 PARTITION OF events
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- Auto-create future partitions (pg_partman extension)
SELECT partman.create_parent('public.events', 'created_at', 'native', 'monthly');
```

### List Partitioning (by category)
```sql
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status TEXT NOT NULL,
    amount NUMERIC(12,2)
) PARTITION BY LIST (status);

CREATE TABLE orders_pending PARTITION OF orders FOR VALUES IN ('pending', 'processing');
CREATE TABLE orders_completed PARTITION OF orders FOR VALUES IN ('completed', 'shipped');
CREATE TABLE orders_cancelled PARTITION OF orders FOR VALUES IN ('cancelled', 'refunded');
```

## JSONB Patterns

### Structured JSONB with Constraints
```sql
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    attributes JSONB NOT NULL DEFAULT '{}',
    -- Ensure required JSONB keys exist
    CONSTRAINT valid_attributes CHECK (
        attributes ? 'category' AND
        (attributes->>'price')::numeric > 0
    )
);

-- GIN index for JSONB queries
CREATE INDEX idx_products_attrs ON products USING GIN (attributes);

-- Query patterns
SELECT * FROM products WHERE attributes @> '{"category": "electronics"}';
SELECT * FROM products WHERE attributes->>'brand' = 'Apple';
SELECT * FROM products WHERE attributes ? 'discount';
```

## Migration Best Practices

### Safe Migration Pattern
```sql
-- 1. Add column as NULLABLE first (no lock)
ALTER TABLE users ADD COLUMN phone TEXT;

-- 2. Backfill in batches (no single massive UPDATE)
UPDATE users SET phone = 'unknown' WHERE phone IS NULL AND id IN (
    SELECT id FROM users WHERE phone IS NULL LIMIT 10000
);

-- 3. Add NOT NULL constraint after backfill
ALTER TABLE users ALTER COLUMN phone SET NOT NULL;

-- 4. Create indexes CONCURRENTLY (no lock)
CREATE INDEX CONCURRENTLY idx_users_phone ON users(phone);
```

### Zero-Downtime Column Rename
```sql
-- DON'T: ALTER TABLE users RENAME COLUMN name TO full_name;
-- DO: Add new → copy → swap → drop
ALTER TABLE users ADD COLUMN full_name TEXT;
UPDATE users SET full_name = name;
ALTER TABLE users ALTER COLUMN full_name SET NOT NULL;
-- Update app code to use full_name
-- Then: ALTER TABLE users DROP COLUMN name;
```

## Common Schema Patterns

### Soft Delete
```sql
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMPTZ;
CREATE INDEX idx_users_active ON users(id) WHERE deleted_at IS NULL;

-- Query active users
SELECT * FROM users WHERE deleted_at IS NULL;
```

### Audit Trail
```sql
CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data JSONB,
    new_data JSONB,
    changed_by UUID REFERENCES users(id),
    changed_at TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION audit_trigger() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_log (table_name, record_id, action, old_data, new_data)
    VALUES (TG_TABLE_NAME, COALESCE(NEW.id, OLD.id), TG_OP,
            row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb);
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
```

### Multi-Tenant (Row-Level Security)
```sql
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON orders
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Set tenant context per request
SET app.tenant_id = 'tenant-uuid-here';
SELECT * FROM orders; -- Only sees tenant's rows
```
