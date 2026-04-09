use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

// ========================
// 1) INPUT DTOs (request)
// ========================

/// Incoming request body for the contact form submission.
#[derive(Debug, Deserialize, Validate)]
pub struct ContactRequest {
    #[validate(length(
        min = 2,
        max = 100,
        message = "Name must be between 2 and 100 characters"
    ))]
    pub name: String,

    #[validate(email(message = "Invalid email address"))]
    pub email: String,

    /// Optional phone number (no strict format enforced server-side)
    pub phone: Option<String>,

    #[validate(length(
        min = 10,
        max = 2000,
        message = "Message must be between 10 and 2000 characters"
    ))]
    pub message: String,

    /// Cloudflare Turnstile challenge token — required, verified server-side
    pub cf_turnstile_response: String,
}

// =========================
// 2) DB MODELS (sqlx rows)
// =========================

/// Database row returned after inserting a contact message.
#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct ContactMessage {
    pub id: Uuid,
    pub name: String,
    pub email: String,
    pub phone: Option<String>,
    pub message: String,
    pub ip_address: Option<String>,
    pub created_at: DateTime<Utc>,
}
