use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ---------------------------------------------------------------------------
// Database model — mirrors the `admin_users` table exactly
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, sqlx::FromRow)]
pub struct AdminUser {
    pub id:            Uuid,
    pub username:      String,
    pub password_hash: String,
    pub created_at:    DateTime<Utc>,
}

// ---------------------------------------------------------------------------
// Public-safe representation (no password_hash)
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize)]
pub struct AdminPublic {
    pub id:       Uuid,
    pub username: String,
}

impl From<AdminUser> for AdminPublic {
    fn from(u: AdminUser) -> Self {
        Self { id: u.id, username: u.username }
    }
}

// ---------------------------------------------------------------------------
// Request / response DTOs
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
pub struct AdminLoginInput {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
pub struct AdminLoginResponse {
    pub token: String,
    pub user:  AdminPublic,
}

// ---------------------------------------------------------------------------
// Dashboard aggregates (B4)
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize)]
pub struct DashboardStats {
    pub revenue_today:           i64,
    pub revenue_this_month:      i64,
    pub orders_total:            i64,
    pub orders_pending:          i64,
    pub orders_confirmed:        i64,
    pub orders_shipping:         i64,
    pub orders_delivered:        i64,
    pub orders_cancelled:        i64,
    pub customers_total:            i64,
    pub new_customers_this_month:    i64,
    pub products_total:              i64,
    pub products_out_of_stock:   i64,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct RevenuePoint {
    pub month:   String,
    pub revenue: i64,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct TopProduct {
    pub id:         Uuid,
    pub name:       String,
    pub image_url:  String,
    pub units_sold: i64,
    pub revenue:    i64,
}
