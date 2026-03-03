# Project Structure

Scalable folder organization for Rust + Axum backends.

## Recommended Structure

```
my-app/
├── Cargo.toml
├── .env.example
├── .sqlx/                    # SQLx query cache
├── migrations/               # Database migrations
│   └── 20240101000000_initial.sql
│
├── src/
│   ├── main.rs              # Entry point
│   ├── lib.rs               # Library root (optional)
│   ├── config.rs            # Configuration
│   │
│   ├── routes/              # Route definitions
│   │   ├── mod.rs
│   │   ├── users.rs
│   │   ├── posts.rs
│   │   └── health.rs
│   │
│   ├── handlers/            # Request handlers
│   │   ├── mod.rs
│   │   ├── users.rs
│   │   └── posts.rs
│   │
│   ├── models/              # Domain models
│   │   ├── mod.rs
│   │   ├── user.rs
│   │   └── post.rs
│   │
│   ├── repositories/        # Database access
│   │   ├── mod.rs
│   │   ├── user_repo.rs
│   │   └── post_repo.rs
│   │
│   ├── services/            # Business logic
│   │   ├── mod.rs
│   │   ├── user_service.rs
│   │   └── auth_service.rs
│   │
│   ├── middleware/          # Custom middleware
│   │   ├── mod.rs
│   │   ├── auth.rs
│   │   └── logging.rs
│   │
│   ├── extractors/          # Custom extractors
│   │   ├── mod.rs
│   │   └── current_user.rs
│   │
│   ├── error.rs             # Error types
│   └── state.rs             # Application state
│
└── tests/                   # Integration tests
    ├── common/
    │   └── mod.rs
    ├── users_test.rs
    └── posts_test.rs
```

---

## Layer Responsibilities

### Routes (`routes/`)

Define route structure, group endpoints:

```rust
// src/routes/mod.rs
use axum::Router;
use crate::state::AppState;

mod health;
mod users;
mod posts;

pub fn create_router() -> Router<AppState> {
    Router::new()
        .merge(health::routes())
        .nest("/api/users", users::routes())
        .nest("/api/posts", posts::routes())
}

// src/routes/users.rs
use axum::{routing::{get, post, put, delete}, Router};
use crate::{handlers::users, state::AppState};

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/", get(users::list).post(users::create))
        .route("/:id", get(users::get).put(users::update).delete(users::delete))
}
```

### Handlers (`handlers/`)

HTTP layer - extract, validate, delegate to services:

```rust
// src/handlers/users.rs
use axum::{extract::{Path, State, Query}, Json, http::StatusCode};
use crate::{
    models::user::{User, CreateUserInput, UpdateUserInput, ListParams},
    services::user_service::UserService,
    error::AppError,
    state::AppState,
};

pub async fn list(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Result<Json<Vec<User>>, AppError> {
    let service = UserService::new(state.db.clone());
    let users = service.list(params).await?;
    Ok(Json(users))
}

pub async fn create(
    State(state): State<AppState>,
    Json(input): Json<CreateUserInput>,
) -> Result<(StatusCode, Json<User>), AppError> {
    let service = UserService::new(state.db.clone());
    let user = service.create(input).await?;
    Ok((StatusCode::CREATED, Json(user)))
}

pub async fn get(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<User>, AppError> {
    let service = UserService::new(state.db.clone());
    let user = service.get(id).await?;
    Ok(Json(user))
}
```

### Services (`services/`)

Business logic - orchestrate operations:

```rust
// src/services/user_service.rs
use crate::{
    models::user::{User, CreateUserInput, UpdateUserInput, ListParams},
    repositories::user_repo::UserRepository,
    error::AppError,
};

pub struct UserService {
    repo: UserRepository,
}

impl UserService {
    pub fn new(pool: PgPool) -> Self {
        Self { repo: UserRepository::new(pool) }
    }
    
    pub async fn create(&self, input: CreateUserInput) -> Result<User, AppError> {
        // Validate business rules
        if input.email.is_empty() {
            return Err(AppError::Validation("Email required".into()));
        }
        
        // Check uniqueness
        if self.repo.exists_by_email(&input.email).await? {
            return Err(AppError::Conflict("Email already exists".into()));
        }
        
        // Hash password if provided
        let password_hash = if let Some(password) = &input.password {
            Some(hash_password(password).await?)
        } else {
            None
        };
        
        // Create user
        self.repo.create(input, password_hash).await
    }
    
    pub async fn get(&self, id: Uuid) -> Result<User, AppError> {
        self.repo.find_by_id(id).await?
            .ok_or_else(|| AppError::NotFound("User not found".into()))
    }
    
    pub async fn list(&self, params: ListParams) -> Result<Vec<User>, AppError> {
        self.repo.find_all(params).await
    }
}
```

### Repositories (`repositories/`)

Database access - pure data operations:

