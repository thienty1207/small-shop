use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;
use chrono::{DateTime, Utc};

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct WishlistItem {
    pub user_id: Uuid,
    pub product_id: Uuid,
    pub created_at: Option<DateTime<Utc>>,
}
