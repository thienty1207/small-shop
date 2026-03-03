---
name: production-readiness
description: >
  Comprehensive production readiness checklists and patterns. Health checks, graceful shutdown,
  observability, rollback strategies, and deployment verification. Multi-stack: Rust, Go, Python,
  Node.js. Use before every production deployment or major release.
---

# Production Readiness

The definitive checklist before going live. Every item here exists because someone shipped without it and got paged at 3AM.

## When to Use

- Before first production deployment
- Before major releases
- Quarterly production readiness reviews
- Post-incident follow-up verification
- New service onboarding

---

## Production Readiness Scorecard

```
Score each category 1-5. Minimum 3 in ALL categories before go-live.

┌──────────────────────────────┬───────┐
│ Category                     │ Score │
├──────────────────────────────┼───────┤
│ Health Checks & Monitoring   │  /5   │
│ Error Handling & Recovery    │  /5   │
│ Security & Auth              │  /5   │
│ Performance & Scaling        │  /5   │
│ Data & Backups               │  /5   │
│ Deployment & Rollback        │  /5   │
│ Documentation & Runbooks     │  /5   │
│ Testing & Validation         │  /5   │
├──────────────────────────────┼───────┤
│ TOTAL                        │  /40  │
└──────────────────────────────┴───────┘

24-32: Minimum viable. Ship with monitoring.
33-36: Good. Ship with confidence.
37-40: Excellent. Production-grade.
```

---

## 1. Health Checks

### Three Essential Endpoints

```
GET /health/live     → Am I running? (200 OK)
GET /health/ready    → Can I serve traffic? (200 OK / 503)
GET /health/startup  → Am I done initializing? (200 OK / 503)
```

### Multi-Stack Implementation

```rust
// Rust (Axum)
async fn liveness() -> StatusCode { StatusCode::OK }

async fn readiness(State(pool): State<PgPool>) -> StatusCode {
    match sqlx::query("SELECT 1").execute(&pool).await {
        Ok(_) => StatusCode::OK,
        Err(_) => StatusCode::SERVICE_UNAVAILABLE,
    }
}

fn health_routes() -> Router {
    Router::new()
        .route("/health/live", get(liveness))
        .route("/health/ready", get(readiness))
}
```

```go
// Go (Gin)
func liveness(c *gin.Context) { c.Status(200) }

func readiness(c *gin.Context) {
    if err := db.Ping(); err != nil {
        c.Status(503)
        return
    }
    c.Status(200)
}
```

```python
# Python (FastAPI)
@app.get("/health/live")
async def liveness():
    return {"status": "ok"}

@app.get("/health/ready")
async def readiness(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ready"}
    except Exception:
        raise HTTPException(status_code=503)
```

---

## 2. Graceful Shutdown

```
On SIGTERM / SIGINT:
├── 1. Stop accepting new connections
├── 2. Wait for in-flight requests (timeout: 30s)
├── 3. Close database connections
├── 4. Flush logs and metrics
├── 5. Exit with code 0
```

### Multi-Stack Implementation

```rust
// Rust (Axum + Tokio)
#[tokio::main]
async fn main() {
    let app = create_app().await;
    let listener = tokio::net::TcpListener::bind("0.0.0.0:8080").await.unwrap();
    
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await
        .unwrap();
}

async fn shutdown_signal() {
    tokio::signal::ctrl_c().await.unwrap();
    tracing::info!("Shutdown signal received, draining connections...");
}
```

```go
// Go
srv := &http.Server{Addr: ":8080", Handler: router}

go func() {
    sig := make(chan os.Signal, 1)
    signal.Notify(sig, syscall.SIGTERM, syscall.SIGINT)
    <-sig
    
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()
    srv.Shutdown(ctx)
}()

srv.ListenAndServe()
```

```python
# Python (FastAPI + uvicorn)
# uvicorn handles graceful shutdown by default with --timeout-graceful-shutdown 30
# Custom logic via event handlers:
@app.on_event("shutdown")
async def shutdown():
    await db.disconnect()
    logger.info("Graceful shutdown complete")
```

---

## 3. Error Handling & Logging

### Structured Logging

```
Every log entry MUST have:
├── timestamp (ISO 8601)
├── level (info, warn, error)
├── message (human-readable)
├── request_id (correlation)
├── service_name
└── context (user_id, endpoint, etc.)

Error logs MUST also have:
├── error.type (e.g., "DatabaseError")
├── error.message
├── error.stack (in debug)
└── error.code (application error code)
```

### Error Response Format

