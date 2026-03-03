# Caching Strategies

> Redis, in-memory caching, and cache patterns for high-performance applications.

## Metadata
- **Category:** backend-patterns
- **Scope:** Backend (Rust 60%, Go 15%, Python 15%, Node.js 10%)
- **Complexity:** Intermediate
- **Maturity:** Stable

## Reference Navigation

- [redis-patterns.md](references/redis-patterns.md) - Redis connection pooling, locking, cache stampede prevention

## Overview

Caching reduces database load and improves response times by storing frequently accessed data in fast storage layers.

### Caching Layers

| Layer | Tool | Latency | Use Case |
|-------|------|---------|----------|
| **In-Memory** | DashMap, sync.Map | ~1μs | Hot data, per-instance |
| **Distributed** | Redis, Memcached | ~1ms | Shared state, sessions |
| **CDN** | Cloudflare, Fastly | ~10ms | Static assets, API |
| **Database** | Query cache | ~5ms | Repeated queries |

## Cache Patterns

### Cache-Aside (Lazy Loading)

```
Read: Cache → Miss → DB → Write Cache → Return
Write: Update DB → Invalidate Cache
```

### Write-Through

```
Write: Update Cache → Update DB (sync)
Read: Cache → Hit → Return
```

### Write-Behind (Write-Back)

```
Write: Update Cache → Queue → Async DB Write
Read: Cache → Hit → Return
```

## Quick Start

### Rust - Redis

```rust
// Cargo.toml: redis = { version = "0.24", features = ["tokio-comp"] }

use redis::{AsyncCommands, Client};
use serde::{de::DeserializeOwned, Serialize};

pub struct CacheService {
    client: Client,
    prefix: String,
}

impl CacheService {
    pub fn new(redis_url: &str, prefix: &str) -> Result<Self, redis::RedisError> {
        Ok(Self {
            client: Client::open(redis_url)?,
            prefix: prefix.to_string(),
        })
    }
    
    fn key(&self, key: &str) -> String {
        format!("{}:{}", self.prefix, key)
    }
    
    pub async fn get<T: DeserializeOwned>(&self, key: &str) -> Option<T> {
        let mut conn = self.client.get_multiplexed_async_connection().await.ok()?;
        let data: Option<String> = conn.get(self.key(key)).await.ok()?;
        data.and_then(|s| serde_json::from_str(&s).ok())
    }
    
    pub async fn set<T: Serialize>(&self, key: &str, value: &T, ttl_secs: u64) -> Result<(), CacheError> {
        let mut conn = self.client.get_multiplexed_async_connection().await?;
        let json = serde_json::to_string(value)?;
        conn.set_ex(self.key(key), json, ttl_secs).await?;
        Ok(())
    }
    
    pub async fn delete(&self, key: &str) -> Result<(), CacheError> {
        let mut conn = self.client.get_multiplexed_async_connection().await?;
        conn.del(self.key(key)).await?;
        Ok(())
    }
    
    /// Cache-aside pattern with automatic fetch
    pub async fn get_or_fetch<T, F, Fut>(&self, key: &str, ttl_secs: u64, fetch: F) -> Result<T, CacheError>
    where
        T: Serialize + DeserializeOwned,
        F: FnOnce() -> Fut,
        Fut: std::future::Future<Output = Result<T, CacheError>>,
    {
        // Try cache first
        if let Some(cached) = self.get(key).await {
            return Ok(cached);
        }
        
        // Fetch from source
        let value = fetch().await?;
        
        // Store in cache
        self.set(key, &value, ttl_secs).await?;
        
        Ok(value)
    }
}
```

### Rust - In-Memory with DashMap

```rust
// Cargo.toml: dashmap = "5.5", tokio = { version = "1", features = ["time"] }

use dashmap::DashMap;
use std::{sync::Arc, time::{Duration, Instant}};

#[derive(Clone)]
struct CacheEntry<T> {
    value: T,
    expires_at: Instant,
}

pub struct MemoryCache<T> {
    data: Arc<DashMap<String, CacheEntry<T>>>,
}

impl<T: Clone> MemoryCache<T> {
    pub fn new() -> Self {
        let cache = Self {
            data: Arc::new(DashMap::new()),
        };
        cache.start_cleanup();
        cache
    }
    
    pub fn get(&self, key: &str) -> Option<T> {
        self.data.get(key).and_then(|entry| {
            if entry.expires_at > Instant::now() {
                Some(entry.value.clone())
            } else {
                None
            }
        })
    }
    
    pub fn set(&self, key: &str, value: T, ttl: Duration) {
        self.data.insert(key.to_string(), CacheEntry {
            value,
            expires_at: Instant::now() + ttl,
        });
    }
    
    fn start_cleanup(&self) {
        let data = self.data.clone();
        tokio::spawn(async move {
            loop {
                tokio::time::sleep(Duration::from_secs(60)).await;
                let now = Instant::now();
                data.retain(|_, entry| entry.expires_at > now);
            }
        });
    }
}
```

