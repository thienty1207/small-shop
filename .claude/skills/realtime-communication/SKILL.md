# Realtime Communication

> WebSockets, Server-Sent Events, and pub/sub patterns for real-time applications.


## Metadata
- **Category:** backend-patterns
- **Scope:** Backend (Rust 60%, Go 15%, Python 15%, Node.js 10%) + Frontend (Next.js)
- **Complexity:** Advanced
- **Maturity:** Stable

## Overview

Real-time communication enables instant data delivery between servers and clients. This skill covers WebSocket implementations, Server-Sent Events (SSE), and pub/sub messaging patterns across multiple backend stacks.

### Communication Patterns

| Pattern | Use Case | Direction | Protocol |
|---------|----------|-----------|----------|
| **WebSocket** | Chat, gaming, live data | Bidirectional | WS/WSS |
| **SSE** | Notifications, feeds | Server → Client | HTTP |
| **Long Polling** | Legacy support | Client → Server | HTTP |
| **Pub/Sub** | Distributed events | Many-to-Many | Redis, NATS |

### Stack Coverage

| Stack | WebSocket Library | Pub/Sub |
|-------|------------------|---------|
| **Rust/Axum** | axum::extract::ws, tokio-tungstenite | Redis, NATS |
| **Go/Fiber** | fiber/websocket, gorilla/websocket | Redis, NATS |
| **Python/FastAPI** | fastapi.WebSocket, websockets | Redis, NATS |
| **Node.js** | ws, socket.io | Redis, NATS |
| **Next.js** | socket.io-client, native WS | - |

## Reference Navigation

### Core Patterns
- [websocket-basics.md](references/websocket-basics.md) - WebSocket implementation patterns
- [sse-patterns.md](references/sse-patterns.md) - SSE for server → client streams

<!-- Coming soon:
- pubsub-patterns.md - Redis/NATS pub/sub
- scaling-websockets.md - Horizontal scaling strategies
- presence-tracking.md - Online status and typing indicators
-->

## Quick Start

### Rust/Axum - WebSocket

```rust
use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
    },
    response::Response,
    routing::get,
    Router,
};
use futures_util::{SinkExt, StreamExt};
use std::sync::Arc;
use tokio::sync::broadcast;

type Tx = broadcast::Sender<String>;

pub fn router() -> Router {
    let (tx, _) = broadcast::channel::<String>(100);
    
    Router::new()
        .route("/ws", get(ws_handler))
        .with_state(Arc::new(tx))
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    State(tx): State<Arc<Tx>>,
) -> Response {
    ws.on_upgrade(move |socket| handle_socket(socket, tx))
}

async fn handle_socket(socket: WebSocket, tx: Arc<Tx>) {
    let (mut sender, mut receiver) = socket.split();
    let mut rx = tx.subscribe();

    // Spawn task to forward broadcast messages to client
    let mut send_task = tokio::spawn(async move {
        while let Ok(msg) = rx.recv().await {
            if sender.send(Message::Text(msg)).await.is_err() {
                break;
            }
        }
    });

    // Handle incoming messages
    let tx_clone = tx.clone();
    let mut recv_task = tokio::spawn(async move {
        while let Some(Ok(Message::Text(text))) = receiver.next().await {
            let _ = tx_clone.send(text);
        }
    });

    // Wait for either task to complete
    tokio::select! {
        _ = &mut send_task => recv_task.abort(),
        _ = &mut recv_task => send_task.abort(),
    }
}
```

### Go/Fiber - WebSocket

