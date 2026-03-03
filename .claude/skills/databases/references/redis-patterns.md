# Redis Patterns & Use Cases

## Core Data Structures

### Strings (caching, counters)
```bash
# Cache with TTL
SET user:123:profile '{"name":"Alice","email":"alice@example.com"}' EX 3600
GET user:123:profile

# Atomic counters
INCR page:views:homepage
INCRBY user:123:credits 50
DECR inventory:product:456

# Distributed lock
SET lock:order:789 "worker-1" NX EX 30  # NX = only if not exists
# Returns OK if acquired, nil if already locked
```

### Hash (object storage)
```bash
HSET user:123 name "Alice" email "alice@example.com" role "admin"
HGET user:123 name
HGETALL user:123
HINCRBY user:123 login_count 1
```

### List (queues, recent items)
```bash
# Job queue (producer/consumer)
LPUSH queue:emails '{"to":"user@example.com","subject":"Welcome"}'
BRPOP queue:emails 30  # Blocking pop, timeout 30s

# Recent activity (keep last 100)
LPUSH user:123:activity "Logged in at 2024-01-15"
LTRIM user:123:activity 0 99
LRANGE user:123:activity 0 9  # Get last 10
```

### Set (tags, unique items)
```bash
SADD post:123:tags "rust" "backend" "axum"
SISMEMBER post:123:tags "rust"       # Check membership
SINTER user:123:interests user:456:interests  # Common interests
SUNION tag:rust tag:backend          # All items in either set
```

### Sorted Set (leaderboard, ranking)
```bash
ZADD leaderboard 1500 "player1" 2300 "player2" 1800 "player3"
ZREVRANGE leaderboard 0 9 WITHSCORES    # Top 10
ZRANK leaderboard "player1"              # Get rank
ZINCRBY leaderboard 100 "player1"        # Add score
ZRANGEBYSCORE leaderboard 1000 2000      # Score range
```

### Stream (event log, message broker)
```bash
# Produce events
XADD events * type "order.created" orderId "123" amount "49.99"
XADD events * type "user.login" userId "456"

# Consumer group
XGROUP CREATE events mygroup $ MKSTREAM
XREADGROUP GROUP mygroup consumer1 COUNT 10 BLOCK 5000 STREAMS events >

# Acknowledge processed
XACK events mygroup 1234567890-0

# Check pending (unacknowledged)
XPENDING events mygroup
```

## Common Patterns

### Cache-Aside Pattern
```python
def get_user(user_id):
    # 1. Check cache
    cached = redis.get(f"user:{user_id}")
    if cached:
        return json.loads(cached)
    
    # 2. Cache miss → fetch from DB
    user = db.query("SELECT * FROM users WHERE id = %s", user_id)
    
    # 3. Store in cache with TTL
    redis.setex(f"user:{user_id}", 3600, json.dumps(user))
    return user

def update_user(user_id, data):
    db.execute("UPDATE users SET ... WHERE id = %s", user_id)
    redis.delete(f"user:{user_id}")  # Invalidate cache
```

### Rate Limiting (Sliding Window)
```python
def is_rate_limited(user_id, max_requests=100, window_seconds=60):
    key = f"ratelimit:{user_id}"
    now = time.time()
    
    pipe = redis.pipeline()
    pipe.zremrangebyscore(key, 0, now - window_seconds)  # Remove old
    pipe.zadd(key, {str(now): now})                       # Add current
    pipe.zcard(key)                                        # Count
    pipe.expire(key, window_seconds)                       # TTL
    _, _, count, _ = pipe.execute()
    
    return count > max_requests
```

### Session Store
```python
def create_session(user_id, data):
    session_id = str(uuid4())
    redis.hset(f"session:{session_id}", mapping={
        "user_id": user_id,
        "created_at": int(time.time()),
        **data
    })
    redis.expire(f"session:{session_id}", 86400)  # 24h
    return session_id

def get_session(session_id):
    return redis.hgetall(f"session:{session_id}")
```

### Pub/Sub (real-time notifications)
```python
# Publisher
redis.publish("notifications:user:123", json.dumps({
    "type": "order_shipped",
    "orderId": "456"
}))

# Subscriber
pubsub = redis.pubsub()
pubsub.subscribe("notifications:user:123")
for message in pubsub.listen():
    if message["type"] == "message":
        handle_notification(json.loads(message["data"]))
```

### Distributed Lock (Redlock)
```python
import redis
from contextlib import contextmanager

@contextmanager
def distributed_lock(redis_client, name, ttl=10):
    lock_key = f"lock:{name}"
    lock_value = str(uuid4())
    
    # Acquire
    acquired = redis_client.set(lock_key, lock_value, nx=True, ex=ttl)
    if not acquired:
        raise LockError(f"Could not acquire lock: {name}")
    
    try:
        yield lock_value
    finally:
        # Release only if we own it (Lua script for atomicity)
        redis_client.eval("""
            if redis.call("get", KEYS[1]) == ARGV[1] then
                return redis.call("del", KEYS[1])
            end
            return 0
        """, 1, lock_key, lock_value)
```

## Production Configuration

### Memory Policy
```conf
# redis.conf
maxmemory 4gb
maxmemory-policy allkeys-lru    # Evict least recently used

# Policies: noeviction, allkeys-lru, volatile-lru, allkeys-random, volatile-ttl
```

### Persistence
```conf
# RDB snapshots (point-in-time)
save 900 1     # Save if 1 key changed in 900s
save 300 10    # Save if 10 keys changed in 300s

# AOF (append-only file, more durable)
appendonly yes
appendfsync everysec   # Good balance of durability/performance
```

### Monitoring
```bash
INFO memory          # Memory stats
INFO stats           # Hit rate, commands/sec
INFO clients         # Connected clients
SLOWLOG GET 10       # Last 10 slow commands
MONITOR              # Real-time command stream (debug only!)
```
