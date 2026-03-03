---
name: backend-architect
description: >
  System architecture for multi-stack backends. Design scalable APIs, microservices,
  event-driven systems, and distributed architectures. Covers Rust (Axum/Actix),
  Go (Gin/Fiber), Python (FastAPI/Django), and Node.js (Express/NestJS).
  Use when designing new services, defining boundaries, or planning system evolution.
---

# Backend Architecture

Production-ready system design patterns for multi-stack backend development.

## When to Use

- Designing new backend services or APIs
- Defining service boundaries and data contracts
- Planning microservices vs monolith vs modulith
- Choosing communication patterns (sync/async)
- Scaling and resilience planning

## When NOT to Use

- Code-level bug fixes → use `debugging`
- Frontend/UI work → use `nextjs-turborepo` or `mobile-dioxus`
- Infrastructure setup → use `devops`

---

## Architecture Decision Framework

### Step 1: Understand the Problem

```
BEFORE designing anything:
├── What problem are we solving?
├── How many users? (100? 10K? 1M?)
├── What are the non-functional requirements?
│   ├── Latency target? (< 100ms? < 500ms?)
│   ├── Availability? (99.9%? 99.99%?)
│   ├── Data consistency? (Strong? Eventual?)
│   └── Throughput? (100 rps? 10K rps?)
└── What's the team size and expertise?
```

### Step 2: Choose Architecture Style

```
MONOLITH vs MICROSERVICES vs MODULITH

Small team (1-5), single product:
└── ✅ Modular Monolith (Modulith)
    └── Scale later when needed

Medium team (5-20), multiple domains:
└── ✅ Modulith → Microservices migration
    └── Start with modules, extract services later

Large team (20+), independent domains:
└── ✅ Microservices from start
    └── Each team owns their service

⚠️ NEVER start with microservices for:
├── MVPs or prototypes
├── Teams under 5 people
└── Projects where domains are unclear
```

---

## API Design Patterns

### REST API Design

```
Resources (nouns, not verbs):
├── GET    /api/users          → List users
├── GET    /api/users/:id      → Get user
├── POST   /api/users          → Create user
├── PUT    /api/users/:id      → Replace user
├── PATCH  /api/users/:id      → Update user fields
└── DELETE /api/users/:id      → Delete user

Nested resources:
├── GET /api/users/:id/orders  → User's orders
└── GET /api/orders/:id        → Single order (top-level)

Avoid:
├── ❌ GET /api/getUsers
├── ❌ POST /api/createUser
└── ❌ GET /api/users/delete/:id
```

### Multi-Stack Implementation

#### Rust (Axum) — 60%

```rust
use axum::{Router, routing::get, extract::Path, Json};
use serde::{Deserialize, Serialize};

#[derive(Serialize)]
struct User { id: i64, name: String, email: String }

async fn get_user(Path(id): Path<i64>) -> Json<User> {
    let user = db::find_user(id).await.unwrap();
    Json(user)
}

async fn list_users() -> Json<Vec<User>> {
    let users = db::all_users().await.unwrap();
    Json(users)
}

fn routes() -> Router {
    Router::new()
        .route("/api/users", get(list_users))
        .route("/api/users/:id", get(get_user))
}
```

#### Go (Gin) — 15%

```go
func getUser(c *gin.Context) {
    id := c.Param("id")
    user, err := db.FindUser(id)
    if err != nil {
        c.JSON(404, gin.H{"error": "not found"})
        return
    }
    c.JSON(200, user)
}

func setupRoutes(r *gin.Engine) {
    api := r.Group("/api")
    api.GET("/users", listUsers)
    api.GET("/users/:id", getUser)
    api.POST("/users", createUser)
}
```

#### Python (FastAPI) — 15%

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()

class User(BaseModel):
    id: int
    name: str
    email: str

@app.get("/api/users/{user_id}")
async def get_user(user_id: int) -> User:
    user = await db.find_user(user_id)
    if not user:
        raise HTTPException(status_code=404)
    return user
```

#### Node.js (Express) — 10%

```javascript
const express = require('express');
const router = express.Router();

router.get('/api/users/:id', async (req, res) => {
  const user = await db.findUser(req.params.id);
  if (!user) return res.status(404).json({ error: 'not found' });
  res.json(user);
});
```

---

## Microservices Patterns

### Service Boundaries (DDD)

```
Bounded Context = Service Boundary

E-Commerce Example:
├── User Service (auth, profiles)
├── Product Service (catalog, inventory)
├── Order Service (checkout, order management)
├── Payment Service (billing, refunds)
└── Notification Service (email, push, SMS)

Each service:
├── Owns its database (no sharing!)
├── Communicates via API or events
├── Can be deployed independently
└── Has its own CI/CD pipeline
```

### Communication Patterns

```
SYNCHRONOUS (Request/Response):
├── REST API calls between services
├── gRPC for internal service calls
└── Use when: Need immediate response

