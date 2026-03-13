use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Raw DB row for the `reviews` table.
#[derive(Debug, Clone, sqlx::FromRow, Serialize)]
pub struct Review {
    pub id:         Uuid,
    pub product_id: Uuid,
    pub user_id:    Uuid,
    pub rating:     i16,
    pub comment:    Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Review enriched with reviewer name + avatar (for display).
#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct ReviewPublic {
    pub id:          Uuid,
    pub product_id:  Uuid,
    pub user_id:     Uuid,
    pub user_name:   String,
    pub user_avatar: Option<String>,
    pub rating:      i16,
    pub comment:     Option<String>,
    pub created_at:  DateTime<Utc>,
}

/// Request body to create or update a review.
#[derive(Debug, Deserialize)]
pub struct CreateReviewInput {
    pub rating:  i16,
    pub comment: Option<String>,
}

/// Query params for listing reviews.
#[derive(Debug, Deserialize, Default)]
pub struct ReviewQuery {
    #[serde(default = "default_page")]
    pub page:  i64,
    #[serde(default = "default_limit")]
    pub limit: i64,
}

fn default_page()  -> i64 { 1 }
fn default_limit() -> i64 { 10 }
