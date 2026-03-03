# SQLx + PostgreSQL

Production patterns for PostgreSQL with SQLx in Rust.

## Setup

### Cargo.toml

```toml
[dependencies]
sqlx = { version = "0.7", features = [
    "runtime-tokio",    # Async runtime
    "postgres",         # PostgreSQL driver
    "uuid",             # UUID support
    "time",             # Time/DateTime support
    "migrate",          # Migrations
] }
tokio = { version = "1", features = ["full"] }
uuid = { version = "1", features = ["v4", "serde"] }
chrono = { version = "0.4", features = ["serde"] }
```

### Connection

```rust
use sqlx::postgres::PgPoolOptions;
use std::time::Duration;

pub async fn create_pool(database_url: &str) -> Result<PgPool, sqlx::Error> {
    PgPoolOptions::new()
        .max_connections(20)
        .min_connections(5)
        .acquire_timeout(Duration::from_secs(3))
        .idle_timeout(Duration::from_secs(60 * 10))
        .max_lifetime(Duration::from_secs(60 * 30))
        .connect(database_url)
        .await
}

// Usage in main.rs
#[tokio::main]
async fn main() {
    let database_url = std::env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set");
    
    let pool = create_pool(&database_url)
        .await
        .expect("Failed to create pool");
    
    // Run migrations
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("Failed to run migrations");
}
```

---

## Query Patterns

### Never Use SELECT *

Always list columns explicitly for backwards compatibility:

```rust
// ❌ Wrong - breaks when columns are added
let user = sqlx::query_as!(User, "SELECT * FROM users WHERE id = $1", id)
    .fetch_one(&pool)
    .await?;

// ✅ Correct - explicit columns
let user = sqlx::query_as!(User,
    "SELECT id, name, email, role, created_at FROM users WHERE id = $1",
    id
)
.fetch_one(&pool)
.await?;
```

### Compile-Time Checked Queries (query_as!)

```rust
#[derive(Debug, sqlx::FromRow)]
pub struct User {
    pub id: Uuid,
    pub name: String,
    pub email: String,
    pub role: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

// Compile-time checked - requires DATABASE_URL at build
let user = sqlx::query_as!(User,
    r#"
    SELECT id, name, email, role, created_at
    FROM users
    WHERE id = $1
    "#,
    user_id
)
.fetch_optional(&pool)
.await?
.ok_or(AppError::NotFound("User not found".into()))?;
```

### Dynamic Queries (query_as)

```rust
// Runtime query - use when compile-time check not possible
let users = sqlx::query_as::<_, User>(
    "SELECT id, name, email, role, created_at FROM users WHERE role = $1"
)
.bind(&role)
.fetch_all(&pool)
.await?;
```

### Scalar Values

```rust
// Count
let count: i64 = sqlx::query_scalar!("SELECT COUNT(*) FROM users")
    .fetch_one(&pool)
    .await?
    .unwrap_or(0);

// Exists check
let exists: bool = sqlx::query_scalar!(
    "SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)",
    email
)
.fetch_one(&pool)
.await?
.unwrap_or(false);

// Single value
let name: String = sqlx::query_scalar!(
    "SELECT name FROM users WHERE id = $1",
    id
)
.fetch_one(&pool)
.await?;
```

---

## CRUD Operations

### Create

```rust
// Insert and return created row
pub async fn create_user(pool: &PgPool, input: CreateUserInput) -> Result<User, AppError> {
    let user = sqlx::query_as!(User,
        r#"
        INSERT INTO users (name, email, role)
        VALUES ($1, $2, $3)
        RETURNING id, name, email, role, created_at
        "#,
        input.name,
        input.email,
        input.role.to_string(),
    )
    .fetch_one(pool)
    .await?;
    
    Ok(user)
}

// Insert without returning (faster)
pub async fn create_user_simple(pool: &PgPool, input: CreateUserInput) -> Result<Uuid, AppError> {
    let id = Uuid::new_v4();
    
    sqlx::query!(
        "INSERT INTO users (id, name, email) VALUES ($1, $2, $3)",
        id,
        input.name,
        input.email,
    )
    .execute(pool)
    .await?;
    
    Ok(id)
}
```

### Read

