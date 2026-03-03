# Database Testing

Testing database migrations, fixtures, and ensuring data integrity across different backend stacks.

## Overview

Database testing ensures:
- Migrations run correctly
- Schema constraints work
- Queries return expected results
- Transactions behave properly
- Data integrity is maintained

---

## Migration Testing

### Rust (SQLx Migrations)
```rust
// tests/migrations_test.rs
use sqlx::PgPool;

#[sqlx::test]
async fn test_migrations_run_successfully(pool: PgPool) {
    // sqlx::test automatically runs migrations
    // Verify expected tables exist
    let tables = sqlx::query!(
        r#"
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
        "#
    )
    .fetch_all(&pool)
    .await
    .unwrap();
    
    let table_names: Vec<_> = tables.iter().map(|r| r.table_name.as_ref().unwrap().as_str()).collect();
    
    assert!(table_names.contains(&"users"));
    assert!(table_names.contains(&"orders"));
    assert!(table_names.contains(&"products"));
}

#[sqlx::test]
async fn test_user_table_constraints(pool: PgPool) {
    // Test unique constraint
    sqlx::query!("INSERT INTO users (email, name) VALUES ($1, $2)", "test@example.com", "John")
        .execute(&pool)
        .await
        .unwrap();
    
    let result = sqlx::query!("INSERT INTO users (email, name) VALUES ($1, $2)", "test@example.com", "Jane")
        .execute(&pool)
        .await;
    
    assert!(result.is_err());
    assert!(result.unwrap_err().to_string().contains("duplicate"));
}
```

### Go (golang-migrate)
```go
// tests/migrations_test.go
package tests

import (
    "database/sql"
    "testing"
    
    "github.com/golang-migrate/migrate/v4"
    "github.com/golang-migrate/migrate/v4/database/postgres"
    _ "github.com/golang-migrate/migrate/v4/source/file"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

func TestMigrations(t *testing.T) {
    db, err := sql.Open("postgres", "postgres://test:test@localhost:5433/test_db?sslmode=disable")
    require.NoError(t, err)
    defer db.Close()
    
    driver, err := postgres.WithInstance(db, &postgres.Config{})
    require.NoError(t, err)
    
    m, err := migrate.NewWithDatabaseInstance(
        "file://../../migrations",
        "postgres", driver,
    )
    require.NoError(t, err)
    
    // Run all migrations
    err = m.Up()
    assert.NoError(t, err)
    
    // Verify tables exist
    var exists bool
    err = db.QueryRow(`
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'users'
        )
    `).Scan(&exists)
    require.NoError(t, err)
    assert.True(t, exists)
    
    // Test rollback
    err = m.Down()
    assert.NoError(t, err)
}
```

### Python (Alembic)
```python
# tests/test_migrations.py
import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import inspect

@pytest.fixture
def alembic_config():
    config = Config("alembic.ini")
    config.set_main_option("sqlalchemy.url", "postgresql://test:test@localhost:5433/test_db")
    return config

def test_migrations_up_and_down(alembic_config, db_engine):
    # Run all migrations
    command.upgrade(alembic_config, "head")
    
    # Verify tables exist
    inspector = inspect(db_engine)
    tables = inspector.get_table_names()
    
    assert "users" in tables
    assert "orders" in tables
    assert "products" in tables
    
    # Test rollback
    command.downgrade(alembic_config, "base")
    
    inspector = inspect(db_engine)
    tables = inspector.get_table_names()
    assert "users" not in tables
```

### Node.js (Prisma)
```typescript
// tests/migrations.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';

describe('Migrations', () => {
  const prisma = new PrismaClient();

  beforeAll(async () => {
    // Reset and apply migrations
    execSync('npx prisma migrate reset --force', {
      env: { ...process.env, DATABASE_URL: 'postgres://test:test@localhost:5433/test_db' },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('creates expected tables', async () => {
    const tables = await prisma.$queryRaw<{ table_name: string }[]>`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;

    const tableNames = tables.map(t => t.table_name);
    expect(tableNames).toContain('users');
    expect(tableNames).toContain('orders');
  });
});
```

---

## Test Fixtures & Factories

### Rust Factory Pattern
```rust
// tests/factories/mod.rs
use sqlx::PgPool;
use uuid::Uuid;

pub struct UserFactory;

impl UserFactory {
    pub async fn create(pool: &PgPool) -> User {
        Self::create_with(pool, None, None).await
    }
    
