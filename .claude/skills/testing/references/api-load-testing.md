# API Load Testing

Stress testing backend APIs to validate performance, find bottlenecks, and ensure scalability.

## Overview

Load testing answers:
- How many concurrent users can the API handle?
- What's the response time under load?
- Where are the bottlenecks?
- At what point does the system fail?

## Tools Comparison

| Tool | Language | Best For |
|------|----------|----------|
| **k6** | JavaScript | Modern APIs, CI/CD integration |
| **Artillery** | JavaScript | Quick setup, YAML config |
| **Locust** | Python | Complex scenarios, Python teams |
| **wrk** | C/Lua | Raw HTTP benchmarking |
| **oha** | Rust | Quick benchmarks |

---

## k6 (Recommended)

### Installation
```bash
# macOS
brew install k6

# Linux
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6

# Docker
docker run --rm -i grafana/k6 run - <script.js
```

### Basic Load Test
```javascript
// load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },   // Ramp up to 20 users
    { duration: '1m', target: 20 },    // Stay at 20 users
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],    // Less than 1% failure rate
  },
};

export default function () {
  const res = http.get('http://localhost:3000/api/products');
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  sleep(1); // Think time between requests
}
```

### API Endpoint Testing
```javascript
// api-load-test.js
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { randomString } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

const BASE_URL = __ENV.API_URL || 'http://localhost:3000';

export const options = {
  scenarios: {
    // Constant load
    constant_load: {
      executor: 'constant-vus',
      vus: 10,
      duration: '2m',
    },
    // Spike test
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 100 },  // Spike to 100
        { duration: '1m', target: 100 },   // Stay at 100
        { duration: '10s', target: 0 },    // Back to 0
      ],
      startTime: '2m',  // Start after constant_load
    },
  },
  thresholds: {
    'http_req_duration{endpoint:products}': ['p(95)<200'],
    'http_req_duration{endpoint:orders}': ['p(95)<500'],
    'http_req_failed': ['rate<0.05'],
  },
};

// Setup: Create test user and get auth token
export function setup() {
  const signupRes = http.post(`${BASE_URL}/api/auth/signup`, JSON.stringify({
    email: `loadtest-${randomString(8)}@test.com`,
    password: 'testpassword123',
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  const loginRes = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
    email: JSON.parse(signupRes.body).email,
    password: 'testpassword123',
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  return { token: JSON.parse(loginRes.body).token };
}

export default function (data) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${data.token}`,
  };

  group('Products API', () => {
    const res = http.get(`${BASE_URL}/api/products`, {
      tags: { endpoint: 'products' },
    });
    
    check(res, {
      'products: status 200': (r) => r.status === 200,
      'products: has items': (r) => JSON.parse(r.body).length > 0,
    });
  });

  group('Orders API', () => {
    // Create order
    const orderRes = http.post(`${BASE_URL}/api/orders`, JSON.stringify({
      items: [{ productId: '1', quantity: 1 }],
    }), {
      headers,
      tags: { endpoint: 'orders' },
    });
    
    check(orderRes, {
      'order: status 201': (r) => r.status === 201,
    });
    
    // Get order
    if (orderRes.status === 201) {
      const orderId = JSON.parse(orderRes.body).id;
      const getRes = http.get(`${BASE_URL}/api/orders/${orderId}`, {
        headers,
        tags: { endpoint: 'orders' },
      });
      
      check(getRes, {
        'get order: status 200': (r) => r.status === 200,
      });
    }
  });

  sleep(Math.random() * 3 + 1); // Random 1-4s think time
}

// Cleanup
export function teardown(data) {
  // Optional: Delete test user
}
```

### Running k6
```bash
# Basic run
k6 run load-test.js

# With environment variables
k6 run -e API_URL=https://staging.api.com load-test.js

# Output to JSON
k6 run --out json=results.json load-test.js

# Output to InfluxDB (for Grafana dashboards)
k6 run --out influxdb=http://localhost:8086/k6 load-test.js
```

---

## Artillery

### Installation
```bash
npm install -g artillery
```

### YAML Configuration
```yaml
# artillery.yml
config:
  target: "http://localhost:3000"
  phases:
    - duration: 60
      arrivalRate: 5
      name: "Warm up"
    - duration: 120
      arrivalRate: 20
      name: "Sustained load"
    - duration: 60
      arrivalRate: 50
      name: "Spike"
  
  defaults:
    headers:
      Content-Type: "application/json"
  
  variables:
    productId:
      - "1"
      - "2"
      - "3"

scenarios:
  - name: "Browse and purchase"
    weight: 70
    flow:
      - get:
          url: "/api/products"
          capture:
            - json: "$[0].id"
              as: "productId"
      - think: 2
      - get:
          url: "/api/products/{{ productId }}"
      - think: 1
      - post:
          url: "/api/cart"
          json:
            productId: "{{ productId }}"
            quantity: 1

  - name: "Quick browse"
    weight: 30
    flow:
      - get:
          url: "/api/products"
      - think: 3
      - get:
          url: "/api/products/{{ $randomNumber(1, 100) }}"
