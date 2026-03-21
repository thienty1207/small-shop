use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

// =========================
// 1) DB MODELS (sqlx rows)
// =========================

#[derive(Debug, Serialize, Deserialize, FromRow)]
/// Wishlist entity in DB representing a favorited user-product relation.
pub struct WishlistItem {
    pub user_id: Uuid,
    pub product_id: Uuid,
    pub created_at: Option<DateTime<Utc>>,
}
