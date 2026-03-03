# Architecture Patterns

Scalable architecture patterns for Rust backends.

## Modulith (Modular Monolith)

Start with a modulith, split to microservices when needed.

### Structure

```
my-app/
├── Cargo.toml              # Workspace
├── crates/
│   ├── api/                # HTTP layer
│   │   └── src/
│   │       ├── main.rs
│   │       └── routes/
│   │
│   ├── users/              # Users module
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── service.rs
│   │       ├── repository.rs
│   │       └── models.rs
│   │
│   ├── posts/              # Posts module
│   │   └── src/
│   │       └── lib.rs
│   │
│   └── shared/             # Shared types
│       └── src/
│           ├── lib.rs
│           ├── error.rs
│           └── config.rs
```

### Workspace Cargo.toml

```toml
[workspace]
members = [
    "crates/api",
    "crates/users",
    "crates/posts",
    "crates/shared",
]

[workspace.dependencies]
axum = "0.7"
tokio = { version = "1", features = ["full"] }
sqlx = { version = "0.7", features = ["runtime-tokio", "postgres"] }
serde = { version = "1", features = ["derive"] }
```

### Module Boundaries

```rust
// crates/users/src/lib.rs
pub mod models;
pub mod service;
mod repository; // Private implementation

// Public API
pub use models::{User, CreateUserInput};
pub use service::UserService;

// crates/api/src/routes/users.rs
use users::{User, CreateUserInput, UserService};
```

---

## Hexagonal Architecture (Ports & Adapters)

Isolate business logic from infrastructure.

```
domain/           # Core business logic (no dependencies)
├── entities/
├── services/
└── ports/        # Interfaces (traits)

adapters/         # Infrastructure implementations
├── http/         # Axum handlers
├── db/           # SQLx repositories
└── external/     # External APIs

application/      # Use cases, orchestration
```

### Domain Layer

```rust
// domain/ports/repository.rs
use async_trait::async_trait;

#[async_trait]
pub trait UserRepository: Send + Sync {
    async fn find_by_id(&self, id: Uuid) -> Result<Option<User>, DomainError>;
    async fn save(&self, user: &User) -> Result<(), DomainError>;
    async fn delete(&self, id: Uuid) -> Result<(), DomainError>;
}

// domain/services/user_service.rs
pub struct UserDomainService<R: UserRepository> {
    repo: R,
}

impl<R: UserRepository> UserDomainService<R> {
    pub async fn create_user(&self, input: CreateUser) -> Result<User, DomainError> {
        // Pure business logic - no infrastructure concerns
        let user = User::new(input.name, input.email)?;
        self.repo.save(&user).await?;
        Ok(user)
    }
}
```

### Adapter Layer

```rust
// adapters/db/postgres_user_repo.rs
pub struct PostgresUserRepository {
    pool: PgPool,
}

#[async_trait]
impl UserRepository for PostgresUserRepository {
    async fn find_by_id(&self, id: Uuid) -> Result<Option<User>, DomainError> {
        let row = sqlx::query_as!(DbUser, "SELECT * FROM users WHERE id = $1", id)
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| DomainError::Infrastructure(e.to_string()))?;
        
        Ok(row.map(User::from))
    }
}
```

---

## CQRS (Command Query Responsibility Segregation)

Separate read and write paths for complex domains.

### Command Side (Write)

```rust
// commands/create_user.rs
pub struct CreateUserCommand {
    pub name: String,
    pub email: String,
}

pub struct CreateUserHandler {
    repo: Arc<dyn UserRepository>,
    event_bus: Arc<dyn EventBus>,
}

impl CreateUserHandler {
    pub async fn handle(&self, cmd: CreateUserCommand) -> Result<Uuid, AppError> {
        let user = User::new(cmd.name, cmd.email)?;
        self.repo.save(&user).await?;
        
        // Publish event for read side
        self.event_bus.publish(UserCreated {
            id: user.id,
            name: user.name.clone(),
            email: user.email.clone(),
        }).await?;
        
        Ok(user.id)
    }
}
```

### Query Side (Read)

```rust
// queries/get_user.rs
pub struct GetUserQuery {
    pub id: Uuid,
}

pub struct GetUserHandler {
    read_db: PgPool, // Can be different DB optimized for reads
}

impl GetUserHandler {
    pub async fn handle(&self, query: GetUserQuery) -> Result<UserView, AppError> {
        // Query from read-optimized view/materialized view
        let view = sqlx::query_as!(UserView,
            "SELECT * FROM user_views WHERE id = $1",
            query.id
        )
        .fetch_optional(&self.read_db)
        .await?
        .ok_or(AppError::NotFound)?;
        
        Ok(view)
    }
}
```

---

## Event-Driven Architecture

### Event Types

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum DomainEvent {
    UserCreated { id: Uuid, email: String },
    UserUpdated { id: Uuid },
    UserDeleted { id: Uuid },
    OrderPlaced { id: Uuid, user_id: Uuid, total: i64 },
}
```

### Event Bus

```rust
use tokio::sync::broadcast;

