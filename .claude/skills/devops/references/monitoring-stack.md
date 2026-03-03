# Monitoring & Observability Stack

## The Three Pillars

```
Metrics  → Prometheus + Grafana (what happened?)
Logs     → Loki / ELK (why did it happen?)
Traces   → OpenTelemetry + Jaeger (where did it happen?)
```

## Prometheus

### Application Metrics (Rust/Axum)
```rust
use prometheus::{register_histogram_vec, register_counter_vec, HistogramVec, CounterVec};

lazy_static! {
    static ref HTTP_REQUESTS: CounterVec = register_counter_vec!(
        "http_requests_total", "Total HTTP requests",
        &["method", "path", "status"]
    ).unwrap();
    
    static ref HTTP_DURATION: HistogramVec = register_histogram_vec!(
        "http_request_duration_seconds", "HTTP request duration",
        &["method", "path"],
        vec![0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0]
    ).unwrap();
}
```

### prometheus.yml
```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'myapp'
    static_configs:
      - targets: ['myapp:3000']
    metrics_path: '/metrics'

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']

  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']
```

## RED Metrics (Request-based services)

```
Rate    → requests per second
Errors  → error rate (4xx, 5xx)
Duration → request latency (p50, p95, p99)
```

### Key PromQL Queries
```promql
# Request rate (per second, 5m window)
rate(http_requests_total{job="myapp"}[5m])

# Error rate percentage
sum(rate(http_requests_total{status=~"5.."}[5m]))
/ sum(rate(http_requests_total[5m])) * 100

# P95 latency
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# CPU usage by pod
rate(container_cpu_usage_seconds_total{namespace="production"}[5m])

# Memory usage
container_memory_usage_bytes{namespace="production"} / container_spec_memory_limit_bytes * 100
```

## Alerting Rules

```yaml
groups:
  - name: application
    rules:
      - alert: HighErrorRate
        expr: sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) > 0.01
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate ({{ $value | humanizePercentage }})"

      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "P95 latency above 1s"

      - alert: PodCrashLooping
        expr: rate(kube_pod_container_status_restarts_total[15m]) > 0
        for: 5m
        labels:
          severity: critical
```

## SLIs / SLOs

### Define SLIs
```
Availability SLI = successful requests / total requests
Latency SLI     = requests < 200ms / total requests
```

### Set SLOs
```
Availability SLO: 99.9% (allows 8.77h downtime/year)
Latency SLO:      95% of requests < 200ms
```

### Error Budget
```
Monthly error budget = 1 - SLO = 0.1%
If 1M requests/month → 1000 allowed errors
Burn rate alert: if consuming >10x normal → page on-call
```

## Docker Compose Monitoring Stack

```yaml
services:
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana:latest
    volumes:
      - grafana_data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    ports:
      - "3001:3000"

  loki:
    image: grafana/loki:latest
    ports:
      - "3100:3100"

  node-exporter:
    image: prom/node-exporter:latest
    pid: host
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro

volumes:
  prometheus_data:
  grafana_data:
```
