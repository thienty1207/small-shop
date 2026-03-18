use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Raw database row for `cart_items`.
#[derive(Debug, Clone, sqlx::FromRow, Serialize)]
pub struct CartItem {
    pub id: Uuid,
    pub user_id: Uuid,
    pub product_id: Uuid,
    pub quantity: i32,
    pub variant: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Cart item with product details joined (for API response).
#[derive(Debug, sqlx::FromRow, Serialize)]
pub struct CartItemWithProduct {
    pub id: Uuid,
    pub product_id: Uuid,
    pub product_name: String,
    pub product_image: String,
    pub product_slug: String,
    pub price: i64,
    pub original_price: Option<i64>,
    pub stock: i32,
    pub quantity: i32,
    pub variant: String,
}

/// Request body for adding/updating a cart item.
#[derive(Debug, Deserialize)]
pub struct AddToCartInput {
    pub product_id: Uuid,
    pub quantity: i32,
    pub variant: Option<String>,
}

/// Request body for updating a cart item quantity.
#[derive(Debug, Deserialize)]
pub struct UpdateCartInput {
    pub quantity: i32,
}
