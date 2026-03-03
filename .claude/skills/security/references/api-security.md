# API Security Patterns

> Rate limiting, authentication, authorization, and protection strategies for APIs.

## Rate Limiting

### Rust/Axum - Tower Governor

```rust
// Cargo.toml
// tower = "0.4"
// governor = "0.6"
// tower_governor = "0.4"

use axum::{Router, routing::get};
use governor::{Quota, RateLimiter};
use nonzero_ext::nonzero;
use std::sync::Arc;
use tower_governor::{GovernorLayer, GovernorConfigBuilder, KeyExtractor};

// IP-based rate limiting
let config = GovernorConfigBuilder::default()
    .per_second(10)  // 10 requests per second burst
    .burst_size(100) // Up to 100 requests in buffer
    .finish()
    .unwrap();

let app = Router::new()
    .route("/api/*path", get(handler))
    .layer(GovernorLayer::new(&config));

// Custom key extractor (e.g., by API key)
#[derive(Clone)]
struct ApiKeyExtractor;

impl KeyExtractor for ApiKeyExtractor {
    type Key = String;
    
    fn extract<T>(&self, req: &http::Request<T>) -> Option<Self::Key> {
        req.headers()
            .get("X-API-Key")
            .and_then(|v| v.to_str().ok())
            .map(String::from)
    }
}

// Tiered rate limits
use std::collections::HashMap;

enum Tier {
    Free,      // 100 requests/hour
    Pro,       // 1000 requests/hour
    Enterprise, // 10000 requests/hour
}

struct TieredRateLimiter {
    limiters: HashMap<Tier, RateLimiter<String, _, _, _>>,
}

impl TieredRateLimiter {
    pub fn new() -> Self {
        let mut limiters = HashMap::new();
        
        limiters.insert(
            Tier::Free,
            RateLimiter::keyed(Quota::per_hour(nonzero!(100u32))),
        );
        limiters.insert(
            Tier::Pro,
            RateLimiter::keyed(Quota::per_hour(nonzero!(1000u32))),
        );
        limiters.insert(
            Tier::Enterprise,
            RateLimiter::keyed(Quota::per_hour(nonzero!(10000u32))),
        );
        
        Self { limiters }
    }
    
    pub fn check(&self, tier: &Tier, key: &str) -> Result<(), RateLimitExceeded> {
        self.limiters
            .get(tier)
            .ok_or(RateLimitExceeded)?
            .check_key(&key.to_string())
            .map_err(|_| RateLimitExceeded)
    }
}
```

### Go/Fiber - Rate Limiting

```go
package middleware

import (
    "sync"
    "time"
    
    "github.com/gofiber/fiber/v2"
    "github.com/gofiber/fiber/v2/middleware/limiter"
    "golang.org/x/time/rate"
)

// Basic rate limiting
func RateLimit() fiber.Handler {
    return limiter.New(limiter.Config{
        Max:        100,
        Expiration: 1 * time.Minute,
        KeyGenerator: func(c *fiber.Ctx) string {
            return c.IP()
        },
        LimitReached: func(c *fiber.Ctx) error {
            return c.Status(429).JSON(fiber.Map{
                "error": "Rate limit exceeded",
                "retry_after": 60,
            })
        },
        Storage: limiter.ConfigDefault.Storage,
    })
}

// Token bucket per API key
type TokenBucket struct {
    limiters sync.Map
}

func NewTokenBucket() *TokenBucket {
    return &TokenBucket{}
}

func (tb *TokenBucket) Allow(key string, rps float64, burst int) bool {
    limiter, _ := tb.limiters.LoadOrStore(key, rate.NewLimiter(rate.Limit(rps), burst))
    return limiter.(*rate.Limiter).Allow()
}

func TokenBucketMiddleware(tb *TokenBucket) fiber.Handler {
    return func(c *fiber.Ctx) error {
        apiKey := c.Get("X-API-Key")
        if apiKey == "" {
            return c.Status(401).JSON(fiber.Map{"error": "API key required"})
        }
        
        // Get tier limits from database
        rps, burst := getTierLimits(apiKey)
        
        if !tb.Allow(apiKey, rps, burst) {
            return c.Status(429).JSON(fiber.Map{"error": "Rate limit exceeded"})
        }
        
        return c.Next()
    }
}
```