    pub async fn create_with(
        pool: &PgPool,
        email: Option<&str>,
        name: Option<&str>,
    ) -> User {
        let email = email.unwrap_or(&format!("user-{}@test.com", Uuid::new_v4()));
        let name = name.unwrap_or("Test User");
        
        sqlx::query_as!(
            User,
            r#"
            INSERT INTO users (email, name)
            VALUES ($1, $2)
            RETURNING id, email, name, created_at
            "#,
            email,
            name
        )
        .fetch_one(pool)
        .await
        .unwrap()
    }
}

pub struct OrderFactory;

impl OrderFactory {
    pub async fn create(pool: &PgPool, user_id: Uuid) -> Order {
        sqlx::query_as!(
            Order,
            r#"
            INSERT INTO orders (user_id, total, status)
            VALUES ($1, $2, $3)
            RETURNING id, user_id, total, status, created_at
            "#,
            user_id,
            100.00_f64,
            "pending"
        )
        .fetch_one(pool)
        .await
        .unwrap()
    }
}

// Usage in tests
#[sqlx::test]
async fn test_user_with_orders(pool: PgPool) {
    let user = UserFactory::create(&pool).await;
    let order1 = OrderFactory::create(&pool, user.id).await;
    let order2 = OrderFactory::create(&pool, user.id).await;
    
    let orders = sqlx::query_as!(Order, "SELECT * FROM orders WHERE user_id = $1", user.id)
        .fetch_all(&pool)
        .await
        .unwrap();
    
    assert_eq!(orders.len(), 2);
}
```

### Go Factory Pattern
```go
// tests/factories/factories.go
package factories

import (
    "database/sql"
    "fmt"
    
    "github.com/google/uuid"
)

type UserFactory struct {
    DB *sql.DB
}

func (f *UserFactory) Create() (*User, error) {
    return f.CreateWith("", "")
}

func (f *UserFactory) CreateWith(email, name string) (*User, error) {
    if email == "" {
        email = fmt.Sprintf("user-%s@test.com", uuid.New().String())
    }
    if name == "" {
        name = "Test User"
    }
    
    var user User
    err := f.DB.QueryRow(`
        INSERT INTO users (email, name)
        VALUES ($1, $2)
        RETURNING id, email, name, created_at
    `, email, name).Scan(&user.ID, &user.Email, &user.Name, &user.CreatedAt)
    
    return &user, err
}

// Usage
func TestUserWithOrders(t *testing.T) {
    userFactory := &UserFactory{DB: testDB}
    orderFactory := &OrderFactory{DB: testDB}
    
    user, _ := userFactory.Create()
    orderFactory.Create(user.ID)
    orderFactory.Create(user.ID)
    
    var count int
    testDB.QueryRow("SELECT COUNT(*) FROM orders WHERE user_id = $1", user.ID).Scan(&count)
    assert.Equal(t, 2, count)
}
```

### Python Factory (factory_boy)
```python
# tests/factories.py
import factory
from factory.alchemy import SQLAlchemyModelFactory
from app.models import User, Order
from tests.conftest import TestSession

class UserFactory(SQLAlchemyModelFactory):
    class Meta:
        model = User
        sqlalchemy_session = TestSession
        sqlalchemy_session_persistence = "commit"
    
    email = factory.LazyAttribute(lambda _: f"user-{factory.Faker('uuid4').generate()}@test.com")
    name = factory.Faker('name')

class OrderFactory(SQLAlchemyModelFactory):
    class Meta:
        model = Order
        sqlalchemy_session = TestSession
        sqlalchemy_session_persistence = "commit"
    
    user = factory.SubFactory(UserFactory)
    total = factory.Faker('pydecimal', left_digits=3, right_digits=2, positive=True)
    status = "pending"

# Usage
@pytest.mark.asyncio
async def test_user_with_orders(db_session):
    user = UserFactory.create()
    OrderFactory.create_batch(2, user=user)
    
    result = await db_session.execute(
        "SELECT COUNT(*) FROM orders WHERE user_id = :id",
        {"id": user.id}
    )
    assert result.scalar() == 2
