# Axum Complete Guide

Comprehensive guide to building production APIs with Axum.

## Why Axum

- **Type-safe extractors** - Compile-time request validation
- **Tower ecosystem** - Middleware, layers, services
- **Async-first** - Built on Tokio
- **Modular** - Compose routers and handlers
- **No macros** - Pure Rust, easy to understand

---

## Application Structure

### Basic Setup

```rust
use axum::{routing::{get, post}, Router};
use std::net::SocketAddr;

#[tokio::main]
async fn main() {
    // Initialize tracing
    tracing_subscriber::init();
    
    // Build application
    let app = Router::new()
        .route("/", get(root))
        .route("/health", get(health_check))
        .route("/api/users", get(list_users).post(create_user))
        .route("/api/users/:id", get(get_user).put(update_user).delete(delete_user));
    
    // Run server
    let addr = SocketAddr::from(([0, 0, 0, 0], 3000));
    tracing::info!("Listening on {}", addr);
    
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn root() -> &'static str {
    "Hello, Axum!"
}

async fn health_check() -> &'static str {
    "OK"
}
```

---

## Routing

### Basic Routes

```rust
use axum::routing::{get, post, put, delete, patch};

let app = Router::new()
    // Single handler
    .route("/", get(handler))
    
    // Multiple methods
    .route("/users", get(list).post(create))
    
    // Path parameters
    .route("/users/:id", get(get_one).put(update).delete(remove))
    
    // Nested path
    .route("/users/:user_id/posts/:post_id", get(get_user_post));
```

### Nested Routers

```rust
// Modular router composition
fn user_routes() -> Router<AppState> {
    Router::new()
        .route("/", get(list_users).post(create_user))
        .route("/:id", get(get_user).put(update_user).delete(delete_user))
}

fn post_routes() -> Router<AppState> {
    Router::new()
        .route("/", get(list_posts).post(create_post))
        .route("/:id", get(get_post))
}

let app = Router::new()
    .nest("/api/users", user_routes())
    .nest("/api/posts", post_routes())
    .with_state(state);
```

### Fallback Handler

```rust
async fn not_found() -> (StatusCode, &'static str) {
    (StatusCode::NOT_FOUND, "Not Found")
}

let app = Router::new()
    .route("/", get(root))
    .fallback(not_found);
```

---

## Handlers

### Handler Function Signature

```rust
// Handlers are async functions that return something implementing IntoResponse
async fn handler() -> impl IntoResponse {
    "Hello"
}

// With extractors
async fn handler_with_extractors(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Query(params): Query<ListParams>,
    Json(body): Json<CreateInput>,
) -> Result<Json<Output>, AppError> {
    // ...
}
```

### Response Types

```rust
use axum::{response::IntoResponse, http::StatusCode, Json};

// String
async fn plain_text() -> &'static str {
    "Hello"
}

// JSON
async fn json_response() -> Json<User> {
    Json(User { name: "Alice".into() })
}

// Status code + body
async fn with_status() -> (StatusCode, Json<User>) {
    (StatusCode::CREATED, Json(user))
}

// Headers + body
async fn with_headers() -> impl IntoResponse {
    (
        [(header::CONTENT_TYPE, "application/json")],
        Json(data)
    )
}

// Empty response
async fn no_content() -> StatusCode {
    StatusCode::NO_CONTENT
}
```

---

## State Management

### Application State

```rust
use std::sync::Arc;
use sqlx::PgPool;

// State must be Clone
#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub config: Arc<Config>,
    pub cache: Arc<Cache>,
}

// Create and attach state
let state = AppState {
    db: pool,
    config: Arc::new(config),
    cache: Arc::new(Cache::new()),
};

let app = Router::new()
    .route("/users", get(list_users))
    .with_state(state);

// Extract in handler
async fn list_users(State(state): State<AppState>) -> Result<Json<Vec<User>>, AppError> {
    let users = sqlx::query_as!(User, "SELECT * FROM users")
        .fetch_all(&state.db)
        .await?;
    Ok(Json(users))
}
```

### FromRef for Substates

```rust
use axum::extract::FromRef;

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub config: Arc<Config>,
}

// Allow extracting just the pool
impl FromRef<AppState> for PgPool {
    fn from_ref(state: &AppState) -> Self {
        state.db.clone()
    }
}

// Now you can extract either
async fn handler(
    State(pool): State<PgPool>,  // Just the pool
) -> Result<Json<User>, AppError> {
    // ...
}
```