### Python/FastAPI - Slowapi

```python
# pip install slowapi

from fastapi import FastAPI, Request
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app = FastAPI()
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.get("/api/resource")
@limiter.limit("10/minute")
async def get_resource(request: Request):
    return {"data": "value"}

# Custom key function (by API key)
def get_api_key(request: Request) -> str:
    return request.headers.get("X-API-Key", get_remote_address(request))

@app.get("/api/premium")
@limiter.limit("100/minute", key_func=get_api_key)
async def premium_resource(request: Request):
    return {"data": "premium"}

# Dynamic limits based on user tier
from functools import lru_cache

@lru_cache(maxsize=1000)
def get_user_limit(api_key: str) -> str:
    tier = get_user_tier(api_key)  # from database
    limits = {
        "free": "100/hour",
        "pro": "1000/hour",
        "enterprise": "10000/hour",
    }
    return limits.get(tier, "100/hour")

def dynamic_limit(key: str) -> str:
    return get_user_limit(key)

@app.get("/api/dynamic")
@limiter.limit(dynamic_limit)
async def dynamic_resource(request: Request):
    return {"data": "dynamic"}
```

### Node.js/Express - Rate Limiting

```typescript
// npm install express-rate-limit rate-limit-redis

import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';

const redisClient = createClient({ url: process.env.REDIS_URL });
await redisClient.connect();

// Basic IP-based limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisClient.sendCommand(args),
  }),
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: Math.ceil((req.rateLimit.resetTime.getTime() - Date.now()) / 1000),
    });
  },
});

app.use('/api', limiter);

// Tiered rate limiting
const createTieredLimiter = (tier: string) => {
  const limits = {
    free: { windowMs: 60 * 60 * 1000, max: 100 },
    pro: { windowMs: 60 * 60 * 1000, max: 1000 },
    enterprise: { windowMs: 60 * 60 * 1000, max: 10000 },
  };
  
  const config = limits[tier] || limits.free;
  
  return rateLimit({
    ...config,
    keyGenerator: (req) => req.headers['x-api-key'] as string,
    skip: (req) => !req.headers['x-api-key'],
  });
};
```

## API Key Management

### Rust - API Key Generation and Validation

```rust
use rand::{distributions::Alphanumeric, Rng};
use sha2::{Sha256, Digest};
use sqlx::PgPool;

#[derive(Debug, Clone)]
pub struct ApiKey {
    pub id: String,
    pub prefix: String,      // First 8 chars (stored plain)
    pub hash: String,        // SHA-256 hash of full key
    pub name: String,
    pub scopes: Vec<String>,
    pub rate_limit: i32,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub last_used_at: Option<chrono::DateTime<chrono::Utc>>,
}

impl ApiKey {
    pub fn generate(name: &str, scopes: Vec<String>) -> (Self, String) {
        // Generate a secure random key
        let key: String = rand::thread_rng()
            .sample_iter(&Alphanumeric)
            .take(32)
            .map(char::from)
            .collect();
        
        let prefixed_key = format!("sk_{}", key); // sk_ prefix for identification
        let prefix = prefixed_key[..11].to_string(); // sk_ + 8 chars
        
        // Hash the full key for storage
        let mut hasher = Sha256::new();
        hasher.update(prefixed_key.as_bytes());
        let hash = hex::encode(hasher.finalize());
        
        let api_key = Self {
            id: uuid::Uuid::new_v4().to_string(),
            prefix,
            hash,
            name: name.to_string(),
            scopes,
            rate_limit: 1000, // default
            created_at: chrono::Utc::now(),
            last_used_at: None,
        };
        
        (api_key, prefixed_key) // Return both; prefixed_key shown once to user
    }
}

pub struct ApiKeyService {
    pool: PgPool,
}

impl ApiKeyService {
    pub async fn validate(&self, key: &str) -> Result<ApiKey, ApiKeyError> {
        // Check prefix format
        if !key.starts_with("sk_") || key.len() != 35 {
            return Err(ApiKeyError::InvalidFormat);
        }
        
        let prefix = &key[..11];
        
        // Hash the provided key
        let mut hasher = Sha256::new();
        hasher.update(key.as_bytes());
        let hash = hex::encode(hasher.finalize());
        
        // Find by prefix, verify by hash
        let api_key = sqlx::query_as!(
            ApiKey,
            r#"SELECT * FROM api_keys WHERE prefix = $1 AND hash = $2 AND revoked = false"#,
            prefix,
            hash
        )
        .fetch_optional(&self.pool)
        .await?
        .ok_or(ApiKeyError::Invalid)?;
        
        // Update last used
        sqlx::query!(
            "UPDATE api_keys SET last_used_at = NOW() WHERE id = $1",
            api_key.id
        )
        .execute(&self.pool)
        .await?;
        
        Ok(api_key)
    }
    
    pub async fn create(&self, name: &str, scopes: Vec<String>) -> Result<(ApiKey, String), ApiKeyError> {
        let (api_key, plain_key) = ApiKey::generate(name, scopes);
        
        sqlx::query!(
            r#"
            INSERT INTO api_keys (id, prefix, hash, name, scopes, rate_limit, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            "#,
            api_key.id,
            api_key.prefix,
            api_key.hash,
            api_key.name,
            &api_key.scopes,
            api_key.rate_limit,
            api_key.created_at
        )
        .execute(&self.pool)
        .await?;
        
        Ok((api_key, plain_key))
    }
    
    pub async fn revoke(&self, id: &str) -> Result<(), ApiKeyError> {
        sqlx::query!("UPDATE api_keys SET revoked = true WHERE id = $1", id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }
}
```

