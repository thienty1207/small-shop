# Security Headers

> HTTP security headers for web applications and APIs.

## Essential Security Headers

### Content-Security-Policy (CSP)

Prevents XSS, clickjacking, and other code injection attacks.

```rust
// Rust/Axum - tower-http
use tower_http::set_header::SetResponseHeaderLayer;
use http::{header, HeaderValue};

// Strict CSP for API
let csp = "default-src 'none'; frame-ancestors 'none'";

// CSP for web app with Next.js
let csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Required for Next.js
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self' https://api.example.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
].join("; ");

app.layer(SetResponseHeaderLayer::overriding(
    header::CONTENT_SECURITY_POLICY,
    HeaderValue::from_str(&csp).unwrap(),
));
```

```typescript
// Next.js - next.config.js
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' blob: data: https:",
      "font-src 'self'",
      "connect-src 'self' https://api.example.com wss://api.example.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
];

module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};
```

### Report-Only CSP (Testing)

```rust
// Use Report-Only to test CSP without blocking
let csp_report_only = format!(
    "{}; report-uri /api/csp-report",
    csp
);

app.layer(SetResponseHeaderLayer::overriding(
    HeaderName::from_static("content-security-policy-report-only"),
    HeaderValue::from_str(&csp_report_only).unwrap(),
));

// CSP violation report endpoint
async fn csp_report(Json(report): Json<CspReport>) -> StatusCode {
    tracing::warn!(
        directive = %report.csp_report.violated_directive,
        blocked_uri = %report.csp_report.blocked_uri,
        document_uri = %report.csp_report.document_uri,
        "CSP violation"
    );
    StatusCode::NO_CONTENT
}
```

### Strict-Transport-Security (HSTS)

Forces HTTPS connections.

```rust
// Rust
use tower_http::set_header::SetResponseHeaderLayer;

// max-age=2 years, include subdomains, allow preload list
let hsts = "max-age=63072000; includeSubDomains; preload";

app.layer(SetResponseHeaderLayer::overriding(
    header::STRICT_TRANSPORT_SECURITY,
    HeaderValue::from_static(hsts),
));
```

```go
// Go/Fiber
app.Use(func(c *fiber.Ctx) error {
    c.Set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload")
    return c.Next()
})
```

### X-Content-Type-Options

Prevents MIME type sniffing.

```rust
app.layer(SetResponseHeaderLayer::overriding(
    header::X_CONTENT_TYPE_OPTIONS,
    HeaderValue::from_static("nosniff"),
));
```

### X-Frame-Options

Prevents clickjacking (legacy, use CSP frame-ancestors instead).

```rust
app.layer(SetResponseHeaderLayer::overriding(
    header::X_FRAME_OPTIONS,
    HeaderValue::from_static("DENY"),
));
```

### Referrer-Policy

Controls what information is sent in the Referer header.

```rust
app.layer(SetResponseHeaderLayer::overriding(
    HeaderName::from_static("referrer-policy"),
    HeaderValue::from_static("strict-origin-when-cross-origin"),
));
```

### Permissions-Policy

Controls browser features.

```rust
let permissions = [
    "geolocation=()",       // Disable geolocation
    "camera=()",            // Disable camera
    "microphone=()",        // Disable microphone
    "payment=(self)",       // Only allow payment on same origin
    "usb=()",               // Disable USB
    "accelerometer=()",     // Disable accelerometer
    "gyroscope=()",         // Disable gyroscope
].join(", ");

app.layer(SetResponseHeaderLayer::overriding(
    HeaderName::from_static("permissions-policy"),
    HeaderValue::from_str(&permissions).unwrap(),
));
```

## Complete Security Headers Middleware

### Rust/Axum

```rust
use axum::{
    http::{header, HeaderName, HeaderValue, Request, Response},
    middleware::{self, Next},
};

pub async fn security_headers<B>(request: Request<B>, next: Next<B>) -> Response<B> {
    let mut response = next.run(request).await;
    let headers = response.headers_mut();

    // HSTS - Force HTTPS
    headers.insert(
        header::STRICT_TRANSPORT_SECURITY,
        HeaderValue::from_static("max-age=63072000; includeSubDomains; preload"),
    );

    // Prevent MIME sniffing
    headers.insert(
        header::X_CONTENT_TYPE_OPTIONS,
        HeaderValue::from_static("nosniff"),
    );

    // Clickjacking protection
    headers.insert(header::X_FRAME_OPTIONS, HeaderValue::from_static("DENY"));

    // XSS protection (legacy)
    headers.insert(
        header::X_XSS_PROTECTION,
        HeaderValue::from_static("1; mode=block"),
    );

    // Referrer policy
    headers.insert(
        HeaderName::from_static("referrer-policy"),
        HeaderValue::from_static("strict-origin-when-cross-origin"),
    );

    // CSP
    headers.insert(
        header::CONTENT_SECURITY_POLICY,
        HeaderValue::from_static("default-src 'self'; frame-ancestors 'none'"),
    );

    // Permissions policy
    headers.insert(
        HeaderName::from_static("permissions-policy"),
        HeaderValue::from_static("geolocation=(), camera=(), microphone=()"),
    );

    response
}

// Apply middleware
let app = Router::new()
    .route("/", get(handler))
    .layer(middleware::from_fn(security_headers));
```

### Go/Fiber