```rust
// Single record
pub async fn get_user(pool: &PgPool, id: Uuid) -> Result<Option<User>, AppError> {
    let user = sqlx::query_as!(User,
        "SELECT id, name, email, role, created_at FROM users WHERE id = $1",
        id
    )
    .fetch_optional(pool)
    .await?;
    
    Ok(user)
}

// List with pagination
pub async fn list_users(
    pool: &PgPool,
    limit: i64,
    offset: i64,
) -> Result<Vec<User>, AppError> {
    let users = sqlx::query_as!(User,
        r#"
        SELECT id, name, email, role, created_at
        FROM users
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
        "#,
        limit,
        offset,
    )
    .fetch_all(pool)
    .await?;
    
    Ok(users)
}

// With filters
pub async fn search_users(
    pool: &PgPool,
    search: &str,
    role: Option<&str>,
) -> Result<Vec<User>, AppError> {
    let users = sqlx::query_as!(User,
        r#"
        SELECT id, name, email, role, created_at
        FROM users
        WHERE 
            (name ILIKE $1 OR email ILIKE $1)
            AND ($2::text IS NULL OR role = $2)
        ORDER BY name
        "#,
        format!("%{}%", search),
        role,
    )
    .fetch_all(pool)
    .await?;
    
    Ok(users)
}
```

### Update

```rust
pub async fn update_user(
    pool: &PgPool,
    id: Uuid,
    input: UpdateUserInput,
) -> Result<User, AppError> {
    let user = sqlx::query_as!(User,
        r#"
        UPDATE users
        SET 
            name = COALESCE($2, name),
            email = COALESCE($3, email),
            updated_at = NOW()
        WHERE id = $1
        RETURNING id, name, email, role, created_at
        "#,
        id,
        input.name,
        input.email,
    )
    .fetch_optional(pool)
    .await?
    .ok_or(AppError::NotFound("User not found".into()))?;
    
    Ok(user)
}
```

### Delete

```rust
pub async fn delete_user(pool: &PgPool, id: Uuid) -> Result<(), AppError> {
    let result = sqlx::query!("DELETE FROM users WHERE id = $1", id)
        .execute(pool)
        .await?;
    
    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("User not found".into()));
    }
    
    Ok(())
}
```

---

## Batch Operations

### Bulk Insert

```rust
// Avoid N+1 - use single query
pub async fn create_users_batch(
    pool: &PgPool,
    users: Vec<CreateUserInput>,
) -> Result<Vec<User>, AppError> {
    // Build values
    let names: Vec<_> = users.iter().map(|u| u.name.clone()).collect();
    let emails: Vec<_> = users.iter().map(|u| u.email.clone()).collect();
    
    let created = sqlx::query_as!(User,
        r#"
        INSERT INTO users (name, email)
        SELECT * FROM UNNEST($1::text[], $2::text[])
        RETURNING id, name, email, role, created_at
        "#,
        &names,
        &emails,
    )
    .fetch_all(pool)
    .await?;
    
    Ok(created)
}
```

### Bulk Select with IN Clause

```rust
// ❌ N+1 pattern - avoid!
for id in ids {
    let user = sqlx::query_as!(User, "SELECT * FROM users WHERE id = $1", id)
        .fetch_one(pool)
        .await?;
}

// ✅ Single query with ANY
let users = sqlx::query_as!(User,
    "SELECT id, name, email, role, created_at FROM users WHERE id = ANY($1)",
    &ids
)
.fetch_all(pool)
.await?;
```

---

## Transactions

```rust
pub async fn transfer_funds(
    pool: &PgPool,
    from_id: Uuid,
    to_id: Uuid,
    amount: i64,
) -> Result<(), AppError> {
    let mut tx = pool.begin().await?;
    
    // Debit from source
    let from_balance = sqlx::query_scalar!(
        "UPDATE accounts SET balance = balance - $2 WHERE id = $1 RETURNING balance",
        from_id,
        amount
    )
    .fetch_one(&mut *tx)
    .await?;
    
    if from_balance < 0 {
        // Rollback on insufficient funds
        tx.rollback().await?;
        return Err(AppError::Validation("Insufficient funds".into()));
    }
    
    // Credit to destination
    sqlx::query!(
        "UPDATE accounts SET balance = balance + $2 WHERE id = $1",
        to_id,
        amount
    )
    .execute(&mut *tx)
    .await?;
    
    // Commit transaction
    tx.commit().await?;
    
    Ok(())
}
```