### Middleware for API Key Authentication

```rust
use axum::{
    extract::{Request, State},
    http::StatusCode,
    middleware::Next,
    response::Response,
};

pub async fn api_key_auth(
    State(api_key_service): State<Arc<ApiKeyService>>,
    mut request: Request,
    next: Next,
) -> Result<Response, (StatusCode, String)> {
    let api_key = request
        .headers()
        .get("X-API-Key")
        .and_then(|v| v.to_str().ok())
        .ok_or((StatusCode::UNAUTHORIZED, "API key required".to_string()))?;
    
    let key = api_key_service
        .validate(api_key)
        .await
        .map_err(|e| (StatusCode::UNAUTHORIZED, format!("Invalid API key: {}", e)))?;
    
    // Add key info to request extensions
    request.extensions_mut().insert(key);
    
    Ok(next.run(request).await)
}

// Scope-based authorization
pub fn require_scope(scope: &'static str) -> impl Fn(Extension<ApiKey>) -> Result<(), StatusCode> + Clone {
    move |Extension(key): Extension<ApiKey>| {
        if key.scopes.contains(&scope.to_string()) || key.scopes.contains(&"*".to_string()) {
            Ok(())
        } else {
            Err(StatusCode::FORBIDDEN)
        }
    }
}
```

## Input Validation

### Rust - Validator

```rust
use validator::{Validate, ValidationError};
use serde::Deserialize;

#[derive(Debug, Deserialize, Validate)]
pub struct CreateUserRequest {
    #[validate(email)]
    pub email: String,
    
    #[validate(length(min = 8, max = 128))]
    pub password: String,
    
    #[validate(length(min = 1, max = 100))]
    pub name: String,
    
    #[validate(custom = "validate_username")]
    pub username: String,
}

fn validate_username(username: &str) -> Result<(), ValidationError> {
    let valid = username.len() >= 3 
        && username.len() <= 30
        && username.chars().all(|c| c.is_alphanumeric() || c == '_' || c == '-');
    
    if valid {
        Ok(())
    } else {
        Err(ValidationError::new("invalid_username"))
    }
}

// In handler
async fn create_user(
    Json(payload): Json<CreateUserRequest>,
) -> Result<Json<User>, (StatusCode, Json<serde_json::Value>)> {
    payload.validate().map_err(|e| {
        (StatusCode::BAD_REQUEST, Json(json!({
            "error": "Validation failed",
            "details": e.field_errors()
        })))
    })?;
    
    // Process valid request...
    Ok(Json(user))
}
```

### Python/FastAPI - Pydantic

