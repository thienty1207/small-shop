# WebSocket Implementation Patterns

> Core WebSocket patterns for bidirectional real-time communication.

## Connection Lifecycle

```
Client                    Server
  |                         |
  |------- Upgrade -------->|
  |<------ 101 Switch ------|
  |                         |
  |<====== Messages =======>|
  |                         |
  |------- Close Frame ---->|
  |<------ Close Frame -----|
  |                         |
```

## Rust/Axum - Full Implementation

### Hub Pattern (Broadcast)

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
use dashmap::DashMap;
use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::broadcast;
use uuid::Uuid;

#[derive(Clone)]
pub struct AppState {
    pub hub: Arc<Hub>,
}

pub struct Hub {
    pub clients: DashMap<String, Client>,
    pub rooms: DashMap<String, Vec<String>>,
    pub broadcast: broadcast::Sender<ServerMessage>,
}

pub struct Client {
    pub id: String,
    pub user_id: Option<String>,
    pub tx: tokio::sync::mpsc::Sender<Message>,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(tag = "type")]
pub enum ClientMessage {
    #[serde(rename = "join")]
    Join { room: String },
    #[serde(rename = "leave")]
    Leave { room: String },
    #[serde(rename = "message")]
    Message { room: String, content: String },
    #[serde(rename = "ping")]
    Ping,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(tag = "type")]
pub enum ServerMessage {
    #[serde(rename = "joined")]
    Joined { room: String, user_id: String },
    #[serde(rename = "left")]
    Left { room: String, user_id: String },
    #[serde(rename = "message")]
    Message { room: String, user_id: String, content: String },
    #[serde(rename = "pong")]
    Pong,
    #[serde(rename = "error")]
    Error { message: String },
}

impl Hub {
    pub fn new() -> Self {
        let (broadcast, _) = broadcast::channel(1000);
        Self {
            clients: DashMap::new(),
            rooms: DashMap::new(),
            broadcast,
        }
    }

    pub fn join_room(&self, client_id: &str, room: &str) {
        self.rooms
            .entry(room.to_string())
            .or_default()
            .push(client_id.to_string());
    }

    pub fn leave_room(&self, client_id: &str, room: &str) {
        if let Some(mut members) = self.rooms.get_mut(room) {
            members.retain(|id| id != client_id);
        }
    }

    pub async fn broadcast_to_room(&self, room: &str, message: ServerMessage) {
        let msg_text = serde_json::to_string(&message).unwrap();
        
        if let Some(members) = self.rooms.get(room) {
            for client_id in members.iter() {
                if let Some(client) = self.clients.get(client_id) {
                    let _ = client.tx.send(Message::Text(msg_text.clone())).await;
                }
            }
        }
    }
}

pub fn router(state: AppState) -> Router {
    Router::new()
        .route("/ws", get(ws_handler))
        .with_state(state)
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
) -> Response {
    ws.on_upgrade(move |socket| handle_socket(socket, state))
}

async fn handle_socket(socket: WebSocket, state: AppState) {
    let (mut sender, mut receiver) = socket.split();
    
    // Create client with unique ID
    let client_id = Uuid::new_v4().to_string();
    let (tx, mut rx) = tokio::sync::mpsc::channel::<Message>(100);
    
    state.hub.clients.insert(
        client_id.clone(),
        Client {
            id: client_id.clone(),
            user_id: None,
            tx,
        },
    );

    // Task for sending messages to client
    let send_task = tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            if sender.send(msg).await.is_err() {
                break;
            }
        }
    });

    // Handle incoming messages
    let hub = state.hub.clone();
    let client_id_clone = client_id.clone();
    
    let recv_task = tokio::spawn(async move {
        while let Some(Ok(msg)) = receiver.next().await {
            match msg {
                Message::Text(text) => {
                    if let Ok(client_msg) = serde_json::from_str::<ClientMessage>(&text) {
                        handle_client_message(&hub, &client_id_clone, client_msg).await;
                    }
                }
                Message::Close(_) => break,
                _ => {}
            }
        }
    });

    // Wait for tasks and cleanup
    tokio::select! {
        _ = send_task => {}
        _ = recv_task => {}
    }

    // Cleanup
    state.hub.clients.remove(&client_id);
}

