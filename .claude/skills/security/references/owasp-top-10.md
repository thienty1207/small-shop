# OWASP Top 10 Prevention

> Patterns for preventing the most critical web application security risks.

## A01:2021 - Broken Access Control

Access control enforces policy such that users cannot act outside their intended permissions.

### Rust/Axum - Role-Based Access Control

```rust
use axum::{
    extract::{Path, State},
    http::StatusCode,
    middleware::Next,
    response::Response,
    Extension,
};
use std::collections::HashSet;

#[derive(Clone, Debug)]
pub struct User {
    pub id: String,
    pub roles: HashSet<Role>,
}

#[derive(Clone, Debug, PartialEq, Eq, Hash)]
pub enum Role {
    Admin,
    Manager,
    User,
}

// Middleware to check role
pub async fn require_role(
    Extension(user): Extension<User>,
    required_roles: &[Role],
    next: Next,
) -> Result<Response, StatusCode> {
    if required_roles.iter().any(|role| user.roles.contains(role)) {
        Ok(next.run(request).await)
    } else {
        Err(StatusCode::FORBIDDEN)
    }
}

// Resource ownership check
pub async fn get_user_document(
    Extension(user): Extension<User>,
    Path(doc_id): Path<String>,
    State(db): State<DbPool>,
) -> Result<Json<Document>, StatusCode> {
    let doc = db.get_document(&doc_id).await.map_err(|_| StatusCode::NOT_FOUND)?;
    
    // Ownership check
    if doc.owner_id != user.id && !user.roles.contains(&Role::Admin) {
        return Err(StatusCode::FORBIDDEN);
    }
    
    Ok(Json(doc))
}

// Attribute-based access control
pub struct AccessPolicy {
    pub resource: String,
    pub action: Action,
    pub condition: Box<dyn Fn(&User, &dyn Resource) -> bool + Send + Sync>,
}

impl AccessPolicy {
    pub fn can_access(&self, user: &User, resource: &dyn Resource) -> bool {
        (self.condition)(user, resource)
    }
}
```

### Go/Fiber - RBAC Middleware

```go
type Role string

const (
    RoleAdmin   Role = "admin"
    RoleManager Role = "manager"
    RoleUser    Role = "user"
)

type User struct {
    ID    string
    Roles []Role
}

func RequireRoles(roles ...Role) fiber.Handler {
    return func(c *fiber.Ctx) error {
        user := c.Locals("user").(*User)
        
        for _, required := range roles {
            for _, userRole := range user.Roles {
                if userRole == required {
                    return c.Next()
                }
            }
        }
        
        return c.Status(403).JSON(fiber.Map{
            "error": "Forbidden: insufficient permissions",
        })
    }
}

// Resource ownership middleware
func RequireOwnership(resourceGetter func(c *fiber.Ctx) (string, error)) fiber.Handler {
    return func(c *fiber.Ctx) error {
        user := c.Locals("user").(*User)
        ownerID, err := resourceGetter(c)
        if err != nil {
            return c.Status(404).JSON(fiber.Map{"error": "Resource not found"})
        }
        
        if ownerID != user.ID && !hasRole(user, RoleAdmin) {
            return c.Status(403).JSON(fiber.Map{"error": "Forbidden"})
        }
        
        return c.Next()
    }
}
```

### Python/FastAPI - Permission Dependencies

```python
from enum import Enum
from typing import Set
from fastapi import Depends, HTTPException, status

class Permission(Enum):
    READ = "read"
    WRITE = "write"
    DELETE = "delete"
    ADMIN = "admin"

class User:
    def __init__(self, id: str, permissions: Set[Permission]):
        self.id = id
        self.permissions = permissions

def require_permissions(*required: Permission):
    async def dependency(user: User = Depends(get_current_user)):
        missing = set(required) - user.permissions
        if missing:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing permissions: {[p.value for p in missing]}"
            )
        return user
    return dependency

@app.get("/admin/users")
async def list_users(user: User = Depends(require_permissions(Permission.ADMIN))):
    return await get_all_users()

# Resource-level authorization
async def authorize_resource(
    resource_id: str,
    user: User = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    resource = await db.get(resource_id)
    if not resource:
        raise HTTPException(status_code=404, detail="Not found")
    
    if resource.owner_id != user.id and Permission.ADMIN not in user.permissions:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return resource
```

## A02:2021 - Cryptographic Failures

### Secure Password Storage