```go
import (
    "github.com/gofiber/fiber/v2"
    "github.com/gofiber/fiber/v2/middleware/websocket"
)

type Hub struct {
    clients    map[*websocket.Conn]bool
    broadcast  chan []byte
    register   chan *websocket.Conn
    unregister chan *websocket.Conn
}

func NewHub() *Hub {
    return &Hub{
        clients:    make(map[*websocket.Conn]bool),
        broadcast:  make(chan []byte),
        register:   make(chan *websocket.Conn),
        unregister: make(chan *websocket.Conn),
    }
}

func (h *Hub) Run() {
    for {
        select {
        case client := <-h.register:
            h.clients[client] = true
        case client := <-h.unregister:
            if _, ok := h.clients[client]; ok {
                delete(h.clients, client)
            }
        case message := <-h.broadcast:
            for client := range h.clients {
                if err := client.WriteMessage(websocket.TextMessage, message); err != nil {
                    client.Close()
                    delete(h.clients, client)
                }
            }
        }
    }
}

func SetupWebSocket(app *fiber.App, hub *Hub) {
    app.Use("/ws", func(c *fiber.Ctx) error {
        if websocket.IsWebSocketUpgrade(c) {
            return c.Next()
        }
        return fiber.ErrUpgradeRequired
    })

    app.Get("/ws", websocket.New(func(c *websocket.Conn) {
        hub.register <- c
        defer func() {
            hub.unregister <- c
        }()

        for {
            _, msg, err := c.ReadMessage()
            if err != nil {
                break
            }
            hub.broadcast <- msg
        }
    }))
}
```

### Python/FastAPI - WebSocket

```python
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from typing import List

app = FastAPI()

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)

manager = ConnectionManager()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            await manager.broadcast(data)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
```

### Node.js - WebSocket (ws)

```typescript
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';

const server = createServer();
const wss = new WebSocketServer({ server });

const clients = new Set<WebSocket>();

wss.on('connection', (ws) => {
  clients.add(ws);
  
  ws.on('message', (data) => {
    // Broadcast to all clients
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data.toString());
      }
    });
  });
  
  ws.on('close', () => {
    clients.delete(ws);
  });
});

server.listen(8080);
```

### Next.js - Client

```typescript
'use client';

import { useEffect, useState, useCallback } from 'react';

export function useWebSocket(url: string) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const ws = new WebSocket(url);
    
    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => setIsConnected(false);
    ws.onmessage = (event) => {
      setMessages((prev) => [...prev, event.data]);
    };
    
    setSocket(ws);
    
    return () => ws.close();
  }, [url]);

  const send = useCallback((message: string) => {
    socket?.send(message);
  }, [socket]);

  return { messages, send, isConnected };
}

// Usage
function Chat() {
  const { messages, send, isConnected } = useWebSocket('wss://api.example.com/ws');
  
  return (
    <div>
      <div>{isConnected ? '🟢 Connected' : '🔴 Disconnected'}</div>
      {messages.map((msg, i) => <div key={i}>{msg}</div>)}
      <input onKeyDown={(e) => e.key === 'Enter' && send(e.currentTarget.value)} />
    </div>
  );
}
```

## Server-Sent Events (SSE)

### Rust/Axum

```rust
use axum::{
    response::sse::{Event, Sse},
    routing::get,
    Router,
};
use futures_util::stream::{self, Stream};
use std::{convert::Infallible, time::Duration};
use tokio_stream::StreamExt;

async fn sse_handler() -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
    let stream = stream::repeat_with(|| {
        Event::default()
            .data(format!("Time: {:?}", std::time::SystemTime::now()))
    })
    .map(Ok)
    .throttle(Duration::from_secs(1));

    Sse::new(stream).keep_alive(
        axum::response::sse::KeepAlive::new()
            .interval(Duration::from_secs(10))
            .text("keep-alive"),
    )
}

let app = Router::new().route("/events", get(sse_handler));
```

### Python/FastAPI

```python
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
import asyncio

@app.get("/events")
async def sse_endpoint():
    async def event_generator():
        while True:
            yield f"data: {{'time': '{datetime.now().isoformat()}'}}\n\n"
            await asyncio.sleep(1)
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )
```

## Related Skills

- [caching-strategies](../caching-strategies/SKILL.md) - Redis for pub/sub
- [security](../security/SKILL.md) - WebSocket authentication
- [monitoring-observability](../monitoring-observability/SKILL.md) - Connection monitoring
- [background-jobs](../background-jobs/SKILL.md) - Event processing

## References

- [WebSocket RFC 6455](https://datatracker.ietf.org/doc/html/rfc6455)
- [Server-Sent Events MDN](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [Socket.IO Documentation](https://socket.io/docs/)
