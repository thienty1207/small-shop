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
