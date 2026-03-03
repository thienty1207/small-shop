# PostgreSQL Administration

## User & Role Management

### Create Roles
```sql
-- Application role (limited)
CREATE ROLE app_user WITH LOGIN PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE myapp TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;

-- Read-only role
CREATE ROLE readonly WITH LOGIN PASSWORD 'readonly_pass';
GRANT CONNECT ON DATABASE myapp TO readonly;
GRANT USAGE ON SCHEMA public TO readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO readonly;

-- Admin role
CREATE ROLE admin_user WITH LOGIN PASSWORD 'admin_pass' CREATEDB;
GRANT ALL PRIVILEGES ON DATABASE myapp TO admin_user;
```

## Backup & Restore

### pg_dump (logical backup)
```bash
# Full database backup
pg_dump -h localhost -U postgres -d myapp -F custom -f myapp.dump

# Schema only
pg_dump -h localhost -U postgres -d myapp --schema-only -f schema.sql

# Data only, specific tables
pg_dump -h localhost -U postgres -d myapp --data-only -t users -t orders -f data.sql

# Compressed SQL
pg_dump -h localhost -U postgres -d myapp | gzip > myapp_$(date +%Y%m%d).sql.gz

# Restore
pg_restore -h localhost -U postgres -d myapp_new -F custom myapp.dump
# or for SQL format:
psql -h localhost -U postgres -d myapp_new < myapp.sql
```

### pg_basebackup (physical, for replication/PITR)
```bash
pg_basebackup -h localhost -U replicator -D /var/lib/postgresql/backup \
    --wal-method=stream --checkpoint=fast --progress
```

### Automated Backup Script
```bash
#!/bin/bash
DB_NAME="myapp"
BACKUP_DIR="/backups/postgres"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create backup
pg_dump -h localhost -U postgres -d $DB_NAME -F custom \
    -f "$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.dump"

# Verify backup
pg_restore --list "$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.dump" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "Backup verified: ${DB_NAME}_${TIMESTAMP}.dump"
else
    echo "ERROR: Backup verification failed!" >&2
    exit 1
fi

# Cleanup old backups
find $BACKUP_DIR -name "*.dump" -mtime +$RETENTION_DAYS -delete
```

## VACUUM & Maintenance

### Understanding VACUUM
```
MVCC → old row versions accumulate → bloat
VACUUM → reclaims space, updates visibility map
VACUUM FULL → rewrites entire table (acquires exclusive lock!)
ANALYZE → updates planner statistics
```

### Maintenance Commands
```sql
-- Standard VACUUM (non-blocking, recommended)
VACUUM VERBOSE users;

-- VACUUM + ANALYZE (most common maintenance)
VACUUM ANALYZE users;

-- VACUUM FULL (blocking, only when severe bloat)
VACUUM FULL users;

-- Reindex (fix index bloat)
REINDEX INDEX CONCURRENTLY idx_users_email;
REINDEX TABLE CONCURRENTLY users;
```

### Autovacuum Tuning
```sql
-- Check autovacuum activity
SELECT relname, last_vacuum, last_autovacuum, last_analyze,
       n_dead_tup, n_live_tup
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC;

-- Tune for high-write tables
ALTER TABLE events SET (
    autovacuum_vacuum_scale_factor = 0.01,     -- trigger at 1% dead (default 20%)
    autovacuum_analyze_scale_factor = 0.005,
    autovacuum_vacuum_cost_delay = 2           -- faster vacuum
);
```

## Connection Pooling (pgBouncer)

### pgbouncer.ini
```ini
[databases]
myapp = host=127.0.0.1 port=5432 dbname=myapp

[pgbouncer]
listen_port = 6432
listen_addr = 0.0.0.0
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt

# Pool settings
pool_mode = transaction        # Best for web apps
default_pool_size = 20
max_client_conn = 500
reserve_pool_size = 5
reserve_pool_timeout = 3

# Timeouts
server_idle_timeout = 600
client_idle_timeout = 0
query_timeout = 30
```

### Pool Mode Selection
```
session     → Connection held for entire session (legacy apps)
transaction → Connection returned after each transaction (web apps, RECOMMENDED)
statement   → Connection returned after each statement (most restrictive)
```

## Monitoring

### Key Metrics
```sql
-- Active connections
SELECT count(*), state FROM pg_stat_activity GROUP BY state;

-- Long-running queries
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active' AND now() - pg_stat_activity.query_start > interval '5 seconds'
ORDER BY duration DESC;

-- Database size
SELECT pg_database.datname, pg_size_pretty(pg_database_size(pg_database.datname))
FROM pg_database ORDER BY pg_database_size(pg_database.datname) DESC;

-- Table sizes
SELECT relname, pg_size_pretty(pg_total_relation_size(relid)) as total,
       pg_size_pretty(pg_relation_size(relid)) as table,
       pg_size_pretty(pg_total_relation_size(relid) - pg_relation_size(relid)) as indexes
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC LIMIT 20;

-- Cache hit ratio (should be > 99%)
SELECT
    sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit + heap_blks_read), 0) * 100 as cache_hit_ratio
FROM pg_statio_user_tables;
```

### Kill Long Queries
```sql
-- Graceful cancel
SELECT pg_cancel_backend(pid);

-- Force terminate
SELECT pg_terminate_backend(pid);
```
