# Testing Guide

Comprehensive testing strategies for Rust + Axum backends.

## Test Pyramid

```
        /\
       /  \     E2E Tests (10%)
      /----\    - Full API tests
     /      \   - Browser tests
    /--------\  
   /          \ Integration Tests (20%)
  /            \ - Database tests
 /--------------\ - Handler tests
/                \
/                  \ Unit Tests (70%)
/--------------------\ - Pure functions
                       - Business logic
```

---

## Unit Tests

### Testing Pure Functions

```rust
// src/services/pricing.rs
pub fn calculate_discount(price: i64, quantity: u32) -> i64 {
    let base = price * quantity as i64;
    match quantity {
        0..=9 => base,
        10..=49 => base * 90 / 100,    // 10% off
        50..=99 => base * 85 / 100,    // 15% off
        _ => base * 80 / 100,          // 20% off
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_no_discount_under_10() {
        assert_eq!(calculate_discount(100, 5), 500);
    }
    
    #[test]
    fn test_10_percent_discount() {
        assert_eq!(calculate_discount(100, 10), 900);
    }
    
    #[test]
    fn test_15_percent_discount() {
        assert_eq!(calculate_discount(100, 50), 4250);
    }
    
    #[test]
    fn test_20_percent_discount() {
        assert_eq!(calculate_discount(100, 100), 8000);
    }
}
```

### Testing with Mocks

```rust
use mockall::{automock, predicate::*};

#[automock]
#[async_trait]
pub trait UserRepository: Send + Sync {
    async fn find_by_id(&self, id: Uuid) -> Result<Option<User>, AppError>;
    async fn save(&self, user: &User) -> Result<(), AppError>;
}

pub struct UserService<R: UserRepository> {
    repo: R,
}

impl<R: UserRepository> UserService<R> {
    pub async fn get_user(&self, id: Uuid) -> Result<User, AppError> {
        self.repo.find_by_id(id).await?
            .ok_or(AppError::NotFound("User not found".into()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[tokio::test]
    async fn test_get_user_found() {
        let mut mock_repo = MockUserRepository::new();
        let user_id = Uuid::new_v4();
        let expected_user = User {
            id: user_id,
            name: "Test".to_string(),
            email: "test@example.com".to_string(),
            role: Role::User,
            created_at: Utc::now(),
        };
        
        mock_repo
            .expect_find_by_id()
            .with(eq(user_id))
            .times(1)
            .returning(move |_| Ok(Some(expected_user.clone())));
        
        let service = UserService { repo: mock_repo };
        let result = service.get_user(user_id).await;
        
        assert!(result.is_ok());
        assert_eq!(result.unwrap().id, user_id);
    }
    
    #[tokio::test]
    async fn test_get_user_not_found() {
        let mut mock_repo = MockUserRepository::new();
        
        mock_repo
            .expect_find_by_id()
            .returning(|_| Ok(None));
        
        let service = UserService { repo: mock_repo };
        let result = service.get_user(Uuid::new_v4()).await;
        
        assert!(matches!(result, Err(AppError::NotFound(_))));
    }
}
```

---

## Integration Tests

### Testing Handlers