```json
{
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "User with ID 123 was not found",
    "request_id": "req_abc123"
  }
}
```

```
NEVER expose in production:
├── ❌ Stack traces
├── ❌ Database queries
├── ❌ Internal IP addresses
├── ❌ Framework versions
└── ❌ File paths
```

---

## 4. Performance Baselines

### Establish Before Launch

```
Measure and document:
├── p50 latency: ___ ms
├── p95 latency: ___ ms
├── p99 latency: ___ ms
├── Throughput: ___ req/s
├── Memory usage: ___ MB baseline
├── CPU usage: ___ % at normal load
└── Cold start time: ___ seconds

Load test at:
├── 1x expected traffic (baseline)
├── 2x expected traffic (growth)
├── 5x expected traffic (spike)
└── Sustained load for 1 hour (stability)
```

### Recommended Tools

```
├── Rust:    criterion (benchmarks), k6 (load test)
├── Go:      go test -bench, k6
├── Python:  locust, pytest-benchmark
├── Node.js: autocannon, k6
└── All:     k6, wrk, hey
```

---

## 5. Deployment & Rollback

### Deployment Checklist

```
PRE-DEPLOY:
├── [ ] All tests passing (CI green)
├── [ ] Database migrations tested
├── [ ] Feature flags configured
├── [ ] Environment variables set
├── [ ] Secrets rotated if needed
└── [ ] Changelog updated

DEPLOY:
├── [ ] Rolling deploy (not big-bang)
├── [ ] Canary: 5% → 25% → 50% → 100%
├── [ ] Monitor error rate during rollout
├── [ ] Health checks passing
└── [ ] Smoke tests passing

POST-DEPLOY:
├── [ ] Error rate stable (not increasing)
├── [ ] Latency stable (not increasing)
├── [ ] No new error types in logs
├── [ ] User-facing features verified
└── [ ] Rollback plan confirmed working
```

### Rollback Plan

```
ALWAYS have a rollback plan BEFORE deploying.

Rollback options:
├── Code rollback: Deploy previous version
├── Feature flag: Disable new feature
├── Database: Rollback migration (if reversible)
└── Config: Revert config change

Rollback criteria:
├── Error rate increases > 5%
├── p99 latency increases > 2x
├── Any data corruption detected
└── Security vulnerability discovered
```

---

## 6. Runbook Template

```markdown
# [Service Name] Runbook

## Service Overview
- **Purpose**: [What does it do?]
- **Owner**: [Team/person]
- **Dependencies**: [Database, Redis, other services]
- **Dashboard**: [Link to Grafana/Datadog]
- **Logs**: [Link to log aggregator]

## Common Issues

### High Error Rate
1. Check logs: `kubectl logs -f deploy/[service]`
2. Check database connection
3. Check dependency health
4. If unresolvable → rollback

### High Latency
1. Check database query performance
2. Check cache hit rate
3. Check connection pool exhaustion
4. Scale horizontally if needed

### Out of Memory
1. Check for memory leaks (trending up?)
2. Restart pods (temporary fix)
3. Increase memory limits if justified
4. Profile with heaptrack/pprof

## Escalation
- L1: On-call engineer (Slack #oncall)
- L2: Service owner
- L3: Platform team
```

---

## Master Checklist

### Tier 1: Must Have (Day 1)
- [ ] Health check endpoints (/live, /ready)
- [ ] Structured logging (JSON)
- [ ] Graceful shutdown
- [ ] Error responses (no stack traces)
- [ ] HTTPS enforced
- [ ] Basic monitoring (uptime)
- [ ] Rollback plan documented

### Tier 2: Should Have (Week 1)
- [ ] Request tracing (correlation IDs)
- [ ] Metrics (latency, throughput, errors)
- [ ] Alerting (error rate, latency)
- [ ] Performance baselines documented
- [ ] Rate limiting
- [ ] Dependency health checks
- [ ] Runbook created

### Tier 3: Nice to Have (Month 1)
- [ ] Distributed tracing (OpenTelemetry)
- [ ] SLOs/SLAs defined
- [ ] Chaos engineering tests
- [ ] Load testing in CI
- [ ] Cost monitoring
- [ ] Incident response drills

---

## Related Skills

- [backend-architect](../backend-architect/SKILL.md) — Architecture design
- [security-hardening](../security-hardening/SKILL.md) — Security checks
- [monitoring-observability](../monitoring-observability/SKILL.md) — Monitoring setup
- [devops](../devops/SKILL.md) — Deployment infrastructure
- [testing](../testing/SKILL.md) — Test strategies
