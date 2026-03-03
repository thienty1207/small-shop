# Job Queue Patterns

> Advanced patterns for reliable job processing.

## Retry Strategies

### Exponential Backoff

```rust
// Rust - apalis
#[derive(Clone)]
struct RetryPolicy {
    max_retries: u32,
    base_delay: Duration,
}

impl RetryPolicy {
    fn delay_for_attempt(&self, attempt: u32) -> Duration {
        let multiplier = 2_u64.pow(attempt.min(10));
        self.base_delay * multiplier as u32
    }
}

async fn process_with_retry<T, F, Fut>(
    job: T,
    max_retries: u32,
    process: F
) -> Result<(), JobError>
where
    F: Fn(T) -> Fut,
    Fut: Future<Output = Result<(), JobError>>,
    T: Clone,
{
    let mut attempt = 0;
    let mut last_error = None;
    
    while attempt < max_retries {
        match process(job.clone()).await {
            Ok(()) => return Ok(()),
            Err(e) if e.is_retryable() => {
                attempt += 1;
                let delay = Duration::from_secs(2_u64.pow(attempt));
                tokio::time::sleep(delay).await;
                last_error = Some(e);
            }
            Err(e) => return Err(e), // Non-retryable error
        }
    }
    
    Err(last_error.unwrap_or(JobError::MaxRetriesExceeded))
}
```

### Go - asynq Retry

```go
// Configure retry per task
task, _ := NewEmailTask(payload)
client.Enqueue(task,
    asynq.MaxRetry(5),
    asynq.Timeout(30*time.Second),
    asynq.Retention(24*time.Hour), // Keep completed tasks
)
```

### Node.js - BullMQ

```typescript
await queue.add('email', payload, {
  attempts: 5,
  backoff: {
    type: 'exponential',
    delay: 1000, // 1s, 2s, 4s, 8s, 16s
  },
  removeOnComplete: 100, // Keep last 100
  removeOnFail: 500,
});
```

## Job Priorities

```rust
// Rust - Priority queue pattern
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Priority {
    Critical = 0,  // Process immediately
    High = 1,      // Within seconds
    Normal = 2,    // Within minutes
    Low = 3,       // Background
}

struct PriorityJob<T> {
    priority: Priority,
    payload: T,
    created_at: DateTime<Utc>,
}

// Use separate queues per priority
let critical_worker = WorkerBuilder::new("critical")
    .concurrency(10)
    .build();

let normal_worker = WorkerBuilder::new("normal")
    .concurrency(5)
    .build();

let low_worker = WorkerBuilder::new("low")
    .concurrency(2)
    .build();
```

```typescript
// BullMQ priority (lower = higher priority)
await queue.add('urgent', data, { priority: 1 });
await queue.add('normal', data, { priority: 5 });
await queue.add('batch', data, { priority: 10 });
```

## Dead Letter Queue

```rust
// Move failed jobs to DLQ for manual inspection
async fn handle_job_failure(job: FailedJob, dlq: &RedisStorage<FailedJob>) {
    if job.attempts >= job.max_retries {
        // Move to dead letter queue
        dlq.push(FailedJob {
            original_job: job,
            failure_reason: job.last_error,
            failed_at: Utc::now(),
        }).await?;
        
        // Alert on-call
        alert_service.notify("Job moved to DLQ", &job).await;
    }
}
```

## Rate Limiting Jobs

```rust
use governor::{Quota, RateLimiter};

// Limit API calls to external service
let limiter = RateLimiter::direct(Quota::per_second(10));

async fn process_with_rate_limit<T>(
    limiter: &RateLimiter,
    job: T,
) -> Result<(), JobError> {
    limiter.until_ready().await;
    // Process job
    Ok(())
}
```

## Unique Jobs (Deduplication)

```typescript
// BullMQ - Prevent duplicate jobs
await queue.add('sync-user', { userId: '123' }, {
  jobId: `sync-user-${userId}`, // Same ID = same job
});

// Or use debouncing
await queue.add('webhook', payload, {
  debounce: {
    id: `webhook-${payload.externalId}`,
    ttl: 5000, // 5 second window
  },
});
```

```rust
// Rust - Check existence before enqueue
async fn enqueue_unique(
    storage: &RedisStorage<Job>,
    job: Job,
) -> Result<(), Error> {
    let key = format!("job:lock:{}", job.dedup_key());
    
    // SET NX with TTL
    let acquired: bool = redis.set_nx(&key, "1", 3600).await?;
    if !acquired {
        return Ok(()); // Job already queued
    }
    
    storage.push(job).await?;
    Ok(())
}
```

## Batch Processing

```rust
// Process jobs in batches for efficiency
async fn batch_processor(
    mut receiver: mpsc::Receiver<Job>,
    batch_size: usize,
    max_wait: Duration,
) {
    let mut batch = Vec::with_capacity(batch_size);
    let mut deadline = Instant::now() + max_wait;
    
    loop {
        tokio::select! {
            Some(job) = receiver.recv() => {
                batch.push(job);
                if batch.len() >= batch_size {
                    process_batch(&mut batch).await;
                    deadline = Instant::now() + max_wait;
                }
            }
            _ = tokio::time::sleep_until(deadline.into()) => {
                if !batch.is_empty() {
                    process_batch(&mut batch).await;
                }
                deadline = Instant::now() + max_wait;
            }
        }
    }
}
```

## Job Scheduling

```rust
// Cron-based scheduling
use tokio_cron_scheduler::{Job, JobScheduler};

let scheduler = JobScheduler::new().await?;

// Every day at 2 AM
scheduler.add(Job::new_async("0 0 2 * * *", |_uuid, _l| {
    Box::pin(async move {
        cleanup_old_data().await;
    })
})?).await?;

// Every 5 minutes
scheduler.add(Job::new_async("0 */5 * * * *", |_uuid, _l| {
    Box::pin(async move {
        sync_external_data().await;
    })
})?).await?;

scheduler.start().await?;
```

## Monitoring Jobs

```rust
// Prometheus metrics for job queues
counter!("jobs_processed_total", "queue" => queue_name, "status" => "success").increment(1);
counter!("jobs_processed_total", "queue" => queue_name, "status" => "failed").increment(1);
histogram!("job_processing_duration_seconds", "queue" => queue_name).record(duration.as_secs_f64());
gauge!("jobs_queue_depth", "queue" => queue_name).set(queue.len() as f64);
```
