# API Integration Testing

Testing HTTP endpoints with real or containerized databases across different backend stacks.

## Overview

Integration tests verify that components work together correctly:
- HTTP request/response handling
- Database operations
- Authentication/authorization
- External service integration

## Test Environment Setup

### Using Test Containers (Recommended)

```yaml
# docker-compose.test.yml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: test_db
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
    ports:
      - "5433:5432"
  
  redis:
    image: redis:7-alpine
    ports:
      - "6380:6379"
```

---

## Rust (Axum) 🦀

### Test Setup with axum-test
```rust
// Cargo.toml
[dev-dependencies]
axum-test = "14"
sqlx = { version = "0.7", features = ["runtime-tokio", "postgres", "migrate"] }
tokio = { version = "1", features = ["full", "test-util"] }
```

### Integration Test Structure
```rust
// tests/api/helpers.rs
use axum::Router;
use sqlx::{PgPool, postgres::PgPoolOptions};
use axum_test::TestServer;

pub struct TestApp {
    pub server: TestServer,
    pub db: PgPool,
}

impl TestApp {
    pub async fn spawn() -> Self {
        // Use test database
        let db_url = std::env::var("TEST_DATABASE_URL")
            .unwrap_or("postgres://test:test@localhost:5433/test_db".to_string());
        
        let db = PgPoolOptions::new()
            .max_connections(5)
            .connect(&db_url)
            .await
            .expect("Failed to connect to test database");
        
        // Run migrations
        sqlx::migrate!("./migrations")
            .run(&db)
            .await
            .expect("Failed to run migrations");
        
        // Build app with test config
        let app = create_app(db.clone());
        let server = TestServer::new(app).unwrap();
        
        Self { server, db }
    }
    
    pub async fn cleanup(&self) {
        // Truncate tables after each test
        sqlx::query("TRUNCATE users, orders, products RESTART IDENTITY CASCADE")
            .execute(&self.db)
            .await
            .unwrap();
    }
}
```

### Testing Endpoints
```rust
// tests/api/users_test.rs
use crate::helpers::TestApp;
use serde_json::json;

#[tokio::test]
async fn test_create_user() {
    let app = TestApp::spawn().await;
    
    let response = app.server
        .post("/api/users")
        .json(&json!({
            "email": "test@example.com",
            "name": "John Doe"
        }))
        .await;
    
    response.assert_status_ok();
    
    let body: serde_json::Value = response.json();
    assert_eq!(body["email"], "test@example.com");
    assert!(body["id"].is_string());
    
    // Verify in database
    let user = sqlx::query!("SELECT email FROM users WHERE email = $1", "test@example.com")
        .fetch_one(&app.db)
        .await
        .unwrap();
    assert_eq!(user.email, "test@example.com");
    
    app.cleanup().await;
}

#[tokio::test]
async fn test_create_user_duplicate_email() {
    let app = TestApp::spawn().await;
    
    // Create first user
    app.server
        .post("/api/users")
        .json(&json!({"email": "test@example.com", "name": "John"}))
        .await;
    
    // Try duplicate
    let response = app.server
        .post("/api/users")
        .json(&json!({"email": "test@example.com", "name": "Jane"}))
        .await;
    
    response.assert_status(axum::http::StatusCode::CONFLICT);
    
    app.cleanup().await;
}

#[tokio::test]
async fn test_get_user_not_found() {
    let app = TestApp::spawn().await;
    
    let response = app.server
        .get("/api/users/00000000-0000-0000-0000-000000000000")
        .await;
    
    response.assert_status_not_found();
}
```

### Testing with Authentication
```rust
// tests/api/auth_test.rs
#[tokio::test]
async fn test_protected_endpoint_requires_auth() {
    let app = TestApp::spawn().await;
    
    // Without token
    let response = app.server
        .get("/api/users/me")
        .await;
    response.assert_status_unauthorized();
    
    // With valid token
    let token = app.create_test_user_and_login().await;
    let response = app.server
        .get("/api/users/me")
        .add_header("Authorization", format!("Bearer {}", token))
        .await;
    response.assert_status_ok();
    
    app.cleanup().await;
}
```