ASYNCHRONOUS (Event-Driven):
├── Message queues (RabbitMQ, NATS)
├── Event streaming (Kafka, Pulsar)
└── Use when: Fire-and-forget, eventual consistency

HYBRID (Production standard):
├── Sync for reads (GET user profile)
├── Async for writes (place order → event)
└── Event sourcing for audit trails
```

### Saga Pattern (Distributed Transactions)

```
Order Placement Saga:

1. Order Service → Create order (PENDING)
2. Payment Service → Charge card
   ├── Success → next step
   └── Failure → Cancel order (COMPENSATE)
3. Inventory Service → Reserve items
   ├── Success → next step
   └── Failure → Refund payment + Cancel order
4. Notification Service → Send confirmation
5. Order status → CONFIRMED
```

---

## Resilience Patterns

### Circuit Breaker

```
States:
├── CLOSED  → Normal operation (requests pass through)
├── OPEN    → Failure threshold exceeded (fail fast)
└── HALF-OPEN → Test if service recovered

Config:
├── Failure threshold: 5 failures in 30 seconds
├── Open duration: 60 seconds
├── Half-open: Allow 1 test request
└── Success threshold: 3 consecutive successes
```

#### Multi-Stack Circuit Breaker

```rust
// Rust: tower middleware
use tower::layer::Layer;
use tower::ServiceBuilder;

let service = ServiceBuilder::new()
    .rate_limit(100, Duration::from_secs(1))
    .timeout(Duration::from_secs(5))
    .retry(RetryPolicy::new(3))
    .service(my_service);
```

```go
// Go: sony/gobreaker
cb := gobreaker.NewCircuitBreaker(gobreaker.Settings{
    Name:        "payment-service",
    MaxRequests: 3,
    Interval:    30 * time.Second,
    Timeout:     60 * time.Second,
})
result, err := cb.Execute(func() (interface{}, error) {
    return callPaymentService()
})
```

```python
# Python: pybreaker
import pybreaker
breaker = pybreaker.CircuitBreaker(fail_max=5, reset_timeout=60)

@breaker
async def call_payment_service():
    return await httpx.post(PAYMENT_URL, json=data)
```

### Retry with Exponential Backoff

```
Attempt 1: immediate
Attempt 2: wait 1s  (+ random jitter 0-500ms)
Attempt 3: wait 2s  (+ random jitter 0-500ms)
Attempt 4: wait 4s  (+ random jitter 0-500ms)
Attempt 5: give up → circuit breaker opens

ALWAYS add jitter to prevent thundering herd!
```

### Health Checks

```
Three types:
├── Liveness:  "Is the process alive?" → /health/live
├── Readiness: "Can it serve traffic?" → /health/ready
└── Startup:   "Has it finished init?"  → /health/startup

Readiness checks should verify:
├── Database connection
├── Cache connection
├── External service connectivity
└── Required config loaded
```

---

## Performance Architecture

### Caching Layers

```
Request flow:
Client → CDN → API Gateway Cache → App Cache → Database

Cache strategies:
├── Cache-Aside:     App manages cache (most common)
├── Write-Through:   Write to cache AND db
├── Write-Behind:    Write to cache, async to db
└── Read-Through:    Cache fetches from db on miss
```

### Database Scaling

```
READ-heavy workload:
└── Read replicas + connection pooling

WRITE-heavy workload:
└── Horizontal sharding by tenant/region

MIXED workload:
└── CQRS: Separate read/write models
    ├── Write model: normalized, transactional
    └── Read model: denormalized, fast queries
```

---

## Best Practices

### Architecture Checklist

**Before Every New Service:**
- [ ] Problem clearly defined
- [ ] Non-functional requirements documented
- [ ] Architecture style chosen with rationale
- [ ] API contract designed (OpenAPI/protobuf)
- [ ] Database schema planned
- [ ] Error handling strategy defined
- [ ] Observability planned (logs, metrics, traces)

**Before Production:**
- [ ] Health checks implemented
- [ ] Circuit breakers configured
- [ ] Rate limiting in place
- [ ] Graceful shutdown handled
- [ ] Rollback strategy documented
- [ ] Load tested at 2x expected traffic
- [ ] Runbook created for on-call

---

## Related Skills

- [rust-backend-advance](../rust-backend-advance/SKILL.md) — Rust implementation patterns
- [databases](../databases/SKILL.md) — Database design
- [security-hardening](../security-hardening/SKILL.md) — Security architecture
- [production-readiness](../production-readiness/SKILL.md) — Production checklists
- [architecture-decision-records](../architecture-decision-records/SKILL.md) — Documenting decisions