```rust
// tests/users_test.rs
use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use tower::ServiceExt;
use serde_json::json;

async fn create_test_app() -> Router {
    // Create test database pool
    let pool = create_test_pool().await;
    
    // Run migrations
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .unwrap();
    
    // Create app with test state
    let state = AppState::new(pool, test_config());
    routes::create_router().with_state(state)
}

#[tokio::test]
async fn test_create_user() {
    let app = create_test_app().await;
    
    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/users")
                .header("Content-Type", "application/json")
                .body(Body::from(
                    json!({
                        "name": "Test User",
                        "email": "test@example.com"
                    }).to_string()
                ))
                .unwrap()
        )
        .await
        .unwrap();
    
    assert_eq!(response.status(), StatusCode::CREATED);
    
    let body = hyper::body::to_bytes(response.into_body()).await.unwrap();
    let user: User = serde_json::from_slice(&body).unwrap();
    
    assert_eq!(user.name, "Test User");
    assert_eq!(user.email, "test@example.com");
}

#[tokio::test]
async fn test_get_user_not_found() {
    let app = create_test_app().await;
    
    let response = app
        .oneshot(
            Request::builder()
                .uri(format!("/api/users/{}", Uuid::new_v4()))
                .body(Body::empty())
                .unwrap()
        )
        .await
        .unwrap();
    
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn test_list_users_pagination() {
    let app = create_test_app().await;
    
    // Create some test users first
    for i in 0..15 {
        create_test_user(&app, &format!("User {}", i)).await;
    }
    
    let response = app.clone()
        .oneshot(
            Request::builder()
                .uri("/api/users?page=1&limit=10")
                .body(Body::empty())
                .unwrap()
        )
        .await
        .unwrap();
    
    assert_eq!(response.status(), StatusCode::OK);
    
    let body = hyper::body::to_bytes(response.into_body()).await.unwrap();
    let result: PaginatedResponse<User> = serde_json::from_slice(&body).unwrap();
    
    assert_eq!(result.data.len(), 10);
    assert_eq!(result.total, 15);
    assert_eq!(result.page, 1);
}
```

### Testing with Real Database

```rust
use sqlx::PgPool;

// Use testcontainers for isolated database
use testcontainers::{clients::Cli, images::postgres::Postgres, Container};

struct TestDb {
    _container: Container<'static, Cli, Postgres>,
    pool: PgPool,
}

impl TestDb {
    async fn new() -> Self {
        let docker = Cli::default();
        let container = docker.run(Postgres::default());
        
        let connection_string = format!(
            "postgres://postgres:postgres@localhost:{}/postgres",
            container.get_host_port(5432)
        );
        
        let pool = PgPool::connect(&connection_string).await.unwrap();
        
        // Run migrations
        sqlx::migrate!("./migrations")
            .run(&pool)
            .await
            .unwrap();
        
        Self {
            _container: container,
            pool,
        }
    }
}

#[tokio::test]
async fn test_user_repository() {
    let test_db = TestDb::new().await;
    let repo = UserRepository::new(test_db.pool.clone());
    
    // Create user
    let input = CreateUserInput {
        name: "Test".to_string(),
        email: "test@example.com".to_string(),
    };
    
    let user = repo.create(input).await.unwrap();
    assert_eq!(user.name, "Test");
    
    // Find by ID
    let found = repo.find_by_id(user.id).await.unwrap();
    assert!(found.is_some());
    assert_eq!(found.unwrap().email, "test@example.com");
    
    // Update
    let update = UpdateUserInput { name: Some("Updated".to_string()), email: None };
    let updated = repo.update(user.id, update).await.unwrap();
    assert_eq!(updated.name, "Updated");
    
    // Delete
    repo.delete(user.id).await.unwrap();
    let deleted = repo.find_by_id(user.id).await.unwrap();
    assert!(deleted.is_none());
}
```

---

## Testing Authentication

```rust
mod auth_tests {
    use super::*;
    
    fn create_auth_token(user_id: Uuid) -> String {
        let jwt = JwtService::new("test-secret");
        let user = User {
            id: user_id,
            name: "Test".to_string(),
            email: "test@test.com".to_string(),
            role: Role::User,
            created_at: Utc::now(),
        };
        jwt.create_token(&user).unwrap()
    }
    
    #[tokio::test]
    async fn test_protected_route_without_auth() {
        let app = create_test_app().await;
        
        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/profile")
                    .body(Body::empty())
                    .unwrap()
            )
            .await
            .unwrap();
        
        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }
    
    #[tokio::test]
    async fn test_protected_route_with_auth() {
        let app = create_test_app().await;
        let user_id = Uuid::new_v4();
        let token = create_auth_token(user_id);
        
        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/profile")
                    .header("Authorization", format!("Bearer {}", token))
                    .body(Body::empty())
                    .unwrap()
            )
            .await
            .unwrap();
        
        assert_eq!(response.status(), StatusCode::OK);
    }
    
    #[tokio::test]
    async fn test_admin_route_forbidden_for_user() {
        let app = create_test_app().await;
        let token = create_auth_token_with_role(Role::User);
        
        let response = app
            .oneshot(
                Request::builder()
                    .uri("/admin/users")
                    .header("Authorization", format!("Bearer {}", token))
                    .body(Body::empty())
                    .unwrap()
            )
            .await
            .unwrap();
        
        assert_eq!(response.status(), StatusCode::FORBIDDEN);
    }
}
```

