# Load Testing with k6

## Setup
```bash
# Install (macOS)
brew install k6

# Install (Linux)
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D68
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | \
  sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6
```

## Basic Load Test

```javascript
// load-test.js
import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  stages: [
    { duration: '30s', target: 20 },   // Ramp up to 20 users
    { duration: '1m',  target: 20 },   // Hold at 20 users
    { duration: '10s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],   // 95% of requests < 500ms
    http_req_failed: ['rate<0.01'],     // <1% error rate
    http_reqs: ['rate>100'],            // >100 req/s throughput
  },
}

export default function () {
  const res = http.get('http://localhost:3000/api/users')
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
    'has body': (r) => r.body.length > 0,
  })
  sleep(1) // Think time between requests
}
```

## Advanced Scenarios

### Multiple Endpoints
```javascript
import http from 'k6/http'
import { check, group, sleep } from 'k6'

export default function () {
  group('User Flow', () => {
    // Login
    const loginRes = http.post('http://localhost:3000/api/login', JSON.stringify({
      email: 'test@example.com',
      password: 'password'
    }), { headers: { 'Content-Type': 'application/json' } })
    
    check(loginRes, { 'login successful': (r) => r.status === 200 })
    const token = loginRes.json('token')
    
    // Get profile
    const profileRes = http.get('http://localhost:3000/api/profile', {
      headers: { Authorization: `Bearer ${token}` }
    })
    check(profileRes, { 'profile loaded': (r) => r.status === 200 })
    
    sleep(1)
  })
}
```

### Stress Test (find breaking point)
```javascript
export const options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 200 },
    { duration: '5m', target: 200 },
    { duration: '2m', target: 300 },   // Push to break
    { duration: '5m', target: 300 },
    { duration: '5m', target: 0 },     // Recovery
  ],
}
```

### Spike Test (sudden traffic)
```javascript
export const options = {
  stages: [
    { duration: '10s', target: 10 },    // Normal load
    { duration: '1m',  target: 10 },
    { duration: '10s', target: 500 },   // SPIKE!
    { duration: '3m',  target: 500 },   // Sustain spike
    { duration: '10s', target: 10 },    // Drop back
    { duration: '3m',  target: 10 },    // Recovery
    { duration: '5s',  target: 0 },
  ],
}
```

## Custom Metrics
```javascript
import { Counter, Trend, Rate, Gauge } from 'k6/metrics'

const orderLatency = new Trend('order_latency')
const ordersCreated = new Counter('orders_created')
const orderFailRate = new Rate('order_fail_rate')
const activeUsers = new Gauge('active_users')

export default function () {
  const res = http.post('http://localhost:3000/api/orders', ...)
  
  orderLatency.add(res.timings.duration)
  ordersCreated.add(1)
  orderFailRate.add(res.status !== 201)
  activeUsers.add(__VU) // Virtual user count
}
```

## Run Commands
```bash
k6 run load-test.js                  # Basic run
k6 run --vus 50 --duration 30s test.js  # Quick override
k6 run --out json=results.json test.js  # JSON output
k6 run --out csv=results.csv test.js    # CSV output

# CI/CD integration (exits with error if thresholds fail)
k6 run --quiet load-test.js || exit 1
```
