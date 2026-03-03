# Security Best Practices

OWASP Top 10 mitigations for Rust backends.

## OWASP Top 10 2025 Mitigations

### 1. Broken Access Control

```rust
// Always verify ownership in handlers
pub async fn update_post(
    user: CurrentUser,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(input): Json<UpdatePostInput>,
) -> Result<Json<Post>, AppError> {
    // Check ownership before update
    let post = state.repo.get_post(id).await?
        .ok_or(AppError::NotFound("Post not found".into()))?;
    
    if post.author_id != user.id && user.role != Role::Admin {
        return Err(AppError::Forbidden);
    }
    
    // Now safe to update
    let updated = state.repo.update_post(id, input).await?;
    Ok(Json(updated))
}
```

### 2. Cryptographic Failures

```rust
// Use Argon2id for passwords (not bcrypt, not SHA256)
use argon2::{Argon2, PasswordHash, PasswordHasher, PasswordVerifier};
use argon2::password_hash::{rand_core::OsRng, SaltString};

// Hash password
let salt = SaltString::generate(&mut OsRng);
let argon2 = Argon2::default();
let hash = argon2.hash_password(password.as_bytes(), &salt)?.to_string();

// Verify password
let parsed = PasswordHash::new(&hash)?;
argon2.verify_password(password.as_bytes(), &parsed)?;
```

### 3. Injection (SQL, Command, etc.)

```rust
// ✅ Parameterized queries - ALWAYS
let users = sqlx::query_as!(User,
    "SELECT id, name, email FROM users WHERE role = $1 AND status = $2",
    role,
    status
)
.fetch_all(&pool)
.await?;

// ❌ Never string concatenation
let query = format!("SELECT * FROM users WHERE role = '{}'", role); // SQL INJECTION!

// Command injection prevention
use std::process::Command;

// ✅ Use separate arguments
Command::new("convert")
    .arg(&input_path)
    .arg("-resize")
    .arg("100x100")
    .arg(&output_path)
    .output()?;

// ❌ Never shell interpolation
let cmd = format!("convert {} -resize 100x100 {}", input, output); // DANGER!
```

### 4. Insecure Design

```rust
// Rate limiting
use std::collections::HashMap;
use tokio::sync::Mutex;
use std::time::{Duration, Instant};

pub struct RateLimiter {
    requests: Mutex<HashMap<String, Vec<Instant>>>,
    max_requests: usize,
    window: Duration,
}

impl RateLimiter {
    pub async fn check(&self, key: &str) -> bool {
        let mut requests = self.requests.lock().await;
        let now = Instant::now();
        let entry = requests.entry(key.to_string()).or_default();
        
        // Clean old entries
        entry.retain(|&t| now.duration_since(t) < self.window);
        
        if entry.len() >= self.max_requests {
            return false;
        }
        
        entry.push(now);
        true
    }
}

// Account lockout after failed attempts
pub async fn check_login_attempts(pool: &PgPool, email: &str) -> Result<(), AppError> {
    let attempts: i64 = sqlx::query_scalar!(
        "SELECT COUNT(*) FROM login_attempts WHERE email = $1 AND created_at > NOW() - INTERVAL '15 minutes' AND success = false",
        email
    )
    .fetch_one(pool)
    .await?
    .unwrap_or(0);
    
    if attempts >= 5 {
        return Err(AppError::TooManyAttempts);
    }
    
    Ok(())
}
```

### 5. Security Misconfiguration

```rust
// Secure headers middleware
use tower_http::set_header::SetResponseHeaderLayer;
use http::{header, HeaderValue};

let security_headers = tower::ServiceBuilder::new()
    // Prevent MIME sniffing
    .layer(SetResponseHeaderLayer::overriding(
        header::X_CONTENT_TYPE_OPTIONS,
        HeaderValue::from_static("nosniff"),
    ))
    // Prevent clickjacking
    .layer(SetResponseHeaderLayer::overriding(
        header::X_FRAME_OPTIONS,
        HeaderValue::from_static("DENY"),
    ))
    // Enable HSTS
    .layer(SetResponseHeaderLayer::overriding(
        header::STRICT_TRANSPORT_SECURITY,
        HeaderValue::from_static("max-age=31536000; includeSubDomains"),
    ))
    // CSP
    .layer(SetResponseHeaderLayer::overriding(
        header::CONTENT_SECURITY_POLICY,
        HeaderValue::from_static("default-src 'self'"),
    ));

// CORS configuration
use tower_http::cors::{CorsLayer, AllowOrigin};

let cors = CorsLayer::new()
    .allow_origin(AllowOrigin::exact("https://example.com".parse().unwrap()))
    .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE])
    .allow_headers([header::CONTENT_TYPE, header::AUTHORIZATION])
    .max_age(Duration::from_secs(3600));
```

### 6. Vulnerable and Outdated Components

```toml
# Cargo.toml - Use cargo-audit
# Run: cargo install cargo-audit && cargo audit

# Use Dependabot or renovate for automatic updates
# Check advisories: https://rustsec.org/

# Pin versions appropriately
[dependencies]
axum = "0.7"  # Major version pinning
```

### 7. Identification and Authentication Failures

```rust
// Constant-time comparison for secrets
use subtle::ConstantTimeEq;

fn verify_api_key(provided: &[u8], expected: &[u8]) -> bool {
    provided.ct_eq(expected).into()
}

// Session security
pub struct SessionConfig {
    pub secure: bool,          // Only HTTPS
    pub http_only: bool,       // No JavaScript access
    pub same_site: SameSite,   // CSRF protection
    pub max_age: Duration,
}

// Token rotation
pub async fn refresh_session(pool: &PgPool, old_token: &str) -> Result<String, AppError> {
    let new_token = generate_secure_token();
    
    // Atomic swap
    let result = sqlx::query!(
        "UPDATE sessions SET token = $1, updated_at = NOW() WHERE token = $2 AND expires_at > NOW()",
        new_token,
        old_token
    )
    .execute(pool)
    .await?;
    
    if result.rows_affected() == 0 {
        return Err(AppError::Unauthorized);
    }
    
    Ok(new_token)
}
```