async fn handle_client_message(hub: &Hub, client_id: &str, msg: ClientMessage) {
    match msg {
        ClientMessage::Join { room } => {
            hub.join_room(client_id, &room);
            hub.broadcast_to_room(
                &room,
                ServerMessage::Joined {
                    room: room.clone(),
                    user_id: client_id.to_string(),
                },
            )
            .await;
        }
        ClientMessage::Leave { room } => {
            hub.leave_room(client_id, &room);
            hub.broadcast_to_room(
                &room,
                ServerMessage::Left {
                    room: room.clone(),
                    user_id: client_id.to_string(),
                },
            )
            .await;
        }
        ClientMessage::Message { room, content } => {
            hub.broadcast_to_room(
                &room,
                ServerMessage::Message {
                    room,
                    user_id: client_id.to_string(),
                    content,
                },
            )
            .await;
        }
        ClientMessage::Ping => {
            if let Some(client) = hub.clients.get(client_id) {
                let pong = serde_json::to_string(&ServerMessage::Pong).unwrap();
                let _ = client.tx.send(Message::Text(pong)).await;
            }
        }
    }
}
```

## Go/Fiber - Full Implementation

```go
package websocket

import (
    "encoding/json"
    "sync"

    "github.com/gofiber/fiber/v2"
    "github.com/gofiber/fiber/v2/middleware/websocket"
    "github.com/google/uuid"
)

type Hub struct {
    clients map[string]*Client
    rooms   map[string]map[string]bool
    mu      sync.RWMutex
}

type Client struct {
    ID     string
    UserID string
    Conn   *websocket.Conn
    Hub    *Hub
}

type ClientMessage struct {
    Type    string `json:"type"`
    Room    string `json:"room,omitempty"`
    Content string `json:"content,omitempty"`
}

type ServerMessage struct {
    Type    string `json:"type"`
    Room    string `json:"room,omitempty"`
    UserID  string `json:"user_id,omitempty"`
    Content string `json:"content,omitempty"`
    Message string `json:"message,omitempty"`
}

func NewHub() *Hub {
    return &Hub{
        clients: make(map[string]*Client),
        rooms:   make(map[string]map[string]bool),
    }
}

func (h *Hub) Register(client *Client) {
    h.mu.Lock()
    defer h.mu.Unlock()
    h.clients[client.ID] = client
}

func (h *Hub) Unregister(client *Client) {
    h.mu.Lock()
    defer h.mu.Unlock()
    delete(h.clients, client.ID)
    
    // Leave all rooms
    for room, members := range h.rooms {
        delete(members, client.ID)
        if len(members) == 0 {
            delete(h.rooms, room)
        }
    }
}

func (h *Hub) JoinRoom(clientID, room string) {
    h.mu.Lock()
    defer h.mu.Unlock()
    
    if h.rooms[room] == nil {
        h.rooms[room] = make(map[string]bool)
    }
    h.rooms[room][clientID] = true
}

func (h *Hub) LeaveRoom(clientID, room string) {
    h.mu.Lock()
    defer h.mu.Unlock()
    
    if members, ok := h.rooms[room]; ok {
        delete(members, clientID)
    }
}

func (h *Hub) BroadcastToRoom(room string, msg ServerMessage) {
    h.mu.RLock()
    defer h.mu.RUnlock()
    
    members, ok := h.rooms[room]
    if !ok {
        return
    }
    
    data, _ := json.Marshal(msg)
    
    for clientID := range members {
        if client, ok := h.clients[clientID]; ok {
            client.Conn.WriteMessage(websocket.TextMessage, data)
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
        client := &Client{
            ID:   uuid.New().String(),
            Conn: c,
            Hub:  hub,
        }
        
        hub.Register(client)
        defer hub.Unregister(client)

        for {
            _, data, err := c.ReadMessage()
            if err != nil {
                break
            }

            var msg ClientMessage
            if err := json.Unmarshal(data, &msg); err != nil {
                continue
            }

            switch msg.Type {
            case "join":
                hub.JoinRoom(client.ID, msg.Room)
                hub.BroadcastToRoom(msg.Room, ServerMessage{
                    Type:   "joined",
                    Room:   msg.Room,
                    UserID: client.ID,
                })
            case "leave":
                hub.LeaveRoom(client.ID, msg.Room)
                hub.BroadcastToRoom(msg.Room, ServerMessage{
                    Type:   "left",
                    Room:   msg.Room,
                    UserID: client.ID,
                })
            case "message":
                hub.BroadcastToRoom(msg.Room, ServerMessage{
                    Type:    "message",
                    Room:    msg.Room,
                    UserID:  client.ID,
                    Content: msg.Content,
                })
            }
        }
    }))
}
```

## Python/FastAPI - Full Implementation

```python
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from typing import Dict, Set
import json
import uuid

app = FastAPI()