```rust
// See encryption-hashing.md for complete patterns
use argon2::{Argon2, PasswordHash, PasswordHasher, PasswordVerifier};

// Use Argon2id with secure parameters
let argon2 = Argon2::new(
    argon2::Algorithm::Argon2id,
    argon2::Version::V0x13,
    argon2::Params::new(65536, 3, 2, Some(32)).unwrap(), // 64MB, 3 iterations, 2 parallelism
);
```

### Encrypt Sensitive Data at Rest

```rust
use aes_gcm::{
    aead::{Aead, KeyInit, OsRng},
    Aes256Gcm, Nonce,
};

pub struct EncryptionService {
    cipher: Aes256Gcm,
}

impl EncryptionService {
    pub fn new(key: &[u8; 32]) -> Self {
        Self {
            cipher: Aes256Gcm::new_from_slice(key).unwrap(),
        }
    }
    
    pub fn encrypt(&self, plaintext: &[u8]) -> Result<Vec<u8>, aes_gcm::Error> {
        let nonce_bytes: [u8; 12] = rand::random();
        let nonce = Nonce::from_slice(&nonce_bytes);
        
        let ciphertext = self.cipher.encrypt(nonce, plaintext)?;
        
        // Prepend nonce to ciphertext
        let mut result = nonce_bytes.to_vec();
        result.extend(ciphertext);
        Ok(result)
    }
    
    pub fn decrypt(&self, ciphertext: &[u8]) -> Result<Vec<u8>, aes_gcm::Error> {
        if ciphertext.len() < 12 {
            return Err(aes_gcm::Error);
        }
        
        let (nonce_bytes, encrypted) = ciphertext.split_at(12);
        let nonce = Nonce::from_slice(nonce_bytes);
        
        self.cipher.decrypt(nonce, encrypted)
    }
}
```

## A03:2021 - Injection

### SQL Injection Prevention

```rust
// ✅ SAFE: Parameterized queries with sqlx
let user = sqlx::query_as!(
    User,
    "SELECT * FROM users WHERE email = $1",
    email
)
.fetch_optional(&pool)
.await?;

// ❌ UNSAFE: String interpolation
let query = format!("SELECT * FROM users WHERE email = '{}'", email);
```

```go
// ✅ SAFE: Parameterized queries
row := db.QueryRow("SELECT * FROM users WHERE email = $1", email)

// ❌ UNSAFE: String concatenation
query := "SELECT * FROM users WHERE email = '" + email + "'"
```

```python
# ✅ SAFE: SQLAlchemy with bound parameters
stmt = select(User).where(User.email == email)
result = await session.execute(stmt)

# ❌ UNSAFE: f-strings in queries
query = f"SELECT * FROM users WHERE email = '{email}'"
```

### Command Injection Prevention

```rust
use std::process::Command;

// ✅ SAFE: Pass arguments separately
let output = Command::new("git")
    .args(["log", "--oneline", "-n", &count.to_string()])
    .output()?;

// ❌ UNSAFE: Shell interpolation
let output = Command::new("sh")
    .arg("-c")
    .arg(format!("git log --oneline -n {}", user_input))
    .output()?;
```

### NoSQL Injection Prevention (MongoDB)

```rust
// ✅ SAFE: Type-safe queries
let filter = doc! { "email": email };
let user = collection.find_one(filter, None).await?;

// ❌ UNSAFE: Accepting raw query objects from input
let filter: Document = serde_json::from_str(&user_input)?;
```

## A04:2021 - Insecure Design

### Multi-Factor Authentication

```rust
use totp_rs::{Algorithm, TOTP, Secret};

pub struct MfaService {
    issuer: String,
}

impl MfaService {
    pub fn generate_secret(&self, user_email: &str) -> Result<(String, String), MfaError> {
        let secret = Secret::generate_secret();
        
        let totp = TOTP::new(
            Algorithm::SHA1,
            6,
            1,
            30,
            secret.to_bytes().unwrap(),
            Some(self.issuer.clone()),
            user_email.to_string(),
        )?;
        
        let qr_url = totp.get_url();
        let secret_base32 = secret.to_encoded().to_string();
        
        Ok((secret_base32, qr_url))
    }
    
    pub fn verify_code(&self, secret_base32: &str, code: &str) -> bool {
        let secret = Secret::Encoded(secret_base32.to_string());
        
        let totp = TOTP::new(
            Algorithm::SHA1,
            6,
            1,
            30,
            secret.to_bytes().unwrap(),
            None,
            String::new(),
        ).unwrap();
        
        totp.check_current(code).unwrap_or(false)
    }
}
```

### Secure Session Management

