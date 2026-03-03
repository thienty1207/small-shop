# Monitoring & Observability

> Tracing, metrics, logging, and alerting across multiple stacks.


## Metadata
- **Category:** operations
- **Scope:** Backend (Rust 60%, Go 15%, Python 15%, Node.js 10%)
- **Complexity:** Intermediate
- **Maturity:** Stable

## Overview

Observability encompasses the three pillars: **Logs** (events), **Metrics** (measurements), and **Traces** (request flows).

### Observability Stack

| Component | Tools |
|-----------|-------|
| **Logs** | Loki, Elasticsearch, CloudWatch |
| **Metrics** | Prometheus, Datadog, CloudWatch |
| **Traces** | Jaeger, Tempo, Honeycomb |
| **All-in-One** | Grafana Cloud, Datadog, New Relic |

### OpenTelemetry

OpenTelemetry (OTel) is the standard for collecting telemetry data across all stacks.

## Quick Start

### Rust - tracing + OpenTelemetry

```rust
// Cargo.toml
// tracing = "0.1"
// tracing-subscriber = { version = "0.3", features = ["env-filter"] }
// tracing-opentelemetry = "0.22"
// opentelemetry = "0.21"
// opentelemetry-otlp = "0.14"

use tracing::{info, instrument, span, Level};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

pub fn init_telemetry() -> Result<(), Box<dyn std::error::Error>> {
    // OTLP exporter
    let tracer = opentelemetry_otlp::new_pipeline()
        .tracing()
        .with_exporter(opentelemetry_otlp::new_exporter().tonic())
        .with_trace_config(
            opentelemetry_sdk::trace::config()
                .with_resource(opentelemetry_sdk::Resource::new(vec![
                    opentelemetry::KeyValue::new("service.name", "my-service"),
                ]))
        )
        .install_batch(opentelemetry_sdk::runtime::Tokio)?;
    
    let telemetry = tracing_opentelemetry::layer().with_tracer(tracer);
    
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::from_default_env())
        .with(tracing_subscriber::fmt::layer().json())
        .with(telemetry)
        .init();
    
    Ok(())
}

// Instrument functions automatically
#[instrument(skip(pool), fields(user_id = %user_id))]
pub async fn get_user(pool: &PgPool, user_id: &str) -> Result<User, Error> {
    info!("Fetching user");
    
    let user = sqlx::query_as!(User, "SELECT * FROM users WHERE id = $1", user_id)
        .fetch_optional(pool)
        .await?
        .ok_or(Error::NotFound)?;
    
    info!(user_name = %user.name, "User found");
    Ok(user)
}

// Manual spans
async fn process_order(order: Order) -> Result<(), Error> {
    let span = span!(Level::INFO, "process_order", order_id = %order.id);
    let _guard = span.enter();
    
    info!("Processing order");
    
    // Child span
    let payment_span = span!(Level::INFO, "process_payment");
    let _payment_guard = payment_span.enter();
    process_payment(&order).await?;
    
    Ok(())
}
```

### Rust - Prometheus Metrics

```rust
// Cargo.toml: metrics = "0.21", metrics-exporter-prometheus = "0.12"

use axum::{routing::get, Router};
use metrics::{counter, gauge, histogram};
use metrics_exporter_prometheus::PrometheusBuilder;

pub fn setup_metrics() -> PrometheusHandle {
    PrometheusBuilder::new()
        .install_recorder()
        .expect("Failed to install Prometheus recorder")
}

// Metrics middleware
pub async fn metrics_middleware(
    request: Request,
    next: Next,
) -> Response {
    let path = request.uri().path().to_string();
    let method = request.method().to_string();
    
    let start = std::time::Instant::now();
    let response = next.run(request).await;
    let duration = start.elapsed();
    
    // Record metrics
    histogram!("http_request_duration_seconds", "path" => path.clone(), "method" => method.clone())
        .record(duration.as_secs_f64());
    
    counter!("http_requests_total", "path" => path, "method" => method, "status" => response.status().as_str().to_string())
        .increment(1);
    
    response
}

// Expose /metrics endpoint
async fn metrics_handler(State(handle): State<PrometheusHandle>) -> String {
    handle.render()
}

// Custom metrics
fn record_business_metrics(order: &Order) {
    counter!("orders_total", "status" => order.status.to_string()).increment(1);
    histogram!("order_value_usd").record(order.total as f64);
    gauge!("active_users").set(get_active_user_count() as f64);
}
```