class ConnectionManager:
    def __init__(self):
        self.clients: Dict[str, WebSocket] = {}
        self.rooms: Dict[str, Set[str]] = {}

    async def connect(self, websocket: WebSocket) -> str:
        await websocket.accept()
        client_id = str(uuid.uuid4())
        self.clients[client_id] = websocket
        return client_id

    def disconnect(self, client_id: str):
        self.clients.pop(client_id, None)
        for room_members in self.rooms.values():
            room_members.discard(client_id)

    def join_room(self, client_id: str, room: str):
        if room not in self.rooms:
            self.rooms[room] = set()
        self.rooms[room].add(client_id)

    def leave_room(self, client_id: str, room: str):
        if room in self.rooms:
            self.rooms[room].discard(client_id)

    async def broadcast_to_room(self, room: str, message: dict):
        if room not in self.rooms:
            return
        
        text = json.dumps(message)
        for client_id in self.rooms[room]:
            if client_id in self.clients:
                await self.clients[client_id].send_text(text)

manager = ConnectionManager()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    client_id = await manager.connect(websocket)
    
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            
            if msg["type"] == "join":
                room = msg["room"]
                manager.join_room(client_id, room)
                await manager.broadcast_to_room(room, {
                    "type": "joined",
                    "room": room,
                    "user_id": client_id,
                })
            elif msg["type"] == "leave":
                room = msg["room"]
                manager.leave_room(client_id, room)
                await manager.broadcast_to_room(room, {
                    "type": "left",
                    "room": room,
                    "user_id": client_id,
                })
            elif msg["type"] == "message":
                room = msg["room"]
                await manager.broadcast_to_room(room, {
                    "type": "message",
                    "room": room,
                    "user_id": client_id,
                    "content": msg["content"],
                })
                
    except WebSocketDisconnect:
        manager.disconnect(client_id)
```

## Next.js Client - React Hook

```typescript
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

interface Message {
  type: string;
  room?: string;
  user_id?: string;
  content?: string;
}

interface UseWebSocketOptions {
  onMessage?: (message: Message) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  reconnect?: boolean;
  reconnectInterval?: number;
}

export function useWebSocket(url: string, options: UseWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    const ws = new WebSocket(url);

    ws.onopen = () => {
      setIsConnected(true);
      options.onConnect?.();
    };

    ws.onclose = () => {
      setIsConnected(false);
      options.onDisconnect?.();
      
      if (options.reconnect !== false) {
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, options.reconnectInterval || 3000);
      }
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data) as Message;
      options.onMessage?.(message);
    };

    wsRef.current = ws;
  }, [url, options]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimeoutRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const send = useCallback((message: Message) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const joinRoom = useCallback((room: string) => {
    send({ type: 'join', room });
  }, [send]);

  const leaveRoom = useCallback((room: string) => {
    send({ type: 'leave', room });
  }, [send]);

  const sendMessage = useCallback((room: string, content: string) => {
    send({ type: 'message', room, content });
  }, [send]);

  return {
    isConnected,
    joinRoom,
    leaveRoom,
    sendMessage,
    send,
  };
}
```

## Authentication

### JWT-based WebSocket Auth

```rust
// Rust - Auth via query parameter
async fn ws_handler(
    ws: WebSocketUpgrade,
    Query(params): Query<WsParams>,
    State(state): State<AppState>,
) -> Result<Response, StatusCode> {
    let token = params.token.ok_or(StatusCode::UNAUTHORIZED)?;
    let claims = validate_jwt(&token).map_err(|_| StatusCode::UNAUTHORIZED)?;
    
    Ok(ws.on_upgrade(move |socket| {
        handle_authenticated_socket(socket, state, claims.sub)
    }))
}

// Rust - Auth via first message
async fn handle_socket(socket: WebSocket, state: AppState) {
    let (mut sender, mut receiver) = socket.split();
    
    // Wait for auth message
    let auth_timeout = tokio::time::timeout(
        Duration::from_secs(5),
        receiver.next(),
    )
    .await;
    
    let user_id = match auth_timeout {
        Ok(Some(Ok(Message::Text(text)))) => {
            if let Ok(auth) = serde_json::from_str::<AuthMessage>(&text) {
                validate_jwt(&auth.token).ok().map(|c| c.sub)
            } else {
                None
            }
        }
        _ => None,
    };
    
    let Some(user_id) = user_id else {
        let _ = sender.send(Message::Close(None)).await;
        return;
    };
    
    // Continue with authenticated session...
}
```

## Best Practices

### Connection Management
- Implement heartbeat/ping-pong
- Handle reconnection on client side
- Set reasonable timeouts
- Clean up resources on disconnect

### Scalability
- Use Redis pub/sub for multi-instance
- Consider sticky sessions for simple cases
- Implement proper backpressure

### Security
- Always use WSS in production
- Validate origin header
- Authenticate connections
- Rate limit messages
