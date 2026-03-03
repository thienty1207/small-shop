# Rust Patterns for Backend Development

Idiomatic Rust patterns optimized for backend development with Axum.

## Data Structure Design

### Enums Over Boolean Flags

Model state explicitly using enums instead of multiple boolean fields:

```rust
// ✅ Preferred - explicit state machine
enum JobState {
    Pending { scheduled_for: DateTime<Utc> },
    Running { started_at: DateTime<Utc>, worker: String },
    Completed { result: JobResult, duration_ms: i64 },
    Failed { error: String, retries: u32 },
}

// ❌ Avoid - ambiguous state
struct Job {
    is_pending: bool,
    is_running: bool,
    is_completed: bool,
}
```

### Ownership Considerations

Choose ownership based on usage:

```rust
// Reference when borrowing is sufficient
fn process(name: &str) { ... }

// String when ownership is needed
fn store(name: String) { ... }

// Arc for sharing across threads (common in Axum state)
use std::sync::Arc;
let config = Arc::new(load_config());

// Cow for flexible ownership
use std::borrow::Cow;
fn greet(name: Cow<'_, str>) -> String {
    format!("Hello, {}!", name)
}
```

---

## Iterator Patterns

Prefer functional iterator chains over imperative loops:

```rust
// ✅ Preferred - declarative, chainable
let results: Vec<_> = items
    .iter()
    .filter(|item| item.is_valid())
    .map(|item| item.transform())
    .collect();

// ❌ Avoid - imperative
let mut results = Vec::new();
for item in items.iter() {
    if item.is_valid() {
        results.push(item.transform());
    }
}
```

### Common Iterator Patterns

```rust
// Filter and collect
let active: Vec<_> = users.iter().filter(|u| u.is_active).collect();

// Find first match
let admin = users.iter().find(|u| u.role == Role::Admin);

// Transform with fallible operation
let parsed: Result<Vec<_>, _> = strings.iter().map(|s| s.parse::<i32>()).collect();

// Partition into two groups
let (passed, failed): (Vec<_>, Vec<_>) = results.into_iter().partition(|r| r.is_ok());

// Fold/reduce
let total: i32 = orders.iter().map(|o| o.amount).sum();
```

---

## Error Handling

### The Result Pattern

```rust
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Not found: {0}")]
    NotFound(String),
    
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),
    
    #[error("Validation error: {0}")]
    Validation(String),
    
    #[error("Unauthorized")]
    Unauthorized,
}

// Use ? operator for propagation
async fn get_user(pool: &PgPool, id: Uuid) -> Result<User, AppError> {
    let user = sqlx::query_as!(User, "SELECT id, name, email FROM users WHERE id = $1", id)
        .fetch_optional(pool)
        .await?
        .ok_or_else(|| AppError::NotFound("User not found".into()))?;
    Ok(user)
}
```

### let-else For Early Returns

```rust
// ✅ Clean early return with let-else
let Some(config) = get_config() else {
    return Err(AppError::Configuration("Missing config".into()));
};

let Ok(parsed) = input.parse::<i32>() else {
    return Err(AppError::Validation("Invalid number".into()));
};
```

### Never Panic in Library Code

```rust
// ❌ Avoid - panics in production
let value = map.get("key").unwrap();

// ✅ Preferred - handle absence
let value = map.get("key").ok_or(AppError::NotFound("key"))?;

// ✅ OK when compile-time guaranteed
let regex = Regex::new(r"^\d+$").unwrap(); // Static regex, always valid
```

---

## Early Returns

Return early to avoid deep nesting:

```rust
// ✅ Preferred - flat structure
async fn process_request(req: Request) -> Result<Response, AppError> {
    let Some(auth) = req.headers().get("Authorization") else {
        return Err(AppError::Unauthorized);
    };
    
    let claims = validate_token(auth)?;
    
    if !claims.has_permission("write") {
        return Err(AppError::Forbidden);
    }
    
    // Main logic at the end, not nested
    execute_action(claims).await
}

// ❌ Avoid - pyramid of doom
async fn process_request(req: Request) -> Result<Response, AppError> {
    if let Some(auth) = req.headers().get("Authorization") {
        if let Ok(claims) = validate_token(auth) {
            if claims.has_permission("write") {
                execute_action(claims).await
            } else {
                Err(AppError::Forbidden)
            }
        } else {
            Err(AppError::Unauthorized)
        }
    } else {
        Err(AppError::Unauthorized)
    }
}
```

---

## Variable Shadowing

Shadow variables instead of creating numbered names:

```rust
// ✅ Preferred - shadow with same name
let data = fetch_raw_data().await?;
let data = parse(data)?;
let data = validate(data)?;

// ❌ Avoid - numbered variables
let raw_data = fetch_raw_data().await?;
let parsed_data = parse(raw_data)?;
let validated_data = validate(parsed_data)?;
```