```

---

## Transaction Rollback Pattern

Testing with automatic rollback for isolation.

### Rust
```rust
#[sqlx::test]
async fn test_with_transaction_rollback(pool: PgPool) {
    // Each #[sqlx::test] runs in a transaction that's rolled back after
    // This ensures test isolation without manual cleanup
    
    sqlx::query!("INSERT INTO users (email, name) VALUES ($1, $2)", "test@example.com", "John")
        .execute(&pool)
        .await
        .unwrap();
    
    let count: i64 = sqlx::query_scalar!("SELECT COUNT(*) FROM users")
        .fetch_one(&pool)
        .await
        .unwrap()
        .unwrap();
    
    assert_eq!(count, 1);
    // Transaction auto-rolls back - no cleanup needed
}
```

### Go
```go
func TestWithTransaction(t *testing.T) {
    tx, err := testDB.Begin()
    require.NoError(t, err)
    defer tx.Rollback() // Always rollback
    
    _, err = tx.Exec("INSERT INTO users (email, name) VALUES ($1, $2)", "test@example.com", "John")
    require.NoError(t, err)
    
    var count int
    tx.QueryRow("SELECT COUNT(*) FROM users").Scan(&count)
    assert.Equal(t, 1, count)
    
    // Rollback happens automatically via defer
}
```

### Python
```python
@pytest.fixture
async def db_transaction(db_engine):
    """Each test runs in a transaction that's rolled back."""
    async with db_engine.connect() as conn:
        trans = await conn.begin()
        yield conn
        await trans.rollback()

@pytest.mark.asyncio
async def test_with_rollback(db_transaction):
    await db_transaction.execute(
        "INSERT INTO users (email, name) VALUES (:email, :name)",
        {"email": "test@example.com", "name": "John"}
    )
    
    result = await db_transaction.execute("SELECT COUNT(*) FROM users")
    assert result.scalar() == 1
    # Rollback happens automatically
```

---

## Testing Constraints & Triggers

### Unique Constraints
```rust
#[sqlx::test]
async fn test_email_unique_constraint(pool: PgPool) {
    // First insert succeeds
    sqlx::query!("INSERT INTO users (email, name) VALUES ($1, $2)", "test@example.com", "John")
        .execute(&pool)
        .await
        .unwrap();
    
    // Duplicate fails
    let result = sqlx::query!("INSERT INTO users (email, name) VALUES ($1, $2)", "test@example.com", "Jane")
        .execute(&pool)
        .await;
    
    assert!(result.is_err());
    let err = result.unwrap_err();
    assert!(err.to_string().contains("duplicate") || err.to_string().contains("unique"));
}
```

### Foreign Key Constraints
```rust
#[sqlx::test]
async fn test_order_requires_valid_user(pool: PgPool) {
    let fake_user_id = uuid::Uuid::new_v4();
    
    let result = sqlx::query!(
        "INSERT INTO orders (user_id, total) VALUES ($1, $2)",
        fake_user_id,
        100.00_f64
    )
    .execute(&pool)
    .await;
    
    assert!(result.is_err());
    assert!(result.unwrap_err().to_string().contains("foreign key"));
}
```

### Check Constraints
```rust
#[sqlx::test]
async fn test_order_total_must_be_positive(pool: PgPool) {
    let user = UserFactory::create(&pool).await;
    
    let result = sqlx::query!(
        "INSERT INTO orders (user_id, total) VALUES ($1, $2)",
        user.id,
        -50.00_f64  // Negative value
    )
    .execute(&pool)
    .await;
    
    assert!(result.is_err());
    assert!(result.unwrap_err().to_string().contains("check"));
}
```

---

## Best Practices

### 1. Test Database Setup
```yaml
✅ Use Docker containers for test databases
✅ Use same database version as production
✅ Run migrations before each test suite
✅ Isolate tests with transactions or truncation
```

### 2. Test Data Management
```yaml
✅ Use factories, not static fixtures
✅ Generate unique identifiers per test
✅ Clean up after tests (or use rollback)
❌ Don't rely on data from other tests
```

### 3. What to Test
| Test Type | Examples |
|-----------|----------|
| Migrations | Tables created, columns exist |
| Constraints | Unique, foreign key, check |
| Indexes | Query performance with EXPLAIN |
| Triggers | Audit logs, computed columns |
| Transactions | ACID properties |

### 4. CI/CD Database Setup
```yaml
# GitHub Actions
services:
  postgres:
    image: postgres:16-alpine
    env:
      POSTGRES_DB: test_db
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
    ports:
      - 5432:5432
    options: >-
      --health-cmd pg_isready
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5
```
