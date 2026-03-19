use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// =========================
// 1) DB MODELS (sqlx rows)
// =========================
// These structs map directly to database query results.
// They usually derive `sqlx::FromRow` (or are used with `query_as!`).

/// Raw database row for `orders`.
#[derive(Debug, Clone, sqlx::FromRow, Serialize)]
pub struct Order {
    pub id: Uuid,
    pub order_code: String,
    pub user_id: Option<Uuid>,
    pub customer_name: String,
    pub customer_email: String,
    pub customer_phone: String,
    pub address: String,
    pub note: Option<String>,
    pub payment_method: String,
    pub status: String,
    pub subtotal: i64,
    pub shipping_fee: i64,
    pub total: i64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Raw database row for `order_items`.
#[derive(Debug, Clone, sqlx::FromRow, Serialize)]
pub struct OrderItem {
    pub id: Uuid,
    pub order_id: Uuid,
    pub product_id: Option<Uuid>,
    pub product_name: String,
    pub product_image: String,
    pub variant: String,
    pub quantity: i32,
    pub unit_price: i64,
    pub subtotal: i64,
}

// ========================
// 2) INPUT DTOs (request)
// ========================
// These structs represent data coming FROM client requests.
// They derive `Deserialize` because JSON request bodies are parsed into them.

/// A single line item in a checkout request.
#[derive(Debug, Deserialize, Clone)]
pub struct OrderItemInput {
    pub product_id: Uuid,
    pub product_name: String,
    pub product_image: String,
    pub variant: Option<String>,
    pub quantity: i32,
    pub unit_price: i64,
}

/// Request body for placing an order (COD).
#[derive(Debug, Deserialize)]
pub struct CreateOrderInput {
    pub customer_name: String,
    pub customer_email: String,
    pub customer_phone: String,
    pub address: String,
    pub note: Option<String>,
    pub payment_method: String, // "cod" | "bank_transfer" | "wallet"
    pub items: Vec<OrderItemInput>,
    pub coupon_code: Option<String>,
    pub discount_amt: Option<i64>,
}

// =========================
// 3) OUTPUT DTOs (response)
// =========================
// These structs represent data returned TO API clients.
// They derive `Serialize` so Axum can convert them to JSON responses.

/// Full order response including items.
#[derive(Debug, Serialize)]
pub struct OrderPublic {
    pub id: Uuid,
    pub order_code: String,
    pub customer_name: String,
    pub customer_email: String,
    pub customer_phone: String,
    pub address: String,
    pub note: Option<String>,
    pub payment_method: String,
    pub status: String,
    pub subtotal: i64,
    pub shipping_fee: i64,
    pub total: i64,
    pub items: Vec<OrderItem>,
    pub created_at: DateTime<Utc>,
}

/// Lightweight order summary for the account orders list (includes item count).
#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct OrderListItem {
    pub id: Uuid,
    pub order_code: String,
    pub status: String,
    pub total: i64,
    pub items_count: i64,
    pub created_at: DateTime<Utc>,
}

// ─── Admin-only types ────────────────────────────────────────────────────────

/// Richer order summary for the admin order list.
#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct AdminOrderListItem {
    pub id: Uuid,
    pub order_code: String,
    pub customer_name: String,
    pub customer_email: String,
    pub customer_phone: String,
    pub status: String,
    pub payment_method: String,
    pub total: i64,
    pub items_count: i64,
    pub created_at: DateTime<Utc>,
}

// =====================================
// 4) QUERY DTOs (URL query parameters)
// =====================================
// Used for parsing query strings like ?status=pending&page=2&limit=20.
/// Query params for the admin order list.
#[derive(Debug, Deserialize, Default)]
pub struct AdminOrderQuery {
    pub status: Option<String>,
    pub search: Option<String>,
    #[serde(default = "default_order_page")]
    pub page: i64,
    #[serde(default = "default_order_limit")]
    pub limit: i64,
}

fn default_order_page() -> i64 {
    1
}
fn default_order_limit() -> i64 {
    20
}

// =======================================
// 5) INPUT DTOs (small update requests)
// =======================================
/// Request body for updating an order's status.
#[derive(Debug, Deserialize)]
pub struct UpdateOrderStatusInput {
    pub status: String,
    pub note: Option<String>,
}