### Go - Redis

```go
import (
    "context"
    "encoding/json"
    "time"
    "github.com/redis/go-redis/v9"
)

type CacheService struct {
    client *redis.Client
    prefix string
}

func NewCacheService(addr, prefix string) *CacheService {
    return &CacheService{
        client: redis.NewClient(&redis.Options{Addr: addr}),
        prefix: prefix,
    }
}

func (c *CacheService) Get(ctx context.Context, key string, dest any) error {
    data, err := c.client.Get(ctx, c.prefix+":"+key).Bytes()
    if err != nil {
        return err
    }
    return json.Unmarshal(data, dest)
}

func (c *CacheService) Set(ctx context.Context, key string, value any, ttl time.Duration) error {
    data, err := json.Marshal(value)
    if err != nil {
        return err
    }
    return c.client.Set(ctx, c.prefix+":"+key, data, ttl).Err()
}

// Cache-aside pattern
func GetOrFetch[T any](ctx context.Context, cache *CacheService, key string, ttl time.Duration, fetch func() (T, error)) (T, error) {
    var result T
    
    err := cache.Get(ctx, key, &result)
    if err == nil {
        return result, nil
    }
    
    result, err = fetch()
    if err != nil {
        return result, err
    }
    
    cache.Set(ctx, key, result, ttl)
    return result, nil
}
```

### Python - Redis

```python
import redis
import json
from typing import TypeVar, Callable, Optional
from functools import wraps

T = TypeVar('T')

class CacheService:
    def __init__(self, url: str, prefix: str):
        self.client = redis.from_url(url)
        self.prefix = prefix
    
    def _key(self, key: str) -> str:
        return f"{self.prefix}:{key}"
    
    def get(self, key: str) -> Optional[dict]:
        data = self.client.get(self._key(key))
        return json.loads(data) if data else None
    
    def set(self, key: str, value: dict, ttl: int = 3600):
        self.client.setex(self._key(key), ttl, json.dumps(value))
    
    def delete(self, key: str):
        self.client.delete(self._key(key))

# Decorator pattern
def cached(cache: CacheService, ttl: int = 3600):
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            key = f"{func.__name__}:{hash(str(args) + str(kwargs))}"
            cached = cache.get(key)
            if cached:
                return cached
            
            result = await func(*args, **kwargs)
            cache.set(key, result, ttl)
            return result
        return wrapper
    return decorator

# Usage
@cached(cache, ttl=300)
async def get_user(user_id: str):
    return await db.users.find_one({"_id": user_id})
```

### Node.js - ioredis

```typescript
import Redis from 'ioredis';

export class CacheService {
  private client: Redis;
  
  constructor(url: string, private prefix: string) {
    this.client = new Redis(url);
  }
  
  async get<T>(key: string): Promise<T | null> {
    const data = await this.client.get(`${this.prefix}:${key}`);
    return data ? JSON.parse(data) : null;
  }
  
  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    await this.client.setex(`${this.prefix}:${key}`, ttlSeconds, JSON.stringify(value));
  }
  
  async getOrFetch<T>(
    key: string,
    ttlSeconds: number,
    fetch: () => Promise<T>
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached) return cached;
    
    const value = await fetch();
    await this.set(key, value, ttlSeconds);
    return value;
  }
}

// Usage with decorator pattern
function Cached(ttl: number) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const original = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const key = `${propertyKey}:${JSON.stringify(args)}`;
      return cache.getOrFetch(key, ttl, () => original.apply(this, args));
    };
    
    return descriptor;
  };
}
```

## Cache Invalidation

```rust
// Pattern: Invalidate on write
impl UserService {
    async fn update_user(&self, id: &str, update: UserUpdate) -> Result<User> {
        let user = self.db.update_user(id, update).await?;
        
        // Invalidate cache
        self.cache.delete(&format!("user:{}", id)).await?;
        
        Ok(user)
    }
}

// Pattern: Pub/Sub invalidation for distributed caches
// Publish invalidation event to all instances
redis.publish("cache:invalidate", format!("user:{}", id)).await?;
```

## Related Skills

- [databases](../databases/SKILL.md) - Redis as primary store
- [realtime-communication](../realtime-communication/SKILL.md) - Redis pub/sub
- [monitoring-observability](../monitoring-observability/SKILL.md) - Cache hit rates