---

## Migrations

### Create Migration

```bash
# Install sqlx-cli
cargo install sqlx-cli --no-default-features --features postgres

# Create migration
sqlx migrate add create_users_table
```

### Migration File

```sql
-- migrations/20240101000000_create_users_table.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
```

### Run Migrations

```rust
// In code
sqlx::migrate!("./migrations")
    .run(&pool)
    .await?;

// CLI
sqlx migrate run
```

---

## Indexes

### Common Index Patterns

```sql
-- Primary lookup
CREATE INDEX idx_users_email ON users(email);

-- Composite for filtering + sorting
CREATE INDEX idx_posts_user_created ON posts(user_id, created_at DESC);

-- Partial index
CREATE INDEX idx_users_active ON users(email) WHERE is_active = true;

-- Full-text search
CREATE INDEX idx_posts_search ON posts USING gin(to_tsvector('english', title || ' ' || content));
```

### Query with Index Hints

```rust
// Force index scan (use sparingly)
let users = sqlx::query_as!(User,
    r#"
    SELECT id, name, email, role, created_at
    FROM users
    WHERE email = $1
    "#,
    email
)
.fetch_optional(pool)
.await?;
```

---

## JSON Handling

```rust
// Store JSON
#[derive(Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "jsonb")]
pub struct Metadata(serde_json::Value);

pub async fn update_metadata(
    pool: &PgPool,
    id: Uuid,
    metadata: serde_json::Value,
) -> Result<(), AppError> {
    sqlx::query!(
        "UPDATE users SET metadata = $2 WHERE id = $1",
        id,
        metadata
    )
    .execute(pool)
    .await?;
    
    Ok(())
}

// Query JSON fields
let users = sqlx::query_as!(User,
    r#"
    SELECT id, name, email, role, created_at
    FROM users
    WHERE metadata->>'country' = $1
    "#,
    country
)
.fetch_all(pool)
.await?;
```

---

## Enums

```sql
-- Create enum type
CREATE TYPE user_role AS ENUM ('admin', 'user', 'guest');
```

```rust
#[derive(Debug, Clone, Copy, sqlx::Type, Serialize, Deserialize)]
#[sqlx(type_name = "user_role", rename_all = "lowercase")]
pub enum Role {
    Admin,
    User,
    Guest,
}

// Query with enum
let admins = sqlx::query_as!(User,
    "SELECT id, name, email, role as \"role: Role\", created_at FROM users WHERE role = $1",
    Role::Admin as Role
)
.fetch_all(pool)
.await?;
```

---

## Connection Pool Best Practices

```rust
pub fn create_optimized_pool(database_url: &str) -> PgPoolOptions {
    PgPoolOptions::new()
        // Scale with CPU cores
        .max_connections((num_cpus::get() * 4) as u32)
        
        // Keep some connections warm
        .min_connections(2)
        
        // Fail fast if pool exhausted
        .acquire_timeout(Duration::from_secs(3))
        
        // Prevent stale connections
        .idle_timeout(Duration::from_secs(60 * 10))
        
        // Force reconnect periodically
        .max_lifetime(Duration::from_secs(60 * 30))
        
        // Test connections before use
        .test_before_acquire(true)
}
```

---

## Error Handling

```rust
impl From<sqlx::Error> for AppError {
    fn from(error: sqlx::Error) -> Self {
        match error {
            sqlx::Error::RowNotFound => {
                AppError::NotFound("Record not found".into())
            }
            sqlx::Error::Database(db_err) => {
                // Check for constraint violations
                if let Some(code) = db_err.code() {
                    match code.as_ref() {
                        "23505" => AppError::Conflict("Record already exists".into()),
                        "23503" => AppError::Validation("Foreign key violation".into()),
                        _ => {
                            tracing::error!("Database error: {:?}", db_err);
                            AppError::Database(sqlx::Error::Database(db_err))
                        }
                    }
                } else {
                    AppError::Database(sqlx::Error::Database(db_err))
                }
            }
            _ => {
                tracing::error!("Database error: {:?}", error);
                AppError::Database(error)
            }
        }
    }
}
```