```

### Running Artillery
```bash
# Run test
artillery run artillery.yml

# Generate report
artillery run --output report.json artillery.yml
artillery report report.json --output report.html
```

---

## Locust (Python)

### Installation
```bash
pip install locust
```

### Test Script
```python
# locustfile.py
from locust import HttpUser, task, between
import json
import random

class APIUser(HttpUser):
    wait_time = between(1, 3)
    
    def on_start(self):
        """Login and get token."""
        response = self.client.post("/api/auth/login", json={
            "email": "test@example.com",
            "password": "password123",
        })
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    @task(3)
    def browse_products(self):
        """Most common action."""
        self.client.get("/api/products", headers=self.headers)
    
    @task(2)
    def view_product(self):
        product_id = random.randint(1, 100)
        self.client.get(f"/api/products/{product_id}", headers=self.headers)
    
    @task(1)
    def create_order(self):
        """Less common action."""
        self.client.post("/api/orders", json={
            "items": [{"productId": "1", "quantity": 1}]
        }, headers=self.headers)
```

### Running Locust
```bash
# Web UI mode
locust -f locustfile.py --host=http://localhost:3000

# Headless mode
locust -f locustfile.py --host=http://localhost:3000 \
  --headless -u 100 -r 10 --run-time 5m
```

---

## Quick Benchmarking

### oha (Rust)
```bash
# Install
cargo install oha

# Simple benchmark
oha -n 10000 -c 100 http://localhost:3000/api/products

# With POST body
oha -n 1000 -c 50 -m POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}' \
  http://localhost:3000/api/users
```

### wrk
```bash
# Install
brew install wrk  # macOS

# Benchmark
wrk -t12 -c400 -d30s http://localhost:3000/api/products

# With Lua script
wrk -t12 -c400 -d30s -s post.lua http://localhost:3000/api/users
```

---

## Backend-Specific Benchmarking

### Rust (criterion)
```rust
// benches/api_bench.rs
use criterion::{criterion_group, criterion_main, Criterion};
use tokio::runtime::Runtime;

fn benchmark_handler(c: &mut Criterion) {
    let rt = Runtime::new().unwrap();
    let app = create_test_app();
    
    c.bench_function("GET /api/products", |b| {
        b.to_async(&rt).iter(|| async {
            let response = app.server
                .get("/api/products")
                .await;
            assert!(response.status().is_success());
        })
    });
}

criterion_group!(benches, benchmark_handler);
criterion_main!(benches);
```

### Go (testing.B)
```go
func BenchmarkProductsHandler(b *testing.B) {
    app := setupTestApp()
    
    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        req := httptest.NewRequest("GET", "/api/products", nil)
        w := httptest.NewRecorder()
        app.Router.ServeHTTP(w, req)
    }
}
```

---

## CI/CD Integration

### GitHub Actions
```yaml
# .github/workflows/load-test.yml
name: Load Test

on:
  push:
    branches: [main]
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM

jobs:
  load-test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Start API server
        run: |
          cargo build --release
          ./target/release/api-server &
          sleep 5
        env:
          DATABASE_URL: postgres://test:test@localhost:5432/test
      
      - name: Run k6 load test
        uses: grafana/k6-action@v0.3.1
        with:
          filename: tests/load/api-load-test.js
          flags: --out json=results.json
      
      - name: Check thresholds
        run: |
          # Fail if thresholds weren't met
          if grep -q '"thresholds":{".*":{"ok":false' results.json; then
            echo "Load test thresholds failed!"
            exit 1
          fi
      
      - name: Upload results
        uses: actions/upload-artifact@v4
        with:
          name: load-test-results
          path: results.json
```

---

## Performance Thresholds

### Recommended Targets
| Metric | Target | Critical |
|--------|--------|----------|
| p50 latency | <100ms | <200ms |
| p95 latency | <300ms | <500ms |
| p99 latency | <500ms | <1000ms |
| Error rate | <0.1% | <1% |
| Throughput | Based on SLA | -50% of target |

### k6 Thresholds
```javascript
export const options = {
  thresholds: {
    http_req_duration: [
      'p(50)<100',   // 50% under 100ms
      'p(95)<300',   // 95% under 300ms
      'p(99)<500',   // 99% under 500ms
    ],
    http_req_failed: ['rate<0.001'],  // <0.1% errors
    http_reqs: ['rate>100'],          // >100 req/s
  },
};
```

---

## Best Practices

### 1. Test Environment
```yaml
✅ Use production-like data volume
✅ Match production hardware specs (or scale proportionally)
✅ Warm up the system before measuring
✅ Test against staging, not production
```

### 2. Test Design
```yaml
✅ Include think time (realistic user pauses)
✅ Mix read and write operations
✅ Test authenticated and unauthenticated endpoints
✅ Include data setup in test lifecycle
```

### 3. Analysis
```yaml
✅ Look at percentiles, not just averages
✅ Monitor system resources during tests (CPU, memory, connections)
✅ Identify the breaking point
✅ Compare results over time
```