---

## Test Utilities

### Test Fixtures

```rust
// tests/common/mod.rs
use once_cell::sync::Lazy;
use sqlx::PgPool;

pub static TEST_POOL: Lazy<PgPool> = Lazy::new(|| {
    tokio::runtime::Runtime::new()
        .unwrap()
        .block_on(create_test_pool())
});

pub async fn create_test_pool() -> PgPool {
    let database_url = std::env::var("TEST_DATABASE_URL")
        .unwrap_or_else(|_| "postgres://postgres:postgres@localhost/test_db".to_string());
    
    PgPool::connect(&database_url).await.unwrap()
}

pub fn test_user() -> User {
    User {
        id: Uuid::new_v4(),
        name: "Test User".to_string(),
        email: format!("test-{}@example.com", Uuid::new_v4()),
        role: Role::User,
        created_at: Utc::now(),
    }
}

pub async fn seed_test_data(pool: &PgPool) {
    // Clean up
    sqlx::query!("TRUNCATE users, posts CASCADE")
        .execute(pool)
        .await
        .unwrap();
    
    // Insert test data
    for i in 0..5 {
        sqlx::query!(
            "INSERT INTO users (id, name, email) VALUES ($1, $2, $3)",
            Uuid::new_v4(),
            format!("User {}", i),
            format!("user{}@test.com", i)
        )
        .execute(pool)
        .await
        .unwrap();
    }
}
```

### Request Builder

```rust
pub struct TestRequest {
    method: String,
    uri: String,
    headers: Vec<(String, String)>,
    body: Option<String>,
}

impl TestRequest {
    pub fn get(uri: &str) -> Self {
        Self {
            method: "GET".to_string(),
            uri: uri.to_string(),
            headers: vec![],
            body: None,
        }
    }
    
    pub fn post(uri: &str) -> Self {
        Self {
            method: "POST".to_string(),
            uri: uri.to_string(),
            headers: vec![("Content-Type".to_string(), "application/json".to_string())],
            body: None,
        }
    }
    
    pub fn with_auth(mut self, token: &str) -> Self {
        self.headers.push(("Authorization".to_string(), format!("Bearer {}", token)));
        self
    }
    
    pub fn with_json<T: Serialize>(mut self, body: &T) -> Self {
        self.body = Some(serde_json::to_string(body).unwrap());
        self
    }
    
    pub fn build(self) -> Request<Body> {
        let mut builder = Request::builder()
            .method(self.method.as_str())
            .uri(&self.uri);
        
        for (key, value) in &self.headers {
            builder = builder.header(key.as_str(), value.as_str());
        }
        
        match self.body {
            Some(body) => builder.body(Body::from(body)).unwrap(),
            None => builder.body(Body::empty()).unwrap(),
        }
    }
}

// Usage
#[tokio::test]
async fn test_with_builder() {
    let app = create_test_app().await;
    
    let request = TestRequest::post("/api/users")
        .with_auth(&token)
        .with_json(&json!({ "name": "Test", "email": "test@test.com" }))
        .build();
    
    let response = app.oneshot(request).await.unwrap();
    assert_eq!(response.status(), StatusCode::CREATED);
}
```

---

## Running Tests

```bash
# Run all tests
cargo test

# Run with output
cargo test -- --nocapture

# Run specific test
cargo test test_create_user

# Run integration tests only
cargo test --test '*'

# Run with coverage (requires cargo-tarpaulin)
cargo tarpaulin --out Html

# Run with test database
TEST_DATABASE_URL=postgres://localhost/test cargo test
```

---

## Test Organization

```
tests/
├── common/
│   └── mod.rs              # Shared fixtures and utilities
├── integration/
│   ├── mod.rs
│   ├── users_test.rs       # User API tests
│   └── auth_test.rs        # Auth tests
└── e2e/
    └── workflow_test.rs    # Full workflow tests
```