pub struct EventBus {
    sender: broadcast::Sender<DomainEvent>,
}

impl EventBus {
    pub fn new() -> Self {
        let (sender, _) = broadcast::channel(1000);
        Self { sender }
    }
    
    pub fn publish(&self, event: DomainEvent) -> Result<(), AppError> {
        self.sender.send(event)
            .map_err(|_| AppError::Internal("Event publish failed".into()))?;
        Ok(())
    }
    
    pub fn subscribe(&self) -> broadcast::Receiver<DomainEvent> {
        self.sender.subscribe()
    }
}
```

### Event Handler

```rust
pub async fn start_event_processor(event_bus: Arc<EventBus>, pool: PgPool) {
    let mut receiver = event_bus.subscribe();
    
    loop {
        match receiver.recv().await {
            Ok(event) => {
                if let Err(e) = handle_event(&pool, event).await {
                    tracing::error!("Event processing error: {:?}", e);
                }
            }
            Err(broadcast::error::RecvError::Lagged(n)) => {
                tracing::warn!("Missed {} events", n);
            }
            Err(broadcast::error::RecvError::Closed) => break,
        }
    }
}

async fn handle_event(pool: &PgPool, event: DomainEvent) -> Result<(), AppError> {
    match event {
        DomainEvent::UserCreated { id, email } => {
            // Update read model, send welcome email, etc.
            sqlx::query!(
                "INSERT INTO user_views (id, email, created_at) VALUES ($1, $2, NOW())",
                id, email
            )
            .execute(pool)
            .await?;
        }
        // Handle other events...
        _ => {}
    }
    Ok(())
}
```

---

## Repository Pattern

Abstract database operations:

```rust
#[async_trait]
pub trait Repository<T, Id> {
    async fn find_by_id(&self, id: Id) -> Result<Option<T>, AppError>;
    async fn find_all(&self) -> Result<Vec<T>, AppError>;
    async fn save(&self, entity: &T) -> Result<(), AppError>;
    async fn delete(&self, id: Id) -> Result<(), AppError>;
}

// Generic implementation
pub struct PostgresRepository<T> {
    pool: PgPool,
    _marker: PhantomData<T>,
}

// Specific implementation
impl Repository<User, Uuid> for PostgresRepository<User> {
    async fn find_by_id(&self, id: Uuid) -> Result<Option<User>, AppError> {
        // Implementation
    }
}
```

---

## Service Layer

Orchestrate business operations:

```rust
pub struct OrderService {
    user_repo: Arc<dyn UserRepository>,
    order_repo: Arc<dyn OrderRepository>,
    payment_service: Arc<dyn PaymentService>,
    event_bus: Arc<EventBus>,
}

impl OrderService {
    pub async fn place_order(&self, user_id: Uuid, items: Vec<OrderItem>) -> Result<Order, AppError> {
        // 1. Validate user exists
        let user = self.user_repo.find_by_id(user_id).await?
            .ok_or(AppError::NotFound("User not found".into()))?;
        
        // 2. Calculate total
        let total = items.iter().map(|i| i.price * i.quantity).sum();
        
        // 3. Process payment
        let payment = self.payment_service.charge(user_id, total).await?;
        
        // 4. Create order
        let order = Order::new(user_id, items, payment.id);
        self.order_repo.save(&order).await?;
        
        // 5. Publish event
        self.event_bus.publish(DomainEvent::OrderPlaced {
            id: order.id,
            user_id,
            total,
        })?;
        
        Ok(order)
    }
}
```

---

## Dependency Injection

### Manual DI with Traits

```rust
// Define traits in domain layer
#[async_trait]
pub trait EmailService: Send + Sync {
    async fn send(&self, to: &str, subject: &str, body: &str) -> Result<(), AppError>;
}

// Implementation in adapter layer
pub struct SmtpEmailService {
    smtp_url: String,
}

#[async_trait]
impl EmailService for SmtpEmailService {
    async fn send(&self, to: &str, subject: &str, body: &str) -> Result<(), AppError> {
        // SMTP implementation
        Ok(())
    }
}

// Composition in main/state
let email_service: Arc<dyn EmailService> = Arc::new(SmtpEmailService::new(&config.smtp_url));

let state = AppState {
    db: pool,
    email_service,
};
```

---

## Error Handling Across Layers

```rust
// Domain errors
#[derive(Debug, thiserror::Error)]
pub enum DomainError {
    #[error("Validation error: {0}")]
    Validation(String),
    
    #[error("Business rule violation: {0}")]
    BusinessRule(String),
}

// Infrastructure errors
#[derive(Debug, thiserror::Error)]
pub enum InfraError {
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),
    
    #[error("External service error: {0}")]
    ExternalService(String),
}

// Application error (combines all)
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error(transparent)]
    Domain(#[from] DomainError),
    
    #[error(transparent)]
    Infra(#[from] InfraError),
    
    #[error("Not found: {0}")]
    NotFound(String),
    
    #[error("Unauthorized")]
    Unauthorized,
}
```