---

## Go (Gin/Fiber) 🐹

### Test Setup
```go
// tests/helpers/test_app.go
package helpers

import (
    "database/sql"
    "net/http/httptest"
    "testing"
    
    "github.com/gin-gonic/gin"
    _ "github.com/lib/pq"
)

type TestApp struct {
    Router *gin.Engine
    DB     *sql.DB
    Server *httptest.Server
}

func NewTestApp(t *testing.T) *TestApp {
    gin.SetMode(gin.TestMode)
    
    db, err := sql.Open("postgres", "postgres://test:test@localhost:5433/test_db?sslmode=disable")
    if err != nil {
        t.Fatalf("Failed to connect to test database: %v", err)
    }
    
    router := setupRouter(db)
    server := httptest.NewServer(router)
    
    return &TestApp{
        Router: router,
        DB:     db,
        Server: server,
    }
}

func (app *TestApp) Cleanup() {
    app.DB.Exec("TRUNCATE users, orders, products RESTART IDENTITY CASCADE")
    app.Server.Close()
}
```

### Testing Endpoints
```go
// tests/users_test.go
package tests

import (
    "bytes"
    "encoding/json"
    "net/http"
    "testing"
    
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
    "myapp/tests/helpers"
)

func TestCreateUser(t *testing.T) {
    app := helpers.NewTestApp(t)
    defer app.Cleanup()
    
    payload := map[string]string{
        "email": "test@example.com",
        "name":  "John Doe",
    }
    body, _ := json.Marshal(payload)
    
    resp, err := http.Post(
        app.Server.URL+"/api/users",
        "application/json",
        bytes.NewReader(body),
    )
    require.NoError(t, err)
    defer resp.Body.Close()
    
    assert.Equal(t, http.StatusOK, resp.StatusCode)
    
    var result map[string]interface{}
    json.NewDecoder(resp.Body).Decode(&result)
    
    assert.Equal(t, "test@example.com", result["email"])
    assert.NotEmpty(t, result["id"])
    
    // Verify in database
    var email string
    err = app.DB.QueryRow("SELECT email FROM users WHERE email = $1", "test@example.com").Scan(&email)
    require.NoError(t, err)
    assert.Equal(t, "test@example.com", email)
}

func TestCreateUserDuplicateEmail(t *testing.T) {
    app := helpers.NewTestApp(t)
    defer app.Cleanup()
    
    payload := map[string]string{"email": "test@example.com", "name": "John"}
    body, _ := json.Marshal(payload)
    
    // First request
    http.Post(app.Server.URL+"/api/users", "application/json", bytes.NewReader(body))
    
    // Duplicate request
    body, _ = json.Marshal(payload)
    resp, _ := http.Post(app.Server.URL+"/api/users", "application/json", bytes.NewReader(body))
    
    assert.Equal(t, http.StatusConflict, resp.StatusCode)
}
```

---

## Python (FastAPI) 🐍

### Test Setup
```python
# tests/conftest.py
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.db import get_db, Base

TEST_DATABASE_URL = "postgresql+asyncpg://test:test@localhost:5433/test_db"

@pytest.fixture
async def db_engine():
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()

@pytest.fixture
async def db_session(db_engine):
    async_session = sessionmaker(
        db_engine, class_=AsyncSession, expire_on_commit=False
    )
    async with async_session() as session:
        yield session

@pytest.fixture
async def client(db_session):
    def override_get_db():
        return db_session
    
    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
    app.dependency_overrides.clear()
```

