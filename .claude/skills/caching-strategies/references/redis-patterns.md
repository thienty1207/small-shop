# Redis Caching Patterns

> Production patterns for Redis caching.

## Connection Pooling

### Rust - bb8-redis

```rust
use bb8::Pool;
use bb8_redis::RedisConnectionManager;

pub type RedisPool = Pool<RedisConnectionManager>;

pub async fn create_pool(redis_url: &str) -> Result<RedisPool, Error> {
    let manager = RedisConnectionManager::new(redis_url)?;
    Pool::builder()
        .max_size(20)
        .min_idle(Some(5))
        .connection_timeout(Duration::from_secs(5))
        .build(manager)
        .await
        .map_err(Into::into)
}

// Usage
async fn get_cached(pool: &RedisPool, key: &str) -> Result<Option<String>, Error> {
    let mut conn = pool.get().await?;
    let value: Option<String> = conn.get(key).await?;
    Ok(value)
}
```

### Go - go-redis Pool

```go
import "github.com/redis/go-redis/v9"

func NewRedisClient() *redis.Client {
    return redis.NewClient(&redis.Options{
        Addr:         "localhost:6379",
        PoolSize:     20,
        MinIdleConns: 5,
        DialTimeout:  5 * time.Second,
        ReadTimeout:  3 * time.Second,
        WriteTimeout: 3 * time.Second,
    })
}
```

## Cache Stampede Prevention

### Locking Pattern

```rust
use tokio::sync::Mutex;
use std::collections::HashMap;

pub struct CacheWithLock {
    redis: RedisPool,
    locks: Mutex<HashMap<String, Arc<Mutex<()>>>>,
}

impl CacheWithLock {
    pub async fn get_or_fetch<T, F, Fut>(
        &self,
        key: &str,
        ttl: Duration,
        fetch: F,
    ) -> Result<T, Error>
    where
        T: Serialize + DeserializeOwned,
        F: FnOnce() -> Fut,
        Fut: Future<Output = Result<T, Error>>,
    {
        // Try cache first
        if let Some(cached) = self.get::<T>(key).await? {
            return Ok(cached);
        }
        
        // Get or create lock for this key
        let lock = {
            let mut locks = self.locks.lock().await;
            locks.entry(key.to_string())
                .or_insert_with(|| Arc::new(Mutex::new(())))
                .clone()
        };
        
        // Acquire lock
        let _guard = lock.lock().await;
        
        // Double-check cache (another request might have populated it)
        if let Some(cached) = self.get::<T>(key).await? {
            return Ok(cached);
        }
        
        // Fetch and cache
        let value = fetch().await?;
        self.set(key, &value, ttl).await?;
        
        Ok(value)
    }
}
```

### Probabilistic Early Expiration (PER)

```rust
/// Beta-based probabilistic expiration
fn should_refresh(ttl_remaining: Duration, compute_time: Duration, beta: f64) -> bool {
    let random: f64 = rand::random();
    let threshold = compute_time.as_secs_f64() * beta * random.ln().abs();
    ttl_remaining.as_secs_f64() < threshold
}

async fn get_with_per<T, F, Fut>(
    cache: &CacheService,
    key: &str,
    ttl: Duration,
    fetch: F,
) -> Result<T, Error>
where
    T: Serialize + DeserializeOwned + Clone,
    F: FnOnce() -> Fut,
    Fut: Future<Output = Result<T, Error>>,
{
    if let Some((value, ttl_remaining)) = cache.get_with_ttl::<T>(key).await? {
        // Estimate compute time (could track this)
        let compute_time = Duration::from_millis(100);
        
        if !should_refresh(ttl_remaining, compute_time, 1.0) {
            return Ok(value);
        }
        
        // Background refresh
        let cache = cache.clone();
        let key = key.to_string();
        tokio::spawn(async move {
            if let Ok(new_value) = fetch().await {
                let _ = cache.set(&key, &new_value, ttl).await;
            }
        });
        
        return Ok(value);
    }
    
    let value = fetch().await?;
    cache.set(key, &value, ttl).await?;
    Ok(value)
}
```

## Cache Patterns

### Write-Through