---

## Extractors Deep Dive

### Path Parameters

```rust
use axum::extract::Path;
use uuid::Uuid;

// Single parameter
async fn get_user(Path(id): Path<Uuid>) -> Result<Json<User>, AppError> {
    // ...
}

// Multiple parameters
async fn get_user_post(
    Path((user_id, post_id)): Path<(Uuid, Uuid)>
) -> Result<Json<Post>, AppError> {
    // ...
}

// Struct extraction
#[derive(Deserialize)]
struct PostPath {
    user_id: Uuid,
    post_id: Uuid,
}

async fn get_post(Path(path): Path<PostPath>) -> Result<Json<Post>, AppError> {
    // path.user_id, path.post_id
}
```

### Query Parameters

```rust
use axum::extract::Query;

#[derive(Deserialize)]
struct ListParams {
    #[serde(default = "default_page")]
    page: u32,
    #[serde(default = "default_limit")]
    limit: u32,
    search: Option<String>,
    sort_by: Option<String>,
}

fn default_page() -> u32 { 1 }
fn default_limit() -> u32 { 20 }

async fn list_users(
    Query(params): Query<ListParams>
) -> Result<Json<PaginatedResponse<User>>, AppError> {
    let offset = (params.page - 1) * params.limit;
    // ...
}
```

### JSON Body

```rust
use axum::Json;

#[derive(Deserialize)]
struct CreateUserInput {
    name: String,
    email: String,
    #[serde(default)]
    role: Role,
}

async fn create_user(
    State(pool): State<PgPool>,
    Json(input): Json<CreateUserInput>,
) -> Result<(StatusCode, Json<User>), AppError> {
    // Validate
    if input.name.is_empty() {
        return Err(AppError::Validation("Name required".into()));
    }
    
    // Create user
    let user = sqlx::query_as!(User, 
        "INSERT INTO users (name, email, role) VALUES ($1, $2, $3) RETURNING *",
        input.name, input.email, input.role as _
    )
    .fetch_one(&pool)
    .await?;
    
    Ok((StatusCode::CREATED, Json(user)))
}
```

### Headers

```rust
use axum::http::header::HeaderMap;
use axum::extract::TypedHeader;
use headers::Authorization;
use headers::authorization::Bearer;

// Raw headers
async fn with_headers(headers: HeaderMap) -> impl IntoResponse {
    if let Some(auth) = headers.get("Authorization") {
        // ...
    }
}

// Typed header
async fn with_auth(
    TypedHeader(auth): TypedHeader<Authorization<Bearer>>
) -> Result<Json<User>, AppError> {
    let token = auth.token();
    // Validate token
}
```

### Custom Extractors

```rust
use axum::{
    async_trait,
    extract::FromRequestParts,
    http::request::Parts,
};

pub struct CurrentUser {
    pub id: Uuid,
    pub email: String,
    pub role: Role,
}

#[async_trait]
impl<S> FromRequestParts<S> for CurrentUser
where
    S: Send + Sync,
{
    type Rejection = AppError;
    
    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        // Get auth header
        let auth = parts.headers
            .get("Authorization")
            .ok_or(AppError::Unauthorized)?
            .to_str()
            .map_err(|_| AppError::Unauthorized)?;
        
        // Validate token and extract user
        let claims = validate_jwt(auth)?;
        
        Ok(CurrentUser {
            id: claims.sub,
            email: claims.email,
            role: claims.role,
        })
    }
}

// Usage - automatically extracts and validates
async fn protected_handler(user: CurrentUser) -> impl IntoResponse {
    format!("Hello, {}!", user.email)
}
```

---

## Error Handling

### AppError Pattern