```rust
use axum_extra::extract::cookie::{Cookie, SameSite};
use tower_sessions::{SessionManagerLayer, MemoryStore};

// Secure cookie configuration
let cookie = Cookie::build(("session_id", session_id))
    .path("/")
    .secure(true)              // HTTPS only
    .http_only(true)           // No JavaScript access
    .same_site(SameSite::Strict) // CSRF protection
    .max_age(time::Duration::hours(24))
    .build();

// Session store with secure defaults
let session_store = MemoryStore::default();
let session_layer = SessionManagerLayer::new(session_store)
    .with_secure(true)
    .with_same_site(SameSite::Strict);
```

## A05:2021 - Security Misconfiguration

### CORS Configuration

```rust
use tower_http::cors::{CorsLayer, AllowOrigin};

// ❌ BAD: Allow all origins
let cors = CorsLayer::permissive();

// ✅ GOOD: Restrictive CORS
let cors = CorsLayer::new()
    .allow_origin(AllowOrigin::list([
        "https://app.example.com".parse().unwrap(),
        "https://admin.example.com".parse().unwrap(),
    ]))
    .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE])
    .allow_headers([CONTENT_TYPE, AUTHORIZATION])
    .allow_credentials(true)
    .max_age(Duration::from_secs(3600));
```

### Error Handling (No Stack Traces)

```rust
use axum::response::{IntoResponse, Response};

#[derive(Debug)]
pub enum AppError {
    NotFound,
    Unauthorized,
    Internal(anyhow::Error),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        // Log internal details
        if let AppError::Internal(ref e) = self {
            tracing::error!(error = %e, "Internal error occurred");
        }
        
        // Return safe response
        let (status, message) = match self {
            AppError::NotFound => (StatusCode::NOT_FOUND, "Resource not found"),
            AppError::Unauthorized => (StatusCode::UNAUTHORIZED, "Authentication required"),
            AppError::Internal(_) => (StatusCode::INTERNAL_SERVER_ERROR, "An error occurred"),
        };
        
        (status, Json(json!({ "error": message }))).into_response()
    }
}
```

## A06:2021 - Vulnerable Components

See [dependency-security.md](dependency-security.md) for automated scanning.

## A07:2021 - Authentication Failures

### Account Lockout

```rust
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

pub struct LoginAttemptTracker {
    attempts: Arc<RwLock<HashMap<String, Vec<i64>>>>,
    max_attempts: usize,
    window_seconds: i64,
    lockout_seconds: i64,
}

impl LoginAttemptTracker {
    pub async fn check_and_record(&self, identifier: &str) -> Result<(), LockoutError> {
        let now = chrono::Utc::now().timestamp();
        let mut attempts = self.attempts.write().await;
        
        let user_attempts = attempts.entry(identifier.to_string()).or_default();
        
        // Clean old attempts
        user_attempts.retain(|&ts| now - ts < self.window_seconds);
        
        // Check lockout
        if user_attempts.len() >= self.max_attempts {
            let oldest_in_window = *user_attempts.first().unwrap();
            let lockout_until = oldest_in_window + self.lockout_seconds;
            
            if now < lockout_until {
                return Err(LockoutError::Locked {
                    until: chrono::DateTime::from_timestamp(lockout_until, 0).unwrap(),
                });
            } else {
                user_attempts.clear();
            }
        }
        
        // Record this attempt
        user_attempts.push(now);
        
        Ok(())
    }
    
    pub async fn clear(&self, identifier: &str) {
        self.attempts.write().await.remove(identifier);
    }
}
```

### Secure Password Requirements

```rust
use unicode_segmentation::UnicodeSegmentation;

pub struct PasswordPolicy {
    min_length: usize,
    require_uppercase: bool,
    require_lowercase: bool,
    require_digit: bool,
    require_special: bool,
}

impl PasswordPolicy {
    pub fn validate(&self, password: &str) -> Result<(), Vec<String>> {
        let mut errors = Vec::new();
        
        // Count graphemes (handles unicode properly)
        let length = password.graphemes(true).count();
        if length < self.min_length {
            errors.push(format!("Password must be at least {} characters", self.min_length));
        }
        
        if self.require_uppercase && !password.chars().any(|c| c.is_uppercase()) {
            errors.push("Password must contain an uppercase letter".to_string());
        }
        
        if self.require_lowercase && !password.chars().any(|c| c.is_lowercase()) {
            errors.push("Password must contain a lowercase letter".to_string());
        }
        
        if self.require_digit && !password.chars().any(|c| c.is_ascii_digit()) {
            errors.push("Password must contain a digit".to_string());
        }
        
        if self.require_special && !password.chars().any(|c| !c.is_alphanumeric()) {
            errors.push("Password must contain a special character".to_string());
        }
        
        // Check against common passwords (use a proper list in production)
        let common = ["password", "123456", "qwerty", "admin"];
        if common.iter().any(|&p| password.to_lowercase().contains(p)) {
            errors.push("Password is too common".to_string());
        }
        
        if errors.is_empty() {
            Ok(())
        } else {
            Err(errors)
        }
    }
}
```