### Testing Endpoints
```python
# tests/test_users.py
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_create_user(client: AsyncClient, db_session):
    response = await client.post(
        "/api/users",
        json={"email": "test@example.com", "name": "John Doe"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test@example.com"
    assert "id" in data
    
    # Verify in database
    result = await db_session.execute(
        "SELECT email FROM users WHERE email = :email",
        {"email": "test@example.com"}
    )
    row = result.fetchone()
    assert row.email == "test@example.com"

@pytest.mark.asyncio
async def test_create_user_duplicate_email(client: AsyncClient):
    # Create first user
    await client.post("/api/users", json={"email": "test@example.com", "name": "John"})
    
    # Try duplicate
    response = await client.post(
        "/api/users",
        json={"email": "test@example.com", "name": "Jane"}
    )
    
    assert response.status_code == 409

@pytest.mark.asyncio
async def test_get_user_not_found(client: AsyncClient):
    response = await client.get("/api/users/00000000-0000-0000-0000-000000000000")
    
    assert response.status_code == 404
```

### Testing with Authentication
```python
# tests/test_auth.py
@pytest.mark.asyncio
async def test_protected_endpoint_requires_auth(client: AsyncClient):
    response = await client.get("/api/users/me")
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_protected_endpoint_with_token(client: AsyncClient, auth_token: str):
    response = await client.get(
        "/api/users/me",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 200
```

---

## Node.js (Express) 📦

### Test Setup
```typescript
// tests/helpers/test-app.ts
import { Express } from 'express';
import request from 'supertest';
import { Pool } from 'pg';
import { createApp } from '../../src/app';

export class TestApp {
  app: Express;
  db: Pool;

  constructor() {
    this.db = new Pool({
      connectionString: 'postgres://test:test@localhost:5433/test_db',
    });
    this.app = createApp(this.db);
  }

  async cleanup() {
    await this.db.query('TRUNCATE users, orders, products RESTART IDENTITY CASCADE');
  }

  async close() {
    await this.db.end();
  }

  request() {
    return request(this.app);
  }
}
```

### Testing Endpoints
```typescript
// tests/users.test.ts
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { TestApp } from './helpers/test-app';

describe('Users API', () => {
  let app: TestApp;

  beforeAll(() => {
    app = new TestApp();
  });

  afterEach(async () => {
    await app.cleanup();
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates a user', async () => {
    const response = await app.request()
      .post('/api/users')
      .send({ email: 'test@example.com', name: 'John Doe' })
      .expect(200);

    expect(response.body.email).toBe('test@example.com');
    expect(response.body.id).toBeDefined();

    // Verify in database
    const result = await app.db.query(
      'SELECT email FROM users WHERE email = $1',
      ['test@example.com']
    );
    expect(result.rows[0].email).toBe('test@example.com');
  });

  it('returns 409 for duplicate email', async () => {
    await app.request()
      .post('/api/users')
      .send({ email: 'test@example.com', name: 'John' });

    await app.request()
      .post('/api/users')
      .send({ email: 'test@example.com', name: 'Jane' })
      .expect(409);
  });

  it('returns 404 for non-existent user', async () => {
    await app.request()
      .get('/api/users/00000000-0000-0000-0000-000000000000')
      .expect(404);
  });
});
```

---

## Best Practices

### 1. Database Isolation
```yaml
✅ Use separate test database
✅ Truncate tables between tests
✅ Use transactions with rollback where possible
✅ Generate unique test data per test
❌ Never use production database
❌ Don't share state between tests
```

### 2. Test Data Factories
```rust
// Rust
fn create_test_user(db: &PgPool) -> User {
    User::create(db, &format!("user-{}@test.com", Uuid::new_v4()), "Test User").await
}
```

### 3. CI/CD Integration
```yaml
# GitHub Actions
jobs:
  test:
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: test_db
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432
    steps:
      - run: cargo test --test '*'  # Rust
      - run: go test ./...           # Go
      - run: pytest tests/           # Python
      - run: npm run test:integration # Node
```

### 4. Test Coverage Goals
| Area | Target |
|------|--------|
| Happy path | 100% |
| Error handling | 90%+ |
| Edge cases | High |
| Auth flows | 100% |
