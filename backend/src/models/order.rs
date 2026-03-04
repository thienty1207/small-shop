use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

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
}

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
