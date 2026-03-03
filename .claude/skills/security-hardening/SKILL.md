---
name: security-hardening
description: >
  Deep security hardening for multi-stack backends. Covers OWASP Top 10, input validation,
  authentication security, API protection, dependency scanning, and supply chain security.
  Multi-stack: Rust, Go, Python, Node.js. Use PROACTIVELY when implementing any security-sensitive
  feature or before production deployment.
---

# Security Hardening

Defense-in-depth security patterns for production backends. Goes beyond basic OWASP to cover
supply chain security, runtime protection, and security-first coding practices.

## When to Use

- Implementing authentication/authorization
- Handling user input or file uploads
- Building payment or PII-handling features
- Before production deployment (security review)
- After dependency updates (vulnerability scan)

## When NOT to Use

- Frontend-only UI styling
- Non-security-related refactoring
- This is a complement to `security`, not a replacement

---

## OWASP Top 10 — Multi-Stack Quick Reference

### 1. Injection (SQL, NoSQL, OS Command)

```
RULE: NEVER concatenate user input into queries.
ALWAYS use parameterized queries / prepared statements.
```

#### Rust (SQLx)
```rust
// ❌ DANGEROUS
let query = format!("SELECT * FROM users WHERE email = '{}'", email);

// ✅ SAFE: Parameterized
let user = sqlx::query_as!(User,
    "SELECT * FROM users WHERE email = $1", email
).fetch_one(&pool).await?;
```

#### Go (database/sql)
```go
// ❌ DANGEROUS
query := fmt.Sprintf("SELECT * FROM users WHERE email = '%s'", email)

// ✅ SAFE: Parameterized
row := db.QueryRow("SELECT * FROM users WHERE email = $1", email)
```

#### Python (SQLAlchemy)
```python
# ❌ DANGEROUS
cursor.execute(f"SELECT * FROM users WHERE email = '{email}'")

# ✅ SAFE: Parameterized
cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
```

#### Node.js (pg)
```javascript
// ❌ DANGEROUS
await pool.query(`SELECT * FROM users WHERE email = '${email}'`);

// ✅ SAFE: Parameterized
await pool.query('SELECT * FROM users WHERE email = $1', [email]);
```

---

### 2. Input Validation

```
VALIDATE on the server, ALWAYS.
Client-side validation is for UX, not security.

Validation layers:
├── Type validation (string, number, date)
├── Format validation (email, URL, phone)
├── Range validation (min/max length, number range)
├── Business validation (unique email, valid status)
└── Sanitization (strip HTML, normalize Unicode)
```

#### Multi-Stack Validation

```rust
// Rust: validator crate
use validator::Validate;

#[derive(Validate)]
struct CreateUser {
    #[validate(email)]
    email: String,
    #[validate(length(min = 8, max = 128))]
    password: String,
    #[validate(length(min = 1, max = 100))]
    name: String,
}
```

```python
# Python: Pydantic
from pydantic import BaseModel, EmailStr, constr

class CreateUser(BaseModel):
    email: EmailStr
    password: constr(min_length=8, max_length=128)
    name: constr(min_length=1, max_length=100)
```

```go
// Go: go-playground/validator
type CreateUser struct {
    Email    string `validate:"required,email"`
    Password string `validate:"required,min=8,max=128"`
    Name     string `validate:"required,min=1,max=100"`
}
```

---

### 3. Authentication Security

```
Password Storage:
├── ALWAYS hash with Argon2id (preferred) or bcrypt
├── NEVER use MD5, SHA-1, or SHA-256 for passwords
├── Salt is automatic with Argon2id/bcrypt
└── Set appropriate cost factor

Session Management:
├── Use HttpOnly, Secure, SameSite cookies
├── Rotate session ID after login
├── Set reasonable expiration (15min-24h)
└── Invalidate on logout (server-side)

JWT Best Practices:
├── Short expiration (15 minutes)
├── Use refresh tokens (longer lived)
├── Store refresh token server-side
├── Sign with RS256 (not HS256 in production)
└── NEVER store sensitive data in JWT payload
```

---

### 4. HTTP Security Headers

```
MUST-HAVE headers for every API:

Content-Security-Policy: default-src 'self'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-XSS-Protection: 0  (deprecated, use CSP)
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

#### Multi-Stack Headers

```rust
// Rust: tower-http
use tower_http::set_header::SetResponseHeaderLayer;
let app = Router::new()
    .route("/api/users", get(list_users))
    .layer(SetResponseHeaderLayer::overriding(
        header::X_CONTENT_TYPE_OPTIONS, HeaderValue::from_static("nosniff")
    ));
```

```go
// Go: middleware
func securityHeaders(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("X-Content-Type-Options", "nosniff")
        w.Header().Set("X-Frame-Options", "DENY")
        next.ServeHTTP(w, r)
    })
}
```

```python
# Python: FastAPI middleware
@app.middleware("http")
async def security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    return response
```

---

### 5. Rate Limiting

```
Strategy:
├── Global: 1000 req/min per IP
├── Auth endpoints: 5 req/min per IP
├── API: 100 req/min per token
└── Expensive operations: 10 req/hour

Algorithm: Token bucket or sliding window
Storage: Redis (distributed) or in-memory (single instance)
Response: 429 Too Many Requests + Retry-After header
```

---

### 6. Dependency / Supply Chain Security

```
CRITICAL: Your dependencies ARE your attack surface.

Scanning schedule:
├── Every PR: cargo audit / npm audit / safety check
├── Weekly: Full dependency audit
├── Monthly: License compliance check
└── Quarterly: Review unused dependencies

Tools by stack:
├── Rust:    cargo audit, cargo deny
├── Go:      govulncheck, nancy
├── Python:  safety, pip-audit, bandit
├── Node.js: npm audit, snyk
└── All:     Dependabot, Renovate Bot
```

---

### 7. Secrets Management

```
NEVER:
├── ❌ Hardcode secrets in source code
├── ❌ Commit .env files to git
├── ❌ Log secrets or tokens
└── ❌ Pass secrets as CLI arguments

ALWAYS:
├── ✅ Use environment variables (minimum)
├── ✅ Use secrets manager (Vault, AWS Secrets Manager)
├── ✅ Rotate secrets regularly
├── ✅ Use different secrets per environment
└── ✅ Audit secret access
```

---

## Security Checklist

### Before Every Feature:
- [ ] Input validated on server side
- [ ] SQL queries parameterized
- [ ] Auth/authz checked
- [ ] Rate limiting applied
- [ ] Error messages don't leak internals

### Before Production:
- [ ] Security headers configured
- [ ] HTTPS enforced (HSTS)
- [ ] Dependencies audited
- [ ] Secrets in secrets manager
- [ ] Logging captures security events
- [ ] CORS configured correctly
- [ ] File upload validated (type, size)

---

## Related Skills

- [security](../security/SKILL.md) — Base security patterns
- [authentication](../authentication/SKILL.md) — Auth implementations
- [backend-architect](../backend-architect/SKILL.md) — Secure architecture design
- [production-readiness](../production-readiness/SKILL.md) — Pre-launch checks