```rust
use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Not found: {0}")]
    NotFound(String),
    
    #[error("Validation error: {0}")]
    Validation(String),
    
    #[error("Unauthorized")]
    Unauthorized,
    
    #[error("Forbidden")]
    Forbidden,
    
    #[error("Conflict: {0}")]
    Conflict(String),
    
    #[error("Database error")]
    Database(#[from] sqlx::Error),
    
    #[error("Internal error")]
    Internal(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, error_message) = match &self {
            Self::NotFound(msg) => (StatusCode::NOT_FOUND, msg.clone()),
            Self::Validation(msg) => (StatusCode::BAD_REQUEST, msg.clone()),
            Self::Unauthorized => (StatusCode::UNAUTHORIZED, "Unauthorized".into()),
            Self::Forbidden => (StatusCode::FORBIDDEN, "Forbidden".into()),
            Self::Conflict(msg) => (StatusCode::CONFLICT, msg.clone()),
            Self::Database(e) => {
                tracing::error!("Database error: {:?}", e);
                (StatusCode::INTERNAL_SERVER_ERROR, "Database error".into())
            }
            Self::Internal(msg) => {
                tracing::error!("Internal error: {}", msg);
                (StatusCode::INTERNAL_SERVER_ERROR, "Internal error".into())
            }
        };
        
        let body = Json(json!({
            "error": error_message,
            "status": status.as_u16(),
        }));
        
        (status, body).into_response()
    }
}
```

### Result Type Alias

```rust
pub type AppResult<T> = Result<T, AppError>;

async fn get_user(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> AppResult<Json<User>> {
    let user = sqlx::query_as!(User, "SELECT * FROM users WHERE id = $1", id)
        .fetch_optional(&pool)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("User {} not found", id)))?;
    
    Ok(Json(user))
}
```

---

## Response Patterns

### Paginated Response

```rust
#[derive(Serialize)]
pub struct PaginatedResponse<T> {
    pub data: Vec<T>,
    pub total: i64,
    pub page: u32,
    pub limit: u32,
    pub total_pages: u32,
}

impl<T> PaginatedResponse<T> {
    pub fn new(data: Vec<T>, total: i64, page: u32, limit: u32) -> Self {
        let total_pages = ((total as f64) / (limit as f64)).ceil() as u32;
        Self { data, total, page, limit, total_pages }
    }
}

async fn list_users(
    State(pool): State<PgPool>,
    Query(params): Query<ListParams>,
) -> AppResult<Json<PaginatedResponse<User>>> {
    let offset = (params.page - 1) * params.limit;
    
    let users = sqlx::query_as!(User,
        "SELECT * FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2",
        params.limit as i64, offset as i64
    )
    .fetch_all(&pool)
    .await?;
    
    let total = sqlx::query_scalar!("SELECT COUNT(*) FROM users")
        .fetch_one(&pool)
        .await?
        .unwrap_or(0);
    
    Ok(Json(PaginatedResponse::new(users, total, params.page, params.limit)))
}
```

### Action Response

```rust
#[derive(Serialize)]
pub struct ActionResponse {
    pub success: bool,
    pub message: String,
}

async fn delete_user(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> AppResult<Json<ActionResponse>> {
    let result = sqlx::query!("DELETE FROM users WHERE id = $1", id)
        .execute(&pool)
        .await?;
    
    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("User not found".into()));
    }
    
    Ok(Json(ActionResponse {
        success: true,
        message: "User deleted".into(),
    }))
}
```

---

## Full Handler Example

```rust
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Deserialize)]
pub struct CreateUserInput {
    pub name: String,
    pub email: String,
}

#[derive(Serialize, sqlx::FromRow)]
pub struct User {
    pub id: Uuid,
    pub name: String,
    pub email: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

pub async fn create_user(
    State(pool): State<PgPool>,
    Json(input): Json<CreateUserInput>,
) -> AppResult<(StatusCode, Json<User>)> {
    // Validation
    if input.name.trim().is_empty() {
        return Err(AppError::Validation("Name is required".into()));
    }
    
    if !input.email.contains('@') {
        return Err(AppError::Validation("Invalid email".into()));
    }
    
    // Check uniqueness
    let exists = sqlx::query_scalar!(
        "SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)",
        input.email
    )
    .fetch_one(&pool)
    .await?
    .unwrap_or(false);
    
    if exists {
        return Err(AppError::Conflict("Email already exists".into()));
    }
    
    // Create
    let user = sqlx::query_as!(User,
        r#"
        INSERT INTO users (name, email)
        VALUES ($1, $2)
        RETURNING id, name, email, created_at
        "#,
        input.name.trim(),
        input.email.to_lowercase()
    )
    .fetch_one(&pool)
    .await?;
    
    Ok((StatusCode::CREATED, Json(user)))
}
```