```rust
// src/repositories/user_repo.rs
use sqlx::PgPool;
use uuid::Uuid;
use crate::models::user::{User, CreateUserInput, ListParams};
use crate::error::AppError;

pub struct UserRepository {
    pool: PgPool,
}

impl UserRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
    
    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<User>, AppError> {
        let user = sqlx::query_as!(User,
            "SELECT id, name, email, role, created_at FROM users WHERE id = $1",
            id
        )
        .fetch_optional(&self.pool)
        .await?;
        
        Ok(user)
    }
    
    pub async fn find_all(&self, params: ListParams) -> Result<Vec<User>, AppError> {
        let offset = (params.page - 1) * params.limit;
        
        let users = sqlx::query_as!(User,
            r#"
            SELECT id, name, email, role, created_at
            FROM users
            ORDER BY created_at DESC
            LIMIT $1 OFFSET $2
            "#,
            params.limit as i64,
            offset as i64
        )
        .fetch_all(&self.pool)
        .await?;
        
        Ok(users)
    }
    
    pub async fn exists_by_email(&self, email: &str) -> Result<bool, AppError> {
        let exists = sqlx::query_scalar!(
            "SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)",
            email
        )
        .fetch_one(&self.pool)
        .await?
        .unwrap_or(false);
        
        Ok(exists)
    }
    
    pub async fn create(&self, input: CreateUserInput, password_hash: Option<String>) -> Result<User, AppError> {
        let user = sqlx::query_as!(User,
            r#"
            INSERT INTO users (name, email, password_hash, role)
            VALUES ($1, $2, $3, $4)
            RETURNING id, name, email, role, created_at
            "#,
            input.name,
            input.email,
            password_hash,
            input.role.to_string()
        )
        .fetch_one(&self.pool)
        .await?;
        
        Ok(user)
    }
}
```

### Models (`models/`)

Domain types - data structures:

```rust
// src/models/user.rs
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct User {
    pub id: Uuid,
    pub name: String,
    pub email: String,
    pub role: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateUserInput {
    pub name: String,
    pub email: String,
    #[serde(default)]
    pub password: Option<String>,
    #[serde(default)]
    pub role: Role,
}

#[derive(Debug, Deserialize)]
pub struct UpdateUserInput {
    pub name: Option<String>,
    pub email: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ListParams {
    #[serde(default = "default_page")]
    pub page: u32,
    #[serde(default = "default_limit")]
    pub limit: u32,
}

fn default_page() -> u32 { 1 }
fn default_limit() -> u32 { 20 }

#[derive(Debug, Clone, Copy, Default, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Role {
    Admin,
    #[default]
    User,
}
```

---

## Application State

```rust
// src/state.rs
use std::sync::Arc;
use sqlx::PgPool;
use crate::config::Config;

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub config: Arc<Config>,
}

impl AppState {
    pub fn new(db: PgPool, config: Config) -> Self {
        Self {
            db,
            config: Arc::new(config),
        }
    }
}
```

---

## Configuration

```rust
// src/config.rs
use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct Config {
    pub database_url: String,
    pub host: String,
    pub port: u16,
    pub jwt_secret: String,
    
    #[serde(default = "default_log_level")]
    pub log_level: String,
}

fn default_log_level() -> String {
    "info".to_string()
}

impl Config {
    pub fn from_env() -> Result<Self, envy::Error> {
        envy::from_env()
    }
}
```

---

## Main Entry Point

```rust
// src/main.rs
use std::net::SocketAddr;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod config;
mod error;
mod extractors;
mod handlers;
mod middleware;
mod models;
mod repositories;
mod routes;
mod services;
mod state;

use crate::config::Config;
use crate::state::AppState;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Load .env
    dotenvy::dotenv().ok();
    
    // Initialize tracing
    tracing_subscriber::registry()
        .with(tracing_subscriber::fmt::layer())
        .with(tracing_subscriber::EnvFilter::from_default_env())
        .init();
    
    // Load config
    let config = Config::from_env()?;
    
    // Create database pool
    let pool = sqlx::postgres::PgPoolOptions::new()
        .max_connections(20)
        .connect(&config.database_url)
        .await?;
    
    // Run migrations
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await?;
    
    // Create state
    let state = AppState::new(pool, config.clone());
    
    // Build router
    let app = routes::create_router()
        .with_state(state);
    
    // Start server
    let addr = SocketAddr::from(([0, 0, 0, 0], config.port));
    tracing::info!("Listening on {}", addr);
    
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;
    
    Ok(())
}
```

---

## Module Exports

```rust
// src/routes/mod.rs
mod health;
mod users;
mod posts;

pub use self::health::routes as health_routes;
pub use self::users::routes as user_routes;
pub use self::posts::routes as post_routes;

pub fn create_router() -> Router<AppState> {
    // ...
}

// src/models/mod.rs
mod user;
mod post;

pub use self::user::*;
pub use self::post::*;
```

---

## Alternative: Feature-Based Structure

For larger applications, organize by feature:

```
src/
├── main.rs
├── features/
│   ├── users/
│   │   ├── mod.rs
│   │   ├── routes.rs
│   │   ├── handlers.rs
│   │   ├── service.rs
│   │   ├── repository.rs
│   │   └── models.rs
│   │
│   ├── posts/
│   │   ├── mod.rs
│   │   ├── routes.rs
│   │   ├── handlers.rs
│   │   ├── service.rs
│   │   ├── repository.rs
│   │   └── models.rs
│   │
│   └── auth/
│       ├── mod.rs
│       ├── routes.rs
│       ├── handlers.rs
│       ├── service.rs
│       └── jwt.rs
│
├── shared/
│   ├── error.rs
│   ├── state.rs
│   ├── config.rs
│   └── middleware/
│
└── lib.rs
```
