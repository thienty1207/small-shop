# PostgreSQL Replication & High Availability

## Streaming Replication

### Primary Server Setup
```
# postgresql.conf
wal_level = replica
max_wal_senders = 5
wal_keep_size = 1GB
hot_standby = on
```

```sql
-- Create replication user
CREATE ROLE replicator WITH REPLICATION LOGIN PASSWORD 'repl_password';
```

```
# pg_hba.conf
host replication replicator standby_ip/32 scram-sha-256
```

### Standby Server Setup
```bash
# Base backup from primary
pg_basebackup -h primary_ip -U replicator -D /var/lib/postgresql/16/main \
    --wal-method=stream --checkpoint=fast --progress

# Create standby signal
touch /var/lib/postgresql/16/main/standby.signal
```

```
# postgresql.conf on standby
primary_conninfo = 'host=primary_ip port=5432 user=replicator password=repl_password'
hot_standby = on
```

### Monitor Replication
```sql
-- On primary: check connected standbys
SELECT client_addr, state, sent_lsn, write_lsn, replay_lsn,
       pg_wal_lsn_diff(sent_lsn, replay_lsn) as replay_lag_bytes
FROM pg_stat_replication;

-- On standby: check lag
SELECT now() - pg_last_xact_replay_timestamp() as replication_lag;
```

## Failover Strategies

### Manual Failover
```bash
# On standby, promote to primary
pg_ctl promote -D /var/lib/postgresql/16/main
# or
SELECT pg_promote();
```

### Automated with Patroni
```yaml
# patroni.yml
scope: myapp-cluster
name: node1

restapi:
  listen: 0.0.0.0:8008

etcd3:
  hosts: etcd1:2379,etcd2:2379,etcd3:2379

bootstrap:
  dcs:
    ttl: 30
    loop_wait: 10
    retry_timeout: 10
    maximum_lag_on_failover: 1048576
    postgresql:
      use_pg_rewind: true
      parameters:
        max_connections: 200
        wal_level: replica
        hot_standby: on

postgresql:
  listen: 0.0.0.0:5432
  data_dir: /var/lib/postgresql/16/main
  authentication:
    superuser:
      username: postgres
      password: postgres
    replication:
      username: replicator
      password: repl_password
```

## Connection Routing

### HAProxy Configuration
```
frontend postgres_front
    bind *:5432
    default_backend postgres_primary

frontend postgres_read_front
    bind *:5433
    default_backend postgres_replicas

backend postgres_primary
    option httpchk GET /primary
    http-check expect status 200
    server node1 node1:5432 check port 8008
    server node2 node2:5432 check port 8008

backend postgres_replicas
    option httpchk GET /replica
    http-check expect status 200
    balance roundrobin
    server node1 node1:5432 check port 8008
    server node2 node2:5432 check port 8008
```

## Logical Replication (selective table sync)

```sql
-- On publisher (source)
CREATE PUBLICATION my_pub FOR TABLE users, orders;

-- On subscriber (target)
CREATE SUBSCRIPTION my_sub
    CONNECTION 'host=publisher_ip dbname=myapp user=replicator password=repl_password'
    PUBLICATION my_pub;

-- Monitor
SELECT * FROM pg_stat_subscription;
```

## Backup Strategy Matrix

| Strategy | RPO | RTO | Use Case |
|----------|-----|-----|----------|
| pg_dump daily | 24h | Hours | Small DB, dev/staging |
| pg_basebackup + WAL archiving | Minutes | 30min | Production, PITR needed |
| Streaming replication | Seconds | Minutes | HA, read scaling |
| Patroni cluster | Near-zero | Seconds | Mission-critical |