## A08:2021 - Software and Data Integrity

### Subresource Integrity

```html
<!-- Frontend: Verify external scripts -->
<script 
  src="https://cdn.example.com/library.js"
  integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC"
  crossorigin="anonymous">
</script>
```

### Signed API Responses

```rust
use hmac::{Hmac, Mac};
use sha2::Sha256;

type HmacSha256 = Hmac<Sha256>;

pub fn sign_response(body: &[u8], secret: &[u8]) -> String {
    let mut mac = HmacSha256::new_from_slice(secret).unwrap();
    mac.update(body);
    hex::encode(mac.finalize().into_bytes())
}

pub fn verify_signature(body: &[u8], signature: &str, secret: &[u8]) -> bool {
    let expected = sign_response(body, secret);
    // Constant-time comparison
    constant_time_eq(signature.as_bytes(), expected.as_bytes())
}
```

## A09:2021 - Security Logging and Monitoring

See [../monitoring-observability/SKILL.md](../monitoring-observability/SKILL.md) for complete patterns.

```rust
use tracing::{info, warn, error};

// Log security events
info!(
    event = "login_success",
    user_id = %user.id,
    ip = %remote_addr,
    user_agent = %user_agent,
    "User logged in successfully"
);

warn!(
    event = "login_failure",
    email = %email,
    ip = %remote_addr,
    reason = "invalid_password",
    attempt = %attempt_count,
    "Failed login attempt"
);

error!(
    event = "rate_limit_exceeded",
    ip = %remote_addr,
    endpoint = %path,
    "Rate limit exceeded"
);
```

## A10:2021 - Server-Side Request Forgery (SSRF)

### URL Validation

```rust
use url::Url;
use std::net::IpAddr;

pub fn validate_url(url_str: &str, allowed_hosts: &[&str]) -> Result<Url, SsrfError> {
    let url = Url::parse(url_str).map_err(|_| SsrfError::InvalidUrl)?;
    
    // Only allow HTTPS
    if url.scheme() != "https" {
        return Err(SsrfError::InsecureScheme);
    }
    
    // Check against allowlist
    let host = url.host_str().ok_or(SsrfError::NoHost)?;
    if !allowed_hosts.iter().any(|&h| host == h || host.ends_with(&format!(".{}", h))) {
        return Err(SsrfError::HostNotAllowed);
    }
    
    // Resolve and check IP (prevent DNS rebinding)
    let ips: Vec<IpAddr> = dns_lookup::lookup_host(host)
        .map_err(|_| SsrfError::DnsFailure)?;
    
    for ip in ips {
        if is_private_ip(&ip) || is_loopback(&ip) {
            return Err(SsrfError::PrivateIp);
        }
    }
    
    Ok(url)
}

fn is_private_ip(ip: &IpAddr) -> bool {
    match ip {
        IpAddr::V4(ipv4) => {
            ipv4.is_private() || 
            ipv4.is_loopback() || 
            ipv4.is_link_local() ||
            ipv4.octets()[0] == 10 ||                          // 10.0.0.0/8
            (ipv4.octets()[0] == 172 && (16..=31).contains(&ipv4.octets()[1])) || // 172.16.0.0/12
            (ipv4.octets()[0] == 192 && ipv4.octets()[1] == 168)  // 192.168.0.0/16
        }
        IpAddr::V6(ipv6) => ipv6.is_loopback(),
    }
}
```

## Quick Reference: Prevention Checklist

| Vulnerability | Prevention |
|--------------|------------|
| A01 Access Control | RBAC/ABAC, ownership checks, deny by default |
| A02 Crypto Failures | Argon2id, AES-256-GCM, TLS 1.3 |
| A03 Injection | Parameterized queries, input validation |
| A04 Insecure Design | MFA, secure sessions, threat modeling |
| A05 Misconfiguration | Strict CORS, no stack traces, secure defaults |
| A06 Vulnerable Components | Automated scanning, SBOM |
| A07 Auth Failures | Account lockout, strong passwords, MFA |
| A08 Integrity | SRI, signed responses, verified updates |
| A09 Logging | Security events, monitoring, alerting |
| A10 SSRF | URL allowlisting, IP validation |