```python
from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
import re

class CreateUserRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    name: str = Field(min_length=1, max_length=100)
    username: str = Field(min_length=3, max_length=30)
    
    @field_validator('username')
    @classmethod
    def validate_username(cls, v: str) -> str:
        if not re.match(r'^[a-zA-Z0-9_-]+$', v):
            raise ValueError('Username can only contain alphanumeric, _ and -')
        return v
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain uppercase')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain lowercase')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain digit')
        return v

@app.post("/users")
async def create_user(request: CreateUserRequest):
    # Validation happens automatically
    return await user_service.create(request)
```

## Request Signing

### Webhook Signature Verification

```rust
use hmac::{Hmac, Mac};
use sha2::Sha256;

type HmacSha256 = Hmac<Sha256>;

pub fn verify_webhook_signature(
    payload: &[u8],
    signature: &str,
    timestamp: i64,
    secret: &[u8],
) -> Result<(), WebhookError> {
    // Check timestamp (prevent replay attacks)
    let now = chrono::Utc::now().timestamp();
    if (now - timestamp).abs() > 300 { // 5 minute tolerance
        return Err(WebhookError::ExpiredTimestamp);
    }
    
    // Construct signed payload
    let signed_payload = format!("{}.{}", timestamp, String::from_utf8_lossy(payload));
    
    // Compute expected signature
    let mut mac = HmacSha256::new_from_slice(secret).unwrap();
    mac.update(signed_payload.as_bytes());
    let expected = hex::encode(mac.finalize().into_bytes());
    
    // Parse signature header (format: v1=<signature>)
    let sig = signature.strip_prefix("v1=").ok_or(WebhookError::InvalidFormat)?;
    
    // Constant-time comparison
    if constant_time_eq(sig.as_bytes(), expected.as_bytes()) {
        Ok(())
    } else {
        Err(WebhookError::InvalidSignature)
    }
}

// Axum middleware for webhook verification
pub async fn verify_webhook(
    State(config): State<WebhookConfig>,
    headers: HeaderMap,
    body: Bytes,
    next: Next,
) -> Result<Response, StatusCode> {
    let signature = headers
        .get("X-Signature")
        .and_then(|v| v.to_str().ok())
        .ok_or(StatusCode::UNAUTHORIZED)?;
    
    let timestamp: i64 = headers
        .get("X-Timestamp")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.parse().ok())
        .ok_or(StatusCode::BAD_REQUEST)?;
    
    verify_webhook_signature(&body, signature, timestamp, &config.secret)
        .map_err(|_| StatusCode::UNAUTHORIZED)?;
    
    Ok(next.run(request).await)
}
```

## API Versioning

```rust
use axum::{Router, routing::get, extract::Path};

pub fn versioned_api() -> Router {
    Router::new()
        .nest("/v1", v1_routes())
        .nest("/v2", v2_routes())
        // Version by header
        .route("/users", get(users_handler))
}

async fn users_handler(
    headers: HeaderMap,
) -> Response {
    let version = headers
        .get("API-Version")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("2024-01-01");
    
    match version {
        "2023-01-01" => v1::get_users().await,
        "2024-01-01" | _ => v2::get_users().await,
    }
}
```

## Security Headers

```rust
use tower_http::set_header::SetResponseHeaderLayer;

let app = Router::new()
    .route("/api/*path", get(handler))
    .layer(SetResponseHeaderLayer::if_not_present(
        header::X_CONTENT_TYPE_OPTIONS,
        HeaderValue::from_static("nosniff"),
    ))
    .layer(SetResponseHeaderLayer::if_not_present(
        header::CACHE_CONTROL,
        HeaderValue::from_static("no-store"),
    ));
```

## Best Practices

### API Key Security
- Hash keys in database (SHA-256)
- Use prefixes for identification (sk_, pk_)
- Implement key rotation
- Log key usage for auditing
- Set expiration dates

### Rate Limiting
- Use Redis for distributed limiting
- Return Retry-After header
- Implement tiered limits
- Exempt health check endpoints
- Log rate limit violations

### Input Validation
- Validate all inputs server-side
- Use allowlists over denylists
- Sanitize for context (HTML, SQL, etc.)
- Limit request body size
- Validate content types
