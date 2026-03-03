# Server-Sent Events (SSE)

> Lightweight server-to-client streaming for real-time updates.

## When to Use SSE vs WebSockets

| Feature | SSE | WebSocket |
|---------|-----|-----------|
| Direction | Server → Client | Bidirectional |
| Protocol | HTTP/2 | ws:// |
| Reconnection | Built-in | Manual |
| Binary data | No | Yes |
| Browser support | ✅ | ✅ |
| Best for | Notifications, feeds | Chat, gaming |

## Rust - Axum SSE

```rust
use axum::{
    response::sse::{Event, KeepAlive, Sse},
    routing::get,
    Router,
};
use futures::stream::{self, Stream};
use std::{convert::Infallible, time::Duration};
use tokio_stream::StreamExt;

// Basic SSE endpoint
async fn sse_handler() -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
    let stream = stream::repeat_with(|| {
        Event::default()
            .data(format!("Server time: {:?}", std::time::Instant::now()))
    })
    .map(Ok)
    .throttle(Duration::from_secs(1));
    
    Sse::new(stream).keep_alive(KeepAlive::default())
}

// SSE with broadcast channel
use tokio::sync::broadcast;

#[derive(Clone)]
struct AppState {
    tx: broadcast::Sender<String>,
}

async fn notifications_sse(
    State(state): State<AppState>,
) -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
    let rx = state.tx.subscribe();
    
    let stream = tokio_stream::wrappers::BroadcastStream::new(rx)
        .filter_map(|result| result.ok())
        .map(|msg| Ok(Event::default().data(msg)));
    
    Sse::new(stream).keep_alive(
        KeepAlive::new()
            .interval(Duration::from_secs(15))
            .text("keep-alive"),
    )
}

// Typed events
#[derive(Serialize)]
struct Notification {
    id: String,
    title: String,
    body: String,
}

async fn typed_sse(
    State(state): State<AppState>,
) -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
    let rx = state.tx.subscribe();
    
    let stream = tokio_stream::wrappers::BroadcastStream::new(rx)
        .filter_map(|result| result.ok())
        .map(|notification: Notification| {
            Ok(Event::default()
                .event("notification")
                .id(notification.id.clone())
                .json_data(&notification)
                .unwrap())
        });
    
    Sse::new(stream)
}
```

## Go - Fiber SSE

```go
import (
    "bufio"
    "fmt"
    "github.com/gofiber/fiber/v2"
)

func SSEHandler(c *fiber.Ctx) error {
    c.Set("Content-Type", "text/event-stream")
    c.Set("Cache-Control", "no-cache")
    c.Set("Connection", "keep-alive")
    
    c.Context().SetBodyStreamWriter(func(w *bufio.Writer) {
        for i := 0; i < 10; i++ {
            fmt.Fprintf(w, "data: Message %d\n\n", i)
            w.Flush()
            time.Sleep(time.Second)
        }
    })
    
    return nil
}

// With broadcast
type SSEBroker struct {
    clients    map[chan string]bool
    register   chan chan string
    unregister chan chan string
    broadcast  chan string
    mu         sync.RWMutex
}

func (b *SSEBroker) ServeHTTP(c *fiber.Ctx) error {
    c.Set("Content-Type", "text/event-stream")
    c.Set("Cache-Control", "no-cache")
    c.Set("Connection", "keep-alive")
    
    client := make(chan string)
    b.register <- client
    
    defer func() {
        b.unregister <- client
    }()
    
    c.Context().SetBodyStreamWriter(func(w *bufio.Writer) {
        for msg := range client {
            fmt.Fprintf(w, "data: %s\n\n", msg)
            w.Flush()
        }
    })
    
    return nil
}
```

## Python - FastAPI SSE

```python
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from sse_starlette.sse import EventSourceResponse
import asyncio

app = FastAPI()

# Basic SSE
@app.get("/stream")
async def stream():
    async def event_generator():
        while True:
            yield f"data: {datetime.now().isoformat()}\n\n"
            await asyncio.sleep(1)
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
    )

# With sse-starlette
@app.get("/notifications")
async def notifications():
    async def event_generator():
        while True:
            notification = await get_next_notification()
            yield {
                "event": "notification",
                "id": notification.id,
                "data": notification.json(),
            }
    
    return EventSourceResponse(event_generator())

# With broadcast
from broadcaster import Broadcast

broadcast = Broadcast("redis://localhost:6379")

@app.on_event("startup")
async def startup():
    await broadcast.connect()

@app.get("/events/{channel}")
async def events(channel: str):
    async def event_generator():
        async with broadcast.subscribe(channel) as subscriber:
            async for event in subscriber:
                yield {"data": event.message}
    
    return EventSourceResponse(event_generator())
```

## Node.js - Express SSE

```typescript
import express from 'express';

const app = express();

// Basic SSE
app.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  const interval = setInterval(() => {
    res.write(`data: ${new Date().toISOString()}\n\n`);
  }, 1000);
  
  req.on('close', () => {
    clearInterval(interval);
    res.end();
  });
});

// With broadcast
class SSEBroker {
  private clients: Set<express.Response> = new Set();
  
  addClient(res: express.Response) {
    this.clients.add(res);
    res.on('close', () => this.clients.delete(res));
  }
  
  broadcast(event: string, data: unknown) {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    this.clients.forEach(res => res.write(message));
  }
}

const broker = new SSEBroker();

app.get('/notifications', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  broker.addClient(res);
});

// Send notification
app.post('/notify', (req, res) => {
  broker.broadcast('notification', req.body);
  res.sendStatus(200);
});
```

## Client-Side (Browser)

```typescript
// React hook for SSE
function useSSE<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    const eventSource = new EventSource(url);
    
    eventSource.onmessage = (event) => {
      setData(JSON.parse(event.data));
    };
    
    eventSource.addEventListener('notification', (event) => {
      setData(JSON.parse(event.data));
    });
    
    eventSource.onerror = (e) => {
      setError(new Error('SSE connection failed'));
      eventSource.close();
    };
    
    return () => eventSource.close();
  }, [url]);
  
  return { data, error };
}

// Usage
function NotificationBell() {
  const { data } = useSSE<Notification>('/api/notifications/stream');
  
  return (
    <div>
      {data && <Badge>{data.count}</Badge>}
    </div>
  );
}
```

## SSE with Authentication

```rust
// Include auth token in URL or cookies
async fn authenticated_sse(
    State(state): State<AppState>,
    Query(params): Query<SseQuery>,
) -> Result<Sse<impl Stream<Item = Result<Event, Infallible>>>, AuthError> {
    // Verify token
    let claims = verify_token(&params.token)?;
    
    // Create user-specific stream
    let rx = state.user_channels.subscribe(claims.user_id);
    
    let stream = tokio_stream::wrappers::BroadcastStream::new(rx)
        .filter_map(|r| r.ok())
        .map(|msg| Ok(Event::default().data(msg)));
    
    Ok(Sse::new(stream))
}
```

```typescript
// Client with auth
const eventSource = new EventSource(
  `/api/events?token=${accessToken}`
);
```
