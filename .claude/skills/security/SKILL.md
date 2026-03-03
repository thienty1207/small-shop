# Security

> Production-ready application security patterns across web, API, and data layers.


## Metadata
- **Category:** security
- **Scope:** Backend (Rust 60%, Go 15%, Python 15%, Node.js 10%) + Frontend (Next.js)
- **Complexity:** Advanced
- **Maturity:** Stable

## Overview

This skill covers comprehensive security practices for full-stack applications, from OWASP vulnerabilities to encryption, API protection, and DevSecOps. All patterns support multiple backend stacks with production-ready implementations.

### Security Layers

| Layer | Focus | References |
|-------|-------|------------|
| **Application** | OWASP Top 10, input validation, injection prevention | owasp-top-10.md |
| **Data** | Encryption at rest/transit, hashing, key management | encryption-hashing.md |
| **API** | Rate limiting, authentication, authorization | api-security.md |
| **Transport** | HTTPS, security headers, CORS, CSP | security-headers.md |
| **Infrastructure** | Secrets management, environment isolation | secrets-management.md |
| **Supply Chain** | Dependency scanning, container security | dependency-security.md |

### Stack Coverage

| Stack | Primary Libraries |
|-------|------------------|
| **Rust/Axum** | argon2, aes-gcm, jsonwebtoken, tower-http |
| **Go/Fiber** | golang.org/x/crypto, go-jose, casbin |
| **Python/FastAPI** | passlib, cryptography, python-jose |
| **Node.js/Express** | bcrypt, jose, helmet, crypto |
| **Next.js** | next-auth, iron-session, middleware |

## Reference Navigation

### Core Security
- [owasp-top-10.md](references/owasp-top-10.md) - OWASP vulnerability prevention
- [encryption-hashing.md](references/encryption-hashing.md) - Cryptography patterns
- [api-security.md](references/api-security.md) - API protection strategies

### Infrastructure Security
- [security-headers.md](references/security-headers.md) - HTTP security headers
- [secrets-management.md](references/secrets-management.md) - Secrets and environment security
- [dependency-security.md](references/dependency-security.md) - Supply chain security

## Quick Patterns

### Password Hashing (Argon2id)

```rust
// Rust - argon2
use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};

pub fn hash_password(password: &str) -> Result<String, argon2::password_hash::Error> {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    Ok(argon2.hash_password(password.as_bytes(), &salt)?.to_string())
}

pub fn verify_password(password: &str, hash: &str) -> Result<bool, argon2::password_hash::Error> {
    let parsed_hash = PasswordHash::new(hash)?;
    Ok(Argon2::default().verify_password(password.as_bytes(), &parsed_hash).is_ok())
}
```

```go
// Go - golang.org/x/crypto/argon2
import (
    "crypto/rand"
    "crypto/subtle"
    "encoding/base64"
    "errors"
    "fmt"
    "strings"
    
    "golang.org/x/crypto/argon2"
)

type params struct {
    memory      uint32
    iterations  uint32
    parallelism uint8
    saltLength  uint32
    keyLength   uint32
}

var defaultParams = &params{
    memory:      64 * 1024,
    iterations:  3,
    parallelism: 2,
    saltLength:  16,
    keyLength:   32,
}

func HashPassword(password string) (string, error) {
    salt := make([]byte, defaultParams.saltLength)
    if _, err := rand.Read(salt); err != nil {
        return "", err
    }
    
    hash := argon2.IDKey([]byte(password), salt, 
        defaultParams.iterations, defaultParams.memory, 
        defaultParams.parallelism, defaultParams.keyLength)
    
    return fmt.Sprintf("$argon2id$v=%d$m=%d,t=%d,p=%d$%s$%s",
        argon2.Version, defaultParams.memory, defaultParams.iterations,
        defaultParams.parallelism, base64.RawStdEncoding.EncodeToString(salt),
        base64.RawStdEncoding.EncodeToString(hash)), nil
}
```

