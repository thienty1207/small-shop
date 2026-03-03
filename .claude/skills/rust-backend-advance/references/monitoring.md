# Monitoring & Observability

Production monitoring patterns with tracing and Prometheus.

## Structured Logging with Tracing

### Setup

```rust
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

fn init_tracing() {
    tracing_subscriber::registry()
        .with(EnvFilter::try_from_default_env().unwrap_or_else(|_| {
            "my_app=debug,tower_http=debug,axum::rejection=trace".into()
        }))
        .with(tracing_subscriber::fmt::layer().json())
        .init();
}

// Or with OpenTelemetry
fn init_otel_tracing() {
    use opentelemetry::sdk::trace::Tracer;
    use tracing_opentelemetry::OpenTelemetryLayer;
    
    let tracer = opentelemetry_otlp::new_pipeline()
        .tracing()
        .with_exporter(opentelemetry_otlp::new_exporter().tonic())
        .install_batch(opentelemetry::runtime::Tokio)
        .expect("Failed to initialize tracer");
    
    tracing_subscriber::registry()
        .with(EnvFilter::from_default_env())
        .with(tracing_subscriber::fmt::layer())
        .with(OpenTelemetryLayer::new(tracer))
        .init();
}
```

### Request Tracing Middleware

```rust
use tower_http::trace::{TraceLayer, MakeSpan, OnRequest, OnResponse};
use tracing::{Level, Span};
use uuid::Uuid;

let tracing_layer = TraceLayer::new_for_http()
    .make_span_with(|request: &Request<Body>| {
        let request_id = request
            .headers()
            .get("x-request-id")
            .and_then(|v| v.to_str().ok())
            .map(|s| s.to_string())
            .unwrap_or_else(|| Uuid::new_v4().to_string());
        
        tracing::span!(
            Level::INFO,
            "http_request",
            method = %request.method(),
            uri = %request.uri(),
            request_id = %request_id,
        )
    })
    .on_request(|request: &Request<Body>, _span: &Span| {
        tracing::info!(
            headers = ?request.headers(),
            "started processing request"
        );
    })
    .on_response(|response: &Response<Body>, latency: Duration, _span: &Span| {
        tracing::info!(
            status = %response.status(),
            latency_ms = latency.as_millis(),
            "finished processing request"
        );
    })
    .on_failure(|error: ServerErrorsFailureClass, latency: Duration, _span: &Span| {
        tracing::error!(
            error = ?error,
            latency_ms = latency.as_millis(),
            "request failed"
        );
    });

let app = Router::new()
    .route("/", get(handler))
    .layer(tracing_layer);
```

### Instrumented Handlers

```rust
use tracing::instrument;

#[instrument(
    skip(pool),
    fields(user_id = %id)
)]
pub async fn get_user(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<Json<User>, AppError> {
    tracing::debug!("fetching user from database");
    
    let user = sqlx::query_as!(User, "SELECT * FROM users WHERE id = $1", id)
        .fetch_optional(&pool)
        .await?
        .ok_or(AppError::NotFound)?;
    
    tracing::info!(email = %user.email, "user found");
    Ok(Json(user))
}
```

---

## Prometheus Metrics

### Setup

```toml
[dependencies]
axum-prometheus = "0.6"
# or manual:
prometheus = "0.13"
```

### Using axum-prometheus

```rust
use axum_prometheus::PrometheusMetricLayer;

let (prometheus_layer, metric_handle) = PrometheusMetricLayer::pair();

let app = Router::new()
    .route("/", get(handler))
    .route("/metrics", get(|| async move { metric_handle.render() }))
    .layer(prometheus_layer);
```

### Custom Metrics

```rust
use prometheus::{
    Counter, Histogram, Gauge,
    register_counter, register_histogram, register_gauge,
    Encoder, TextEncoder,
};
use once_cell::sync::Lazy;

// Define metrics
static HTTP_REQUESTS_TOTAL: Lazy<Counter> = Lazy::new(|| {
    register_counter!(
        "http_requests_total",
        "Total number of HTTP requests"
    ).unwrap()
});

static HTTP_REQUEST_DURATION: Lazy<Histogram> = Lazy::new(|| {
    register_histogram!(
        "http_request_duration_seconds",
        "HTTP request duration in seconds",
        vec![0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0]
    ).unwrap()
});

static ACTIVE_CONNECTIONS: Lazy<Gauge> = Lazy::new(|| {
    register_gauge!(
        "active_connections",
        "Number of active connections"
    ).unwrap()
});

static DB_POOL_SIZE: Lazy<Gauge> = Lazy::new(|| {
    register_gauge!(
        "db_pool_size",
        "Database connection pool size"
    ).unwrap()
});

// Metrics middleware
async fn metrics_middleware(
    request: Request<Body>,
    next: Next,
) -> Response {
    HTTP_REQUESTS_TOTAL.inc();
    ACTIVE_CONNECTIONS.inc();
    
    let timer = HTTP_REQUEST_DURATION.start_timer();
    let response = next.run(request).await;
    timer.observe_duration();
    
    ACTIVE_CONNECTIONS.dec();
    
    response
}

// Metrics endpoint
async fn metrics_handler() -> String {
    let encoder = TextEncoder::new();
    let metric_families = prometheus::gather();
    let mut buffer = vec![];
    encoder.encode(&metric_families, &mut buffer).unwrap();
    String::from_utf8(buffer).unwrap()
}
```

### Business Metrics

