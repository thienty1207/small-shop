# Background Jobs

> Async job processing, task queues, and scheduled tasks across multiple stacks.


## Metadata
- **Category:** backend-patterns
- **Scope:** Backend (Rust 60%, Go 15%, Python 15%, Node.js 10%)
- **Complexity:** Intermediate
- **Maturity:** Stable

## Overview

Background job processing enables long-running tasks to execute asynchronously, improving API response times and system reliability.

### Job Queue Options

| Stack | Queue Library | Broker |
|-------|--------------|--------|
| **Rust** | apalis, lapin | Redis, RabbitMQ |
| **Go** | asynq, machinery | Redis, RabbitMQ |
| **Python** | Celery, RQ, Dramatiq | Redis, RabbitMQ |
| **Node.js** | BullMQ, Agenda | Redis, MongoDB |

## Quick Start

### Rust - apalis with Redis

```rust
// Cargo.toml: apalis = { version = "0.5", features = ["redis"] }

use apalis::prelude::*;
use apalis_redis::RedisStorage;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
struct EmailJob {
    to: String,
    subject: String,
    body: String,
}

impl Job for EmailJob {
    const NAME: &'static str = "email::send";
}

async fn send_email(job: EmailJob, _ctx: JobContext) -> Result<(), JobError> {
    // Send email logic
    tracing::info!("Sending email to {}", job.to);
    Ok(())
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let redis_url = std::env::var("REDIS_URL")?;
    let storage = RedisStorage::connect(redis_url).await?;
    
    // Start worker
    Monitor::new()
        .register_with_count(2, move || {
            WorkerBuilder::new("email-worker")
                .with_storage(storage.clone())
                .build_fn(send_email)
        })
        .run()
        .await?;
    
    Ok(())
}

// Enqueue from API handler
async fn enqueue_email(
    State(storage): State<RedisStorage<EmailJob>>,
) -> Result<(), AppError> {
    let job = EmailJob {
        to: "user@example.com".into(),
        subject: "Welcome".into(),
        body: "Hello!".into(),
    };
    
    storage.push(job).await?;
    Ok(())
}
```

### Go - asynq

```go
import (
    "context"
    "encoding/json"
    "github.com/hibiken/asynq"
)

const TypeEmailDelivery = "email:deliver"

type EmailPayload struct {
    To      string `json:"to"`
    Subject string `json:"subject"`
    Body    string `json:"body"`
}

func NewEmailTask(p EmailPayload) (*asynq.Task, error) {
    payload, err := json.Marshal(p)
    if err != nil {
        return nil, err
    }
    return asynq.NewTask(TypeEmailDelivery, payload), nil
}

func HandleEmailTask(ctx context.Context, t *asynq.Task) error {
    var p EmailPayload
    if err := json.Unmarshal(t.Payload(), &p); err != nil {
        return err
    }
    // Send email
    return nil
}

// Worker
func main() {
    srv := asynq.NewServer(
        asynq.RedisClientOpt{Addr: "localhost:6379"},
        asynq.Config{Concurrency: 10},
    )
    
    mux := asynq.NewServeMux()
    mux.HandleFunc(TypeEmailDelivery, HandleEmailTask)
    
    srv.Run(mux)
}

// Enqueue
func EnqueueEmail(client *asynq.Client, email EmailPayload) error {
    task, _ := NewEmailTask(email)
    _, err := client.Enqueue(task, asynq.MaxRetry(3))
    return err
}
```

### Python - Celery

```python
# tasks.py
from celery import Celery

app = Celery('tasks', broker='redis://localhost:6379/0')

@app.task(bind=True, max_retries=3)
def send_email(self, to: str, subject: str, body: str):
    try:
        # Send email logic
        pass
    except Exception as exc:
        raise self.retry(exc=exc, countdown=60)

# Enqueue
send_email.delay("user@example.com", "Welcome", "Hello!")

# With options
send_email.apply_async(
    args=["user@example.com", "Welcome", "Hello!"],
    countdown=60,  # Delay 60 seconds
    expires=3600,  # Expire after 1 hour
)
```

### Node.js - BullMQ

```typescript
import { Queue, Worker, Job } from 'bullmq';

const connection = { host: 'localhost', port: 6379 };

// Define queue
const emailQueue = new Queue('email', { connection });

// Worker
const worker = new Worker('email', async (job: Job) => {
  const { to, subject, body } = job.data;
  // Send email
}, { connection, concurrency: 5 });

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err);
});

// Enqueue
await emailQueue.add('send', {
  to: 'user@example.com',
  subject: 'Welcome',
  body: 'Hello!',
}, {
  attempts: 3,
  backoff: { type: 'exponential', delay: 1000 },
});
```

## Scheduled Jobs (Cron)

### Rust - tokio-cron-scheduler

```rust
use tokio_cron_scheduler::{Job, JobScheduler};

let sched = JobScheduler::new().await?;

// Run every hour
sched.add(Job::new_async("0 0 * * * *", |_uuid, _l| {
    Box::pin(async {
        cleanup_expired_sessions().await;
    })
})?).await?;

sched.start().await?;
```

### Node.js - BullMQ Repeatable

```typescript
await emailQueue.add('daily-report', {}, {
  repeat: { cron: '0 9 * * *' }, // 9 AM daily
});
```

## Related Skills

- [caching-strategies](../caching-strategies/SKILL.md) - Redis as job broker
- [monitoring-observability](../monitoring-observability/SKILL.md) - Job metrics
- [email-notifications](../email-notifications/SKILL.md) - Email job processing