---

## Impl Block Organization

```rust
struct UserService {
    pool: PgPool,
}

impl UserService {
    // 1. Constructors first
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
    
    // 2. Getters
    pub fn pool(&self) -> &PgPool {
        &self.pool
    }
    
    // 3. Query methods
    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<User>, AppError> {
        // ...
    }
    
    // 4. Mutation methods
    pub async fn create(&self, input: CreateUser) -> Result<User, AppError> {
        // ...
    }
    
    pub async fn update(&self, id: Uuid, input: UpdateUser) -> Result<User, AppError> {
        // ...
    }
    
    pub async fn delete(&self, id: Uuid) -> Result<(), AppError> {
        // ...
    }
}
```

---

## Pattern Matching

### Explicit Matching

```rust
// ✅ Explicit - compiler catches missing variants
match status {
    Status::Pending => handle_pending(),
    Status::Running => handle_running(),
    Status::Completed => handle_completed(),
    Status::Failed => handle_failed(),
}

// Use wildcards strategically for fallback
match result {
    Ok(value) => process(value),
    Err(_) => default_value(), // When error details don't matter
}
```

### Destructuring in Function Parameters

```rust
// ✅ Preferred in Axum handlers
async fn create_user(
    State(pool): State<PgPool>,
    Json(input): Json<CreateUserInput>,
) -> Result<Json<User>, AppError> {
    // Direct access to pool and input
}

// ❌ Avoid
async fn create_user(
    state: State<PgPool>,
    json: Json<CreateUserInput>,
) -> Result<Json<User>, AppError> {
    let State(pool) = state;
    let Json(input) = json;
    // ...
}
```

---

## Trait Implementations

### From/Into for Conversions

```rust
// Database model to API response
impl From<DbUser> for UserResponse {
    fn from(db: DbUser) -> Self {
        Self {
            id: db.id,
            name: db.name,
            email: db.email,
            created_at: db.created_at,
        }
    }
}

// Usage
let response: UserResponse = db_user.into();
let response = UserResponse::from(db_user);
```

### TryFrom for Fallible Conversions

```rust
impl TryFrom<String> for Role {
    type Error = AppError;
    
    fn try_from(s: String) -> Result<Self, Self::Error> {
        match s.as_str() {
            "admin" => Ok(Role::Admin),
            "user" => Ok(Role::User),
            _ => Err(AppError::Validation(format!("Invalid role: {}", s))),
        }
    }
}
```

### Derive Macros

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: Uuid,
    pub name: String,
    pub email: String,
}

// For database operations
#[derive(Debug, sqlx::FromRow)]
pub struct DbUser {
    pub id: Uuid,
    pub name: String,
    pub email: String,
    pub created_at: DateTime<Utc>,
}
```

---

## Module Visibility

```rust
// Prefer restricted visibility
pub(crate) fn internal_helper() { ... }

// Only pub for external API
pub fn create_user(...) -> Result<User> { ... }

// Private by default
fn validate_input(...) { ... }
```

---

## Serde Optimizations

```rust
#[derive(Serialize, Deserialize)]
pub struct User {
    #[serde(rename = "userId")]
    pub id: Uuid,
    
    #[serde(default)]
    pub role: Role,
    
    #[serde(skip_serializing_if = "Option::is_none")]
    pub avatar_url: Option<String>,
    
    #[serde(skip_serializing_if = "Vec::is_empty", default)]
    pub tags: Vec<String>,
}
```

### Zero-Copy Deserialization

```rust
#[derive(Deserialize)]
pub struct CreateUserInput<'a> {
    #[serde(borrow)]
    pub name: Cow<'a, str>,
    
    #[serde(borrow)]
    pub email: &'a str,
}
```

---

## JSON Handling

```rust
use serde_json::{Value, value::RawValue};

// For pass-through JSON (store/forward without parsing)
pub struct Job {
    pub id: Uuid,
    pub args: Option<Box<RawValue>>, // No parse overhead
}

// For inspecting/modifying JSON
let mut value: Value = serde_json::from_str(&json)?;
if let Some(obj) = value.as_object_mut() {
    obj.insert("processed".into(), true.into());
}
```

---

## Documentation

- Doc comments (`///`) only on public items
- No inline comments for obvious code
- Let code be self-documenting through naming
- No TODO/FIXME in committed code

```rust
/// Creates a new user with the given input.
///
/// # Errors
/// Returns `AppError::Validation` if email is invalid.
/// Returns `AppError::Conflict` if email already exists.
pub async fn create_user(input: CreateUser) -> Result<User, AppError> {
    // Implementation - no comments needed if clear
}
```