```rust
static ORDERS_CREATED: Lazy<Counter> = Lazy::new(|| {
    register_counter!(
        "orders_created_total",
        "Total number of orders created"
    ).unwrap()
});

static ORDER_AMOUNT: Lazy<Histogram> = Lazy::new(|| {
    register_histogram!(
        "order_amount_dollars",
        "Order amount in dollars",
        vec![10.0, 25.0, 50.0, 100.0, 250.0, 500.0, 1000.0]
    ).unwrap()
});

pub async fn create_order(/* ... */) -> Result<Json<Order>, AppError> {
    let order = do_create_order().await?;
    
    // Record metrics
    ORDERS_CREATED.inc();
    ORDER_AMOUNT.observe(order.total as f64 / 100.0);
    
    Ok(Json(order))
}
```

---

## OpenTelemetry

### Full Setup

```toml
[dependencies]
opentelemetry = "0.21"
opentelemetry-otlp = { version = "0.14", features = ["tonic"] }
opentelemetry_sdk = { version = "0.21", features = ["rt-tokio"] }
tracing-opentelemetry = "0.22"
```

```rust
use opentelemetry::trace::TracerProvider;
use opentelemetry_otlp::WithExportConfig;
use opentelemetry_sdk::{runtime, trace as sdktrace, Resource};
use tracing_opentelemetry::OpenTelemetryLayer;

fn init_otel() -> sdktrace::TracerProvider {
    let exporter = opentelemetry_otlp::new_exporter()
        .tonic()
        .with_endpoint("http://jaeger:4317");
    
    let tracer_provider = opentelemetry_otlp::new_pipeline()
        .tracing()
        .with_exporter(exporter)
        .with_trace_config(
            sdktrace::Config::default()
                .with_resource(Resource::new(vec![
                    opentelemetry::KeyValue::new("service.name", "my-app"),
                    opentelemetry::KeyValue::new("service.version", env!("CARGO_PKG_VERSION")),
                ]))
        )
        .install_batch(runtime::Tokio)
        .expect("Failed to initialize tracer");
    
    tracer_provider
}

fn init_tracing() {
    let tracer_provider = init_otel();
    let tracer = tracer_provider.tracer("my-app");
    
    tracing_subscriber::registry()
        .with(EnvFilter::from_default_env())
        .with(tracing_subscriber::fmt::layer())
        .with(OpenTelemetryLayer::new(tracer))
        .init();
}
```

### Span Context

```rust
use tracing::Instrument;

pub async fn process_order(order_id: Uuid) -> Result<(), AppError> {
    let span = tracing::info_span!("process_order", order_id = %order_id);
    
    async {
        validate_order(order_id).await?;
        process_payment(order_id).await?;
        send_confirmation(order_id).await?;
        Ok(())
    }
    .instrument(span)
    .await
}

// Or with #[instrument]
#[instrument(skip(pool))]
async fn validate_order(pool: &PgPool, order_id: Uuid) -> Result<(), AppError> {
    tracing::info!("validating order");
    // ...
}
```

---

## Health and Readiness with Metrics

```rust
use std::sync::atomic::{AtomicBool, Ordering};

static IS_READY: AtomicBool = AtomicBool::new(false);

pub async fn startup(pool: PgPool) {
    // Run migrations
    sqlx::migrate!().run(&pool).await.unwrap();
    
    // Mark as ready
    IS_READY.store(true, Ordering::SeqCst);
    tracing::info!("application is ready");
}

async fn readiness() -> StatusCode {
    if IS_READY.load(Ordering::SeqCst) {
        StatusCode::OK
    } else {
        StatusCode::SERVICE_UNAVAILABLE
    }
}
```

---

## Database Metrics

```rust
// Track pool metrics
pub fn record_pool_metrics(pool: &PgPool) {
    let size = pool.size();
    let idle = pool.num_idle();
    
    DB_POOL_SIZE.set(size as f64);
    DB_POOL_IDLE.set(idle as f64);
}

// Query timing
static DB_QUERY_DURATION: Lazy<Histogram> = Lazy::new(|| {
    register_histogram!(
        "db_query_duration_seconds",
        "Database query duration"
    ).unwrap()
});

pub async fn timed_query<T, F>(query_fn: F) -> Result<T, AppError>
where
    F: Future<Output = Result<T, sqlx::Error>>,
{
    let timer = DB_QUERY_DURATION.start_timer();
    let result = query_fn.await;
    timer.observe_duration();
    result.map_err(Into::into)
}
```

---

## Alerting Patterns

```yaml
# Prometheus alert rules
groups:
  - name: my-app
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: High error rate detected
          
      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: High latency detected
          
      - alert: DatabaseConnectionPoolExhausted
        expr: db_pool_idle == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: Database connection pool exhausted
```

---

## Logging Best Practices

```rust
// Structured fields
tracing::info!(
    user_id = %user.id,
    email = %user.email,
    action = "user_created",
    "new user registered"
);

// Error logging with context
tracing::error!(
    error = ?err,
    order_id = %order_id,
    user_id = %user_id,
    "order processing failed"
);

// Don't log sensitive data
tracing::info!(
    email = %user.email,
    // password = %password,  // NEVER!
    "login attempt"
);

// Use log levels appropriately
tracing::trace!("very detailed");     // Development only
tracing::debug!("debugging info");    // Development
tracing::info!("normal operation");   // Production default
tracing::warn!("potential issue");    // Something concerning
tracing::error!("error occurred");    // Definite problem
```
