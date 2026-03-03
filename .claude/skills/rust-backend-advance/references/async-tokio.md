# Async & Tokio Patterns

Essential async patterns for Rust backend development with Tokio runtime.

## Tokio Fundamentals

### Runtime Setup

```rust
// In main.rs - full-featured runtime
#[tokio::main]
async fn main() {
    // Your async code here
}

// With custom configuration
#[tokio::main(flavor = "multi_thread", worker_threads = 4)]
async fn main() {
    // ...
}

// For tests
#[tokio::test]
async fn test_async_function() {
    // ...
}
```

---

## Never Block the Runtime

### Use spawn_blocking for CPU-Intensive Work

```rust
// ✅ Correct - offload blocking work
async fn hash_password(password: String) -> Result<String, AppError> {
    tokio::task::spawn_blocking(move || {
        // CPU-intensive: argon2 hashing
        argon2::hash_encoded(password.as_bytes(), &salt, &config)
    })
    .await
    .map_err(|_| AppError::Internal("Hash failed".into()))?
}

// ❌ Wrong - blocks async runtime
async fn hash_password_bad(password: String) -> String {
    argon2::hash_encoded(password.as_bytes(), &salt, &config) // Blocks!
}
```

### Common Blocking Operations to Offload

```rust
// File I/O (use tokio::fs instead, or spawn_blocking)
let content = tokio::task::spawn_blocking(|| {
    std::fs::read_to_string("large_file.txt")
}).await??;

// Better: use tokio's async file I/O
let content = tokio::fs::read_to_string("large_file.txt").await?;

// Compression/encryption
let compressed = tokio::task::spawn_blocking(move || {
    zstd::encode_all(&data[..], 3)
}).await??;
```

---

## Tokio Primitives

### Sleep (Never use std::thread::sleep)

```rust
use tokio::time::{sleep, Duration};

// ✅ Correct - async sleep
async fn delayed_action() {
    sleep(Duration::from_secs(5)).await;
    do_something();
}

// ❌ Wrong - blocks runtime
fn delayed_action_bad() {
    std::thread::sleep(Duration::from_secs(5)); // Blocks entire thread!
}
```

### Timeout

```rust
use tokio::time::timeout;

async fn fetch_with_timeout() -> Result<Data, AppError> {
    timeout(Duration::from_secs(30), fetch_data())
        .await
        .map_err(|_| AppError::Timeout)?
}
```

---

## Channels

### mpsc - Multi-Producer, Single-Consumer

```rust
use tokio::sync::mpsc;

// ✅ Bounded channel - provides backpressure
let (tx, mut rx) = mpsc::channel::<Message>(100);

// Producer
tokio::spawn(async move {
    tx.send(Message::new()).await.unwrap();
});

// Consumer
tokio::spawn(async move {
    while let Some(msg) = rx.recv().await {
        process(msg).await;
    }
});
```

### oneshot - Single Value Response

```rust
use tokio::sync::oneshot;

// Request-response pattern
let (tx, rx) = oneshot::channel();

tokio::spawn(async move {
    let result = expensive_computation().await;
    tx.send(result).ok();
});

let result = rx.await?;
```

### broadcast - Multi-Consumer

```rust
use tokio::sync::broadcast;

// Event broadcasting
let (tx, _) = broadcast::channel::<Event>(16);

// Multiple receivers
let mut rx1 = tx.subscribe();
let mut rx2 = tx.subscribe();

tx.send(Event::UserCreated { id: user_id })?;
```

---

## Spawning Tasks

### tokio::spawn for Independent Tasks

```rust
// Fire and forget
tokio::spawn(async move {
    send_email(user.email, "Welcome!").await;
});

// With result handling
let handle = tokio::spawn(async move {
    process_data(data).await
});

let result = handle.await?;
```

### JoinSet for Managing Multiple Tasks

```rust
use tokio::task::JoinSet;

async fn process_batch(items: Vec<Item>) -> Vec<Result<Output, Error>> {
    let mut set = JoinSet::new();
    
    for item in items {
        set.spawn(async move {
            process_item(item).await
        });
    }
    
    let mut results = Vec::new();
    while let Some(res) = set.join_next().await {
        results.push(res.unwrap());
    }
    results
}
```

---

## Mutex Selection

### std::sync::Mutex for Data Protection

