# Middleware Patterns

Tower middleware and layers for Axum applications.

## Tower Architecture

Axum is built on Tower, a library for building modular network services. Understanding the Service/Layer pattern is key.

```
Request → Layer → Layer → Layer → Handler
                                      ↓
Response ← Layer ← Layer ← Layer ← Response
```

---

## Built-in Middleware (tower-http)

### CORS

```rust
use tower_http::cors::{CorsLayer, Any};
use http::Method;

let cors = CorsLayer::new()
    .allow_origin(Any)  // Or specific origins
    .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE])
    .allow_headers(Any);

let app = Router::new()
    .route("/api/users", get(list_users))
    .layer(cors);
```

### Tracing/Logging

```rust
use tower_http::trace::TraceLayer;
use tracing::Level;

let app = Router::new()
    .route("/", get(root))
    .layer(
        TraceLayer::new_for_http()
            .make_span_with(|request: &Request<Body>| {
                tracing::span!(
                    Level::INFO,
                    "http_request",
                    method = %request.method(),
                    uri = %request.uri(),
                )
            })
    );
```

### Compression

```rust
use tower_http::compression::CompressionLayer;

let app = Router::new()
    .route("/", get(root))
    .layer(CompressionLayer::new());
```

### Request Timeout

```rust
use tower_http::timeout::TimeoutLayer;
use std::time::Duration;

let app = Router::new()
    .route("/", get(root))
    .layer(TimeoutLayer::new(Duration::from_secs(30)));
```

### Request Body Limit

```rust
use tower_http::limit::RequestBodyLimitLayer;

let app = Router::new()
    .route("/upload", post(upload))
    .layer(RequestBodyLimitLayer::new(1024 * 1024 * 10)); // 10MB
```

### Security Headers

```rust
use tower_http::set_header::SetResponseHeaderLayer;
use http::header;

let app = Router::new()
    .route("/", get(root))
    .layer(SetResponseHeaderLayer::if_not_present(
        header::X_CONTENT_TYPE_OPTIONS,
        HeaderValue::from_static("nosniff"),
    ))
    .layer(SetResponseHeaderLayer::if_not_present(
        header::X_FRAME_OPTIONS,
        HeaderValue::from_static("DENY"),
    ));
```

---

## Custom Middleware

### Using axum::middleware::from_fn

The simplest way to create custom middleware:

```rust
use axum::{
    middleware::{self, Next},
    http::Request,
    response::Response,
    body::Body,
};

async fn logging_middleware(
    request: Request<Body>,
    next: Next,
) -> Response {
    let method = request.method().clone();
    let uri = request.uri().clone();
    
    let start = std::time::Instant::now();
    let response = next.run(request).await;
    let duration = start.elapsed();
    
    tracing::info!(
        method = %method,
        uri = %uri,
        status = %response.status(),
        duration_ms = duration.as_millis(),
        "request completed"
    );
    
    response
}

let app = Router::new()
    .route("/", get(root))
    .layer(middleware::from_fn(logging_middleware));
```

### With State Access

```rust
async fn auth_middleware(
    State(state): State<AppState>,
    mut request: Request<Body>,
    next: Next,
) -> Result<Response, AppError> {
    // Get token from header
    let token = request
        .headers()
        .get("Authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.strip_prefix("Bearer "));
    
    if let Some(token) = token {
        // Validate and get user
        let user = validate_token(&state, token).await?;
        
        // Add user to request extensions
        request.extensions_mut().insert(user);
    }
    
    Ok(next.run(request).await)
}

let app = Router::new()
    .route("/", get(protected))
    .layer(middleware::from_fn_with_state(state.clone(), auth_middleware))
    .with_state(state);
```

### Early Response (Rejection)

```rust
async fn require_auth(
    request: Request<Body>,
    next: Next,
) -> Result<Response, AppError> {
    let has_auth = request.headers().contains_key("Authorization");
    
    if !has_auth {
        // Return early without calling next
        return Err(AppError::Unauthorized);
    }
    
    Ok(next.run(request).await)
}
```

---

## Authentication Middleware

### JWT Validation

```rust
use jsonwebtoken::{decode, DecodingKey, Validation, Algorithm};

#[derive(Debug, Deserialize)]
struct Claims {
    sub: Uuid,
    email: String,
    role: String,
    exp: usize,
}

#[derive(Clone)]
pub struct CurrentUser {
    pub id: Uuid,
    pub email: String,
    pub role: Role,
}

async fn jwt_auth_middleware(
    State(state): State<AppState>,
    mut request: Request<Body>,
    next: Next,
) -> Result<Response, AppError> {
    // Get token
    let token = request
        .headers()
        .get("Authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.strip_prefix("Bearer "))
        .ok_or(AppError::Unauthorized)?;
    
    // Decode and validate
    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(state.config.jwt_secret.as_bytes()),
        &Validation::new(Algorithm::HS256),
    ).map_err(|_| AppError::Unauthorized)?;
    
    let claims = token_data.claims;
    
    // Create user struct
    let user = CurrentUser {
        id: claims.sub,
        email: claims.email,
        role: claims.role.parse().unwrap_or(Role::User),
    };
    
    // Add to extensions
    request.extensions_mut().insert(user);
    
    Ok(next.run(request).await)
}
```

### Role-Based Access Control