```python
# Python - passlib with argon2
from passlib.context import CryptContext

pwd_context = CryptContext(
    schemes=["argon2"],
    deprecated="auto",
    argon2__memory_cost=65536,  # 64 MB
    argon2__time_cost=3,
    argon2__parallelism=2,
)

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(password: str, hashed: str) -> bool:
    return pwd_context.verify(password, hashed)
```

```typescript
// Node.js - argon2
import argon2 from 'argon2';

async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3,
    parallelism: 2,
  });
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return argon2.verify(hash, password);
}
```

### Rate Limiting

```rust
// Rust/Axum - tower rate limiting
use std::time::Duration;
use tower::ServiceBuilder;
use tower_http::limit::RateLimitLayer;

let app = Router::new()
    .route("/api/*path", get(handler))
    .layer(
        ServiceBuilder::new()
            .layer(RateLimitLayer::new(100, Duration::from_secs(60)))
    );

// With per-IP limiting using governor
use governor::{Quota, RateLimiter};
use nonzero_ext::nonzero;

let limiter = RateLimiter::keyed(Quota::per_minute(nonzero!(100u32)));

async fn rate_limited(
    State(limiter): State<Arc<KeyedRateLimiter<IpAddr>>>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
) -> Result<(), StatusCode> {
    limiter.check_key(&addr.ip()).map_err(|_| StatusCode::TOO_MANY_REQUESTS)?;
    Ok(())
}
```

```go
// Go/Fiber - rate limiting middleware
import (
    "github.com/gofiber/fiber/v2"
    "github.com/gofiber/fiber/v2/middleware/limiter"
    "time"
)

app.Use(limiter.New(limiter.Config{
    Max:        100,
    Expiration: 1 * time.Minute,
    KeyGenerator: func(c *fiber.Ctx) string {
        return c.IP()
    },
    LimitReached: func(c *fiber.Ctx) error {
        return c.Status(429).JSON(fiber.Map{
            "error": "Too many requests",
        })
    },
}))
```

### JWT Validation

```rust
// Rust - jsonwebtoken
use jsonwebtoken::{decode, encode, Algorithm, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,        // Subject (user ID)
    pub exp: usize,         // Expiration time
    pub iat: usize,         // Issued at
    pub role: String,       // User role
}

pub fn create_token(user_id: &str, role: &str, secret: &[u8]) -> Result<String, jsonwebtoken::errors::Error> {
    let now = chrono::Utc::now().timestamp() as usize;
    let claims = Claims {
        sub: user_id.to_string(),
        exp: now + 3600, // 1 hour
        iat: now,
        role: role.to_string(),
    };
    
    encode(&Header::default(), &claims, &EncodingKey::from_secret(secret))
}

pub fn validate_token(token: &str, secret: &[u8]) -> Result<Claims, jsonwebtoken::errors::Error> {
    let validation = Validation::new(Algorithm::HS256);
    let token_data = decode::<Claims>(token, &DecodingKey::from_secret(secret), &validation)?;
    Ok(token_data.claims)
}
```

## Security Checklist

### Pre-Production

- [ ] All passwords hashed with Argon2id
- [ ] JWT secrets are strong (≥256 bits) and rotatable
- [ ] SQL queries use parameterized statements
- [ ] Input validation on all endpoints
- [ ] Rate limiting enabled
- [ ] CORS configured restrictively
- [ ] Security headers configured (CSP, HSTS, etc.)
- [ ] Sensitive data encrypted at rest
- [ ] TLS 1.3 enforced
- [ ] Secrets stored in vault (not env files)

### Dependency Security

- [ ] `cargo audit` / `npm audit` / `pip-audit` in CI
- [ ] Dependabot or Renovate enabled
- [ ] Container images scanned
- [ ] SBOM generated

## Related Skills

- [authentication](../authentication/SKILL.md) - Auth implementation patterns
- [databases](../databases/SKILL.md) - Secure database practices
- [devops](../devops/SKILL.md) - Infrastructure security
- [testing](../testing/SKILL.md) - Security testing patterns
- [monitoring-observability](../monitoring-observability/SKILL.md) - Security monitoring

## References

- [OWASP Top 10](https://owasp.org/Top10/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [NIST Cryptographic Standards](https://csrc.nist.gov/publications)