### 8. Software and Data Integrity Failures

```rust
// Verify signatures on external data
use hmac::{Hmac, Mac};
use sha2::Sha256;

type HmacSha256 = Hmac<Sha256>;

pub fn verify_webhook(payload: &[u8], signature: &str, secret: &[u8]) -> Result<(), AppError> {
    let mut mac = HmacSha256::new_from_slice(secret)
        .map_err(|_| AppError::Internal("Invalid key".into()))?;
    
    mac.update(payload);
    
    let expected = hex::decode(signature)
        .map_err(|_| AppError::Validation("Invalid signature format".into()))?;
    
    mac.verify_slice(&expected)
        .map_err(|_| AppError::Unauthorized)
}

// Content verification for uploads
pub fn verify_file_type(content: &[u8], expected_mime: &str) -> bool {
    // Use magic bytes, not file extension
    match expected_mime {
        "image/png" => content.starts_with(&[0x89, 0x50, 0x4E, 0x47]),
        "image/jpeg" => content.starts_with(&[0xFF, 0xD8, 0xFF]),
        "application/pdf" => content.starts_with(b"%PDF"),
        _ => false,
    }
}
```

### 9. Security Logging and Monitoring Failures

```rust
use tracing::{info, warn, error, instrument};

#[instrument(skip(password))]
pub async fn login(email: &str, password: &str) -> Result<User, AppError> {
    let result = authenticate(email, password).await;
    
    match &result {
        Ok(user) => {
            info!(
                user_id = %user.id,
                email = %email,
                "Successful login"
            );
        }
        Err(e) => {
            warn!(
                email = %email,
                error = ?e,
                "Failed login attempt"
            );
        }
    }
    
    result
}

// Security event logging
#[derive(Debug)]
pub enum SecurityEvent {
    FailedLogin { email: String, ip: String },
    PermissionDenied { user_id: Uuid, resource: String },
    SuspiciousActivity { user_id: Uuid, reason: String },
    RateLimitExceeded { ip: String },
}

pub fn log_security_event(event: SecurityEvent) {
    match event {
        SecurityEvent::FailedLogin { email, ip } => {
            warn!(
                event = "failed_login",
                email = %email,
                ip = %ip,
                "Failed login attempt"
            );
        }
        SecurityEvent::PermissionDenied { user_id, resource } => {
            warn!(
                event = "permission_denied",
                user_id = %user_id,
                resource = %resource,
                "Permission denied"
            );
        }
        // ... other events
    }
}
```

### 10. Server-Side Request Forgery (SSRF)

```rust
use std::net::IpAddr;
use url::Url;

pub fn is_safe_url(url_str: &str) -> Result<bool, AppError> {
    let url = Url::parse(url_str)
        .map_err(|_| AppError::Validation("Invalid URL".into()))?;
    
    // Only allow HTTPS
    if url.scheme() != "https" {
        return Ok(false);
    }
    
    // Check for internal IPs
    if let Some(host) = url.host_str() {
        // Block localhost
        if host == "localhost" || host == "127.0.0.1" || host == "::1" {
            return Ok(false);
        }
        
        // Block private ranges
        if let Ok(ip) = host.parse::<IpAddr>() {
            if is_private_ip(ip) {
                return Ok(false);
            }
        }
        
        // Block internal hostnames
        if host.ends_with(".internal") || host.ends_with(".local") {
            return Ok(false);
        }
    }
    
    Ok(true)
}

fn is_private_ip(ip: IpAddr) -> bool {
    match ip {
        IpAddr::V4(ipv4) => {
            ipv4.is_private() || 
            ipv4.is_loopback() || 
            ipv4.is_link_local()
        }
        IpAddr::V6(ipv6) => {
            ipv6.is_loopback()
        }
    }
}
```

---

## Input Validation

```rust
use validator::Validate;

#[derive(Debug, Deserialize, Validate)]
pub struct CreateUserInput {
    #[validate(length(min = 1, max = 100))]
    pub name: String,
    
    #[validate(email)]
    pub email: String,
    
    #[validate(length(min = 8, max = 128))]
    pub password: String,
}

// Validation middleware
pub async fn validate_input<T: Validate + DeserializeOwned>(
    Json(input): Json<T>,
) -> Result<Json<T>, AppError> {
    input.validate()
        .map_err(|e| AppError::Validation(e.to_string()))?;
    Ok(Json(input))
}

// Sanitize output
pub fn sanitize_html(input: &str) -> String {
    ammonia::clean(input)
}
```

---

## Security Checklist

```
Authentication:
[ ] Use Argon2id for password hashing
[ ] Implement rate limiting on login
[ ] Account lockout after failed attempts
[ ] Secure session management
[ ] Token rotation

Authorization:
[ ] Verify ownership on every request
[ ] Use RBAC appropriately
[ ] Principle of least privilege

Data Protection:
[ ] Parameterized queries (no SQL injection)
[ ] Input validation
[ ] Output encoding
[ ] HTTPS only

Headers:
[ ] X-Content-Type-Options: nosniff
[ ] X-Frame-Options: DENY
[ ] Strict-Transport-Security
[ ] Content-Security-Policy
[ ] CORS configured properly

Logging:
[ ] Log security events
[ ] Don't log sensitive data
[ ] Monitor for anomalies
```