```rust
pub fn require_role(required_role: Role) -> impl Fn(Request<Body>, Next) -> impl Future<Output = Result<Response, AppError>> + Clone {
    move |request: Request<Body>, next: Next| {
        let required_role = required_role.clone();
        async move {
            let user = request
                .extensions()
                .get::<CurrentUser>()
                .ok_or(AppError::Unauthorized)?;
            
            if user.role < required_role {
                return Err(AppError::Forbidden);
            }
            
            Ok(next.run(request).await)
        }
    }
}

// Usage
let admin_routes = Router::new()
    .route("/admin/users", get(list_all_users))
    .layer(middleware::from_fn(require_role(Role::Admin)));
```

---

## Rate Limiting

```rust
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use std::time::{Duration, Instant};

#[derive(Clone)]
struct RateLimiter {
    requests: Arc<Mutex<HashMap<String, Vec<Instant>>>>,
    max_requests: usize,
    window: Duration,
}

impl RateLimiter {
    fn new(max_requests: usize, window: Duration) -> Self {
        Self {
            requests: Arc::new(Mutex::new(HashMap::new())),
            max_requests,
            window,
        }
    }
    
    async fn check(&self, key: &str) -> bool {
        let mut requests = self.requests.lock().await;
        let now = Instant::now();
        
        let entry = requests.entry(key.to_string()).or_default();
        
        // Remove old requests
        entry.retain(|&time| now.duration_since(time) < self.window);
        
        // Check limit
        if entry.len() >= self.max_requests {
            return false;
        }
        
        entry.push(now);
        true
    }
}

async fn rate_limit_middleware(
    State(limiter): State<RateLimiter>,
    request: Request<Body>,
    next: Next,
) -> Result<Response, AppError> {
    // Use IP or user ID as key
    let key = request
        .headers()
        .get("X-Forwarded-For")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("unknown")
        .to_string();
    
    if !limiter.check(&key).await {
        return Err(AppError::TooManyRequests);
    }
    
    Ok(next.run(request).await)
}

// Usage
let limiter = RateLimiter::new(100, Duration::from_secs(60)); // 100 req/min

let app = Router::new()
    .route("/api/users", get(list_users))
    .layer(middleware::from_fn_with_state(limiter.clone(), rate_limit_middleware))
    .with_state(limiter);
```

---

## Request ID Middleware

```rust
use uuid::Uuid;

async fn request_id_middleware(
    mut request: Request<Body>,
    next: Next,
) -> Response {
    let request_id = request
        .headers()
        .get("X-Request-ID")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
        .unwrap_or_else(|| Uuid::new_v4().to_string());
    
    // Add to extensions
    request.extensions_mut().insert(RequestId(request_id.clone()));
    
    let mut response = next.run(request).await;
    
    // Add to response headers
    response.headers_mut().insert(
        "X-Request-ID",
        HeaderValue::from_str(&request_id).unwrap(),
    );
    
    response
}

#[derive(Clone)]
pub struct RequestId(pub String);
```

---

## Layer Ordering

Middleware is applied in reverse order. The last layer is the outermost:

```rust
let app = Router::new()
    .route("/", get(root))
    .layer(layer_a)  // Applied 3rd (innermost)
    .layer(layer_b)  // Applied 2nd
    .layer(layer_c); // Applied 1st (outermost)

// Request flow: layer_c → layer_b → layer_a → handler
// Response flow: handler → layer_a → layer_b → layer_c
```

### Recommended Order

```rust
let app = Router::new()
    .route("/", get(root))
    // Innermost - closest to handler
    .layer(middleware::from_fn(require_auth))     // Auth check
    // Middle
    .layer(middleware::from_fn_with_state(state, rate_limit))  // Rate limiting
    .layer(RequestBodyLimitLayer::new(10 * 1024 * 1024))       // Body limit
    .layer(TimeoutLayer::new(Duration::from_secs(30)))         // Timeout
    // Outermost
    .layer(TraceLayer::new_for_http())                         // Logging (first/last)
    .layer(CompressionLayer::new())                            // Compression
    .layer(cors);                                               // CORS
```

---

## ServiceBuilder for Multiple Layers

```rust
use tower::ServiceBuilder;

let middleware_stack = ServiceBuilder::new()
    .layer(TraceLayer::new_for_http())
    .layer(CompressionLayer::new())
    .layer(CorsLayer::permissive())
    .layer(TimeoutLayer::new(Duration::from_secs(30)))
    .layer(RequestBodyLimitLayer::new(10 * 1024 * 1024));

let app = Router::new()
    .route("/", get(root))
    .layer(middleware_stack);
```

---

## Route-Specific Middleware

```rust
// Protected routes
let protected_routes = Router::new()
    .route("/profile", get(get_profile))
    .route("/settings", get(get_settings).put(update_settings))
    .layer(middleware::from_fn(require_auth));

// Admin routes  
let admin_routes = Router::new()
    .route("/users", get(list_all_users).delete(delete_user))
    .layer(middleware::from_fn(require_admin))
    .layer(middleware::from_fn(require_auth));

// Public routes (no middleware)
let public_routes = Router::new()
    .route("/", get(root))
    .route("/health", get(health_check))
    .route("/login", post(login));

// Combine
let app = Router::new()
    .merge(public_routes)
    .merge(protected_routes)
    .nest("/admin", admin_routes)
    .layer(TraceLayer::new_for_http());
```