### Go - OpenTelemetry

```go
import (
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
    "go.opentelemetry.io/otel/sdk/trace"
    "go.opentelemetry.io/contrib/instrumentation/github.com/gofiber/fiber/otelfiber"
)

func InitTelemetry(ctx context.Context) (*trace.TracerProvider, error) {
    exporter, err := otlptracegrpc.New(ctx)
    if err != nil {
        return nil, err
    }
    
    tp := trace.NewTracerProvider(
        trace.WithBatcher(exporter),
        trace.WithResource(resource.NewWithAttributes(
            semconv.ServiceName("my-service"),
        )),
    )
    
    otel.SetTracerProvider(tp)
    return tp, nil
}

// Fiber middleware
app.Use(otelfiber.Middleware())

// Manual tracing
func GetUser(ctx context.Context, userID string) (*User, error) {
    tracer := otel.Tracer("user-service")
    ctx, span := tracer.Start(ctx, "GetUser")
    defer span.End()
    
    span.SetAttributes(attribute.String("user.id", userID))
    
    // ... fetch user
    
    return user, nil
}
```

### Go - Prometheus

```go
import (
    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promhttp"
)

var (
    httpRequestsTotal = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "http_requests_total",
            Help: "Total HTTP requests",
        },
        []string{"method", "path", "status"},
    )
    
    httpRequestDuration = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "http_request_duration_seconds",
            Help:    "HTTP request duration",
            Buckets: prometheus.DefBuckets,
        },
        []string{"method", "path"},
    )
)

func init() {
    prometheus.MustRegister(httpRequestsTotal, httpRequestDuration)
}

// /metrics endpoint
http.Handle("/metrics", promhttp.Handler())
```

### Python - OpenTelemetry

```python
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

def init_telemetry():
    provider = TracerProvider()
    processor = BatchSpanProcessor(OTLPSpanExporter())
    provider.add_span_processor(processor)
    trace.set_tracer_provider(provider)

# Auto-instrument FastAPI
FastAPIInstrumentor.instrument_app(app)

# Manual tracing
tracer = trace.get_tracer(__name__)

@tracer.start_as_current_span("get_user")
def get_user(user_id: str):
    span = trace.get_current_span()
    span.set_attribute("user.id", user_id)
    # ... fetch user
```

### Python - Prometheus

```python
from prometheus_client import Counter, Histogram, generate_latest
from fastapi import Response

REQUEST_COUNT = Counter('http_requests_total', 'Total requests', ['method', 'path', 'status'])
REQUEST_LATENCY = Histogram('http_request_duration_seconds', 'Request latency', ['method', 'path'])

@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration = time.time() - start
    
    REQUEST_COUNT.labels(request.method, request.url.path, response.status_code).inc()
    REQUEST_LATENCY.labels(request.method, request.url.path).observe(duration)
    
    return response

@app.get("/metrics")
def metrics():
    return Response(generate_latest(), media_type="text/plain")
```

### Node.js - OpenTelemetry

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter(),
  instrumentations: [getNodeAutoInstrumentations()],
  serviceName: 'my-service',
});

sdk.start();

// Manual tracing
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('user-service');

async function getUser(userId: string) {
  return tracer.startActiveSpan('getUser', async (span) => {
    span.setAttribute('user.id', userId);
    
    try {
      const user = await db.users.findOne({ id: userId });
      return user;
    } finally {
      span.end();
    }
  });
}
```

## Structured Logging

```rust
// JSON logging for production
tracing_subscriber::fmt()
    .json()
    .with_current_span(true)
    .with_span_list(true)
    .init();

// Log with context
info!(
    user_id = %user.id,
    action = "login",
    ip = %request.ip(),
    "User logged in successfully"
);
```

## Alerting (Prometheus)

```yaml
# prometheus/alerts.yml
groups:
  - name: api
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
      
      - alert: SlowResponses
        expr: histogram_quantile(0.95, http_request_duration_seconds_bucket) > 1
        for: 5m
        labels:
          severity: warning
```

## Related Skills

- [devops](../devops/SKILL.md) - Grafana, Prometheus deployment
- [security](../security/SKILL.md) - Security event logging
- [databases](../databases/SKILL.md) - Query performance tracing