```rust
impl UserService {
    async fn update_user(&self, id: &str, update: UserUpdate) -> Result<User, Error> {
        // Update database
        let user = sqlx::query_as!(User, "UPDATE users SET ... WHERE id = $1", id)
            .fetch_one(&self.db)
            .await?;
        
        // Update cache immediately
        self.cache.set(
            &format!("user:{}", id),
            &user,
            Duration::from_secs(3600),
        ).await?;
        
        Ok(user)
    }
}
```

### Write-Behind (Async Write)

```rust
impl UserService {
    async fn update_user_fast(&self, id: &str, update: UserUpdate) -> Result<(), Error> {
        // Update cache immediately
        self.cache.set(
            &format!("user:{}", id),
            &update.into_user(),
            Duration::from_secs(3600),
        ).await?;
        
        // Queue database write
        self.write_queue.push(WriteJob::UpdateUser { id: id.to_string(), update }).await?;
        
        Ok(())
    }
}
```

## Distributed Locking

```rust
use redis::RedisResult;

/// Distributed lock with SET NX PX
pub async fn acquire_lock(
    conn: &mut redis::aio::Connection,
    key: &str,
    token: &str,
    ttl_ms: u64,
) -> RedisResult<bool> {
    let result: Option<String> = redis::cmd("SET")
        .arg(key)
        .arg(token)
        .arg("NX")
        .arg("PX")
        .arg(ttl_ms)
        .query_async(conn)
        .await?;
    
    Ok(result.is_some())
}

/// Release lock with Lua script (atomic check-and-delete)
pub async fn release_lock(
    conn: &mut redis::aio::Connection,
    key: &str,
    token: &str,
) -> RedisResult<bool> {
    let script = redis::Script::new(
        r#"
        if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
        else
            return 0
        end
        "#
    );
    
    let result: i32 = script.key(key).arg(token).invoke_async(conn).await?;
    Ok(result == 1)
}

// Usage with guard
pub struct DistributedLock<'a> {
    conn: &'a mut redis::aio::Connection,
    key: String,
    token: String,
}

impl<'a> DistributedLock<'a> {
    pub async fn acquire(
        conn: &'a mut redis::aio::Connection,
        key: &str,
        ttl: Duration,
    ) -> Option<DistributedLock<'a>> {
        let token = Uuid::new_v4().to_string();
        let acquired = acquire_lock(conn, key, &token, ttl.as_millis() as u64).await.ok()?;
        
        if acquired {
            Some(DistributedLock {
                conn,
                key: key.to_string(),
                token,
            })
        } else {
            None
        }
    }
    
    pub async fn release(mut self) -> RedisResult<bool> {
        release_lock(&mut self.conn, &self.key, &self.token).await
    }
}
```

## Cache Tags / Invalidation Groups

```rust
/// Invalidate all caches for an entity
pub async fn invalidate_user_caches(redis: &RedisPool, user_id: &str) -> Result<(), Error> {
    let mut conn = redis.get().await?;
    
    // Get all keys tagged with this user
    let tag_key = format!("tag:user:{}", user_id);
    let keys: Vec<String> = conn.smembers(&tag_key).await?;
    
    if !keys.is_empty() {
        // Delete all related keys
        conn.del(&keys).await?;
    }
    
    // Delete the tag set
    conn.del(&tag_key).await?;
    
    Ok(())
}

/// Set cache with tags
pub async fn set_with_tags(
    redis: &RedisPool,
    key: &str,
    value: &str,
    ttl: Duration,
    tags: &[&str],
) -> Result<(), Error> {
    let mut conn = redis.get().await?;
    
    // Set the value
    conn.set_ex(key, value, ttl.as_secs()).await?;
    
    // Add key to all tag sets
    for tag in tags {
        let tag_key = format!("tag:{}", tag);
        conn.sadd(&tag_key, key).await?;
    }
    
    Ok(())
}
```

## Monitoring

```rust
// Track cache metrics
async fn get_cached_with_metrics<T>(
    cache: &CacheService,
    key: &str,
) -> Result<Option<T>, Error>
where
    T: DeserializeOwned,
{
    let start = Instant::now();
    let result = cache.get::<T>(key).await?;
    
    histogram!("redis_operation_duration_seconds", "operation" => "get")
        .record(start.elapsed().as_secs_f64());
    
    if result.is_some() {
        counter!("cache_hits_total").increment(1);
    } else {
        counter!("cache_misses_total").increment(1);
    }
    
    Ok(result)
}
```