```go
package middleware

import "github.com/gofiber/fiber/v2"

func SecurityHeaders() fiber.Handler {
    return func(c *fiber.Ctx) error {
        // HSTS
        c.Set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload")
        
        // Prevent MIME sniffing
        c.Set("X-Content-Type-Options", "nosniff")
        
        // Clickjacking protection
        c.Set("X-Frame-Options", "DENY")
        
        // XSS protection (legacy)
        c.Set("X-XSS-Protection", "1; mode=block")
        
        // Referrer policy
        c.Set("Referrer-Policy", "strict-origin-when-cross-origin")
        
        // CSP
        c.Set("Content-Security-Policy", "default-src 'self'; frame-ancestors 'none'")
        
        // Permissions policy
        c.Set("Permissions-Policy", "geolocation=(), camera=(), microphone=()")
        
        return c.Next()
    }
}
```

### Python/FastAPI

```python
from fastapi import FastAPI, Request
from starlette.middleware.base import BaseHTTPMiddleware

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Content-Security-Policy"] = "default-src 'self'; frame-ancestors 'none'"
        response.headers["Permissions-Policy"] = "geolocation=(), camera=(), microphone=()"
        
        return response

app = FastAPI()
app.add_middleware(SecurityHeadersMiddleware)
```

### Node.js/Express - Helmet

```typescript
import helmet from 'helmet';

// Use all defaults (good starting point)
app.use(helmet());

// Or configure individually
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://api.example.com"],
        frameAncestors: ["'none'"],
      },
    },
    hsts: {
      maxAge: 63072000,
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: {
      policy: "strict-origin-when-cross-origin",
    },
  })
);
```

## CORS Configuration

### Rust/Axum - tower-http

```rust
use tower_http::cors::{CorsLayer, AllowOrigin, AllowMethods, AllowHeaders};
use http::{header, Method};

// Strict CORS for production
let cors = CorsLayer::new()
    .allow_origin(AllowOrigin::list([
        "https://app.example.com".parse().unwrap(),
        "https://admin.example.com".parse().unwrap(),
    ]))
    .allow_methods([
        Method::GET,
        Method::POST,
        Method::PUT,
        Method::PATCH,
        Method::DELETE,
    ])
    .allow_headers([
        header::CONTENT_TYPE,
        header::AUTHORIZATION,
        header::ACCEPT,
        HeaderName::from_static("x-api-key"),
    ])
    .allow_credentials(true)
    .max_age(Duration::from_secs(3600));

// Development CORS (permissive)
let cors_dev = CorsLayer::very_permissive();

let cors = if cfg!(debug_assertions) { cors_dev } else { cors };

app.layer(cors);
```

### Go/Fiber

```go
import "github.com/gofiber/fiber/v2/middleware/cors"

app.Use(cors.New(cors.Config{
    AllowOrigins:     "https://app.example.com, https://admin.example.com",
    AllowMethods:     "GET,POST,PUT,PATCH,DELETE",
    AllowHeaders:     "Content-Type, Authorization, X-API-Key",
    AllowCredentials: true,
    MaxAge:           3600,
}))
```

### Python/FastAPI

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://app.example.com",
        "https://admin.example.com",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Content-Type", "Authorization", "X-API-Key"],
    max_age=3600,
)
```

## Cookie Security

```rust
use axum_extra::extract::cookie::{Cookie, SameSite};
use time::Duration;

// Secure session cookie
let cookie = Cookie::build(("session_id", session_id))
    .path("/")
    .secure(true)               // HTTPS only
    .http_only(true)            // No JavaScript access
    .same_site(SameSite::Strict) // CSRF protection
    .max_age(Duration::hours(24))
    .domain("example.com")
    .build();

// Auth token cookie (for API)
let auth_cookie = Cookie::build(("auth_token", token))
    .path("/api")
    .secure(true)
    .http_only(true)
    .same_site(SameSite::Lax)   // Allow top-level GET
    .max_age(Duration::days(7))
    .build();
```

### Cookie Attributes Reference

| Attribute | Value | Purpose |
|-----------|-------|---------|
| `Secure` | true | Only send over HTTPS |
| `HttpOnly` | true | Prevent JavaScript access |
| `SameSite` | Strict | Block all cross-site requests |
| `SameSite` | Lax | Allow top-level GET cross-site |
| `SameSite` | None | Allow cross-site (requires Secure) |
| `Path` | /api | Limit scope to path |
| `Domain` | .example.com | Share across subdomains |
| `Max-Age` | 86400 | Expiration in seconds |

## Security Headers Checklist

### Required for All Applications

| Header | Recommended Value |
|--------|-------------------|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |

### Required for Web Applications

| Header | Recommended Value |
|--------|-------------------|
| `Content-Security-Policy` | Customized per app |
| `Permissions-Policy` | Disable unused features |

### API-Specific

| Header | Recommended Value |
|--------|-------------------|
| `Cache-Control` | `no-store` (for sensitive data) |
| `X-Content-Type-Options` | `nosniff` |

## Testing Security Headers

### Curl Commands

```bash
# Check all headers
curl -I https://api.example.com

# Check specific header
curl -s -D - https://api.example.com -o /dev/null | grep -i "strict-transport"
```

### Online Tools

- [Security Headers](https://securityheaders.com/) - Scan and grade
- [Mozilla Observatory](https://observatory.mozilla.org/) - Comprehensive scan
- [CSP Evaluator](https://csp-evaluator.withgoogle.com/) - CSP analysis

### Automated Testing

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use axum_test::TestServer;

    #[tokio::test]
    async fn test_security_headers() {
        let app = create_app();
        let server = TestServer::new(app).unwrap();
        
        let response = server.get("/api/health").await;
        
        assert_eq!(
            response.header("strict-transport-security"),
            Some("max-age=63072000; includeSubDomains; preload")
        );
        assert_eq!(
            response.header("x-content-type-options"),
            Some("nosniff")
        );
        assert_eq!(
            response.header("x-frame-options"),
            Some("DENY")
        );
    }
}
```