```rust
use std::sync::Mutex;

// ✅ Preferred for protecting data (faster)
struct Cache {
    data: Mutex<HashMap<String, Value>>,
}

impl Cache {
    fn get(&self, key: &str) -> Option<Value> {
        self.data.lock().unwrap().get(key).cloned()
    }
    
    fn insert(&self, key: String, value: Value) {
        self.data.lock().unwrap().insert(key, value);
    }
}
```

### tokio::sync::Mutex Only When Holding Across .await

```rust
use tokio::sync::Mutex;

// Only when lock must be held across await points
struct ConnectionManager {
    conn: Mutex<Connection>,
}

impl ConnectionManager {
    async fn execute(&self, query: &str) -> Result<(), Error> {
        let mut conn = self.conn.lock().await;
        conn.execute(query).await // Lock held across .await
    }
}
```

### RwLock for Read-Heavy Workloads

```rust
use tokio::sync::RwLock;

struct ConfigStore {
    config: RwLock<Config>,
}

impl ConfigStore {
    async fn get(&self) -> Config {
        self.config.read().await.clone()
    }
    
    async fn update(&self, new_config: Config) {
        *self.config.write().await = new_config;
    }
}
```

---

## Concurrency Patterns

### Select - First to Complete

```rust
use tokio::select;

async fn fetch_with_fallback() -> Data {
    select! {
        data = fetch_from_primary() => data,
        data = fetch_from_cache() => data,
    }
}

// With cancellation
async fn cancellable_task(cancel: oneshot::Receiver<()>) {
    select! {
        result = do_work() => handle_result(result),
        _ = cancel => println!("Cancelled"),
    }
}
```

### Concurrent Execution with join!

```rust
use tokio::join;

async fn load_page_data(user_id: Uuid) -> PageData {
    let (user, posts, notifications) = join!(
        fetch_user(user_id),
        fetch_posts(user_id),
        fetch_notifications(user_id),
    );
    
    PageData { user?, posts?, notifications? }
}
```

### try_join! for Fallible Operations

```rust
use tokio::try_join;

async fn load_all() -> Result<(User, Posts), Error> {
    try_join!(
        fetch_user(id),
        fetch_posts(id),
    )
}
```

---

## Graceful Shutdown

```rust
use tokio::signal;
use tokio::sync::broadcast;

async fn main() {
    let (shutdown_tx, _) = broadcast::channel::<()>(1);
    
    // Spawn server
    let shutdown_rx = shutdown_tx.subscribe();
    let server = tokio::spawn(run_server(shutdown_rx));
    
    // Wait for shutdown signal
    signal::ctrl_c().await.unwrap();
    println!("Shutting down...");
    
    // Notify all tasks
    drop(shutdown_tx);
    
    // Wait for graceful shutdown
    let _ = tokio::time::timeout(
        Duration::from_secs(30),
        server
    ).await;
}

async fn run_server(mut shutdown: broadcast::Receiver<()>) {
    loop {
        select! {
            conn = accept_connection() => handle(conn),
            _ = shutdown.recv() => {
                println!("Server shutting down");
                break;
            }
        }
    }
}
```

---

## Common Pitfalls

### 1. Holding Locks Across Await

```rust
// ❌ Deadlock risk with std::sync::Mutex
let guard = mutex.lock().unwrap();
async_operation().await; // BAD!
drop(guard);

// ✅ Release before await
{
    let guard = mutex.lock().unwrap();
    let value = guard.clone();
} // Lock released
async_operation(value).await;

// ✅ Or use tokio::sync::Mutex if needed
let guard = async_mutex.lock().await;
async_operation().await;
drop(guard);
```

### 2. Unbounded Channels Without Backpressure

```rust
// ⚠️ Can cause OOM
let (tx, rx) = mpsc::unbounded_channel();

// ✅ Bounded with backpressure
let (tx, rx) = mpsc::channel(1000);
```

### 3. Blocking in Async Context

```rust
// ❌ Blocks runtime
async fn bad() {
    std::thread::sleep(Duration::from_secs(1));
    std::fs::read_to_string("file.txt").unwrap();
}

// ✅ Use async alternatives
async fn good() {
    tokio::time::sleep(Duration::from_secs(1)).await;
    tokio::fs::read_to_string("file.txt").await.unwrap();
}
```

---

## Testing Async Code

```rust
#[tokio::test]
async fn test_async_function() {
    let result = my_async_function().await;
    assert_eq!(result, expected);
}

#[tokio::test]
async fn test_with_timeout() {
    let result = tokio::time::timeout(
        Duration::from_secs(5),
        slow_operation()
    ).await;
    assert!(result.is_ok());
}
```
