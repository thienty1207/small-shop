use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ---------------------------------------------------------------------------
// Database model — mirrors the `users` table exactly
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
/// Internal user entity mapped directly from the `users` table.
pub struct User {
    pub id: Uuid,
    pub google_id: String,
    pub email: String,
    pub name: String,
    pub avatar_url: Option<String>,
    pub role: String,
    pub phone: Option<String>,
    pub address: Option<String>,
    // Reserved for future refresh token flow
    pub refresh_token: Option<String>,
    pub token_expires_at: Option<DateTime<Utc>>,
    pub last_login_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// ---------------------------------------------------------------------------
// Google OAuth — response from https://www.googleapis.com/oauth2/v2/userinfo
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
/// User profile payload returned by Google userinfo API.
pub struct GoogleUserInfo {
    pub id: String,
    pub email: String,
    pub name: String,
    pub picture: Option<String>,
}

// ---------------------------------------------------------------------------
// JWT Claims — encoded inside every issued token
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize, Deserialize, Clone)]
/// Claims embedded in JWT tokens issued by backend.
pub struct Claims {
    /// Subject: user UUID
    pub sub: String,
    pub email: String,
    pub name: String,
    pub role: String,
    /// Expiry (Unix timestamp)
    pub exp: i64,
    /// Issued at (Unix timestamp)
    pub iat: i64,
}

// ---------------------------------------------------------------------------
// API response — returned to the frontend after successful login
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize)]
/// Response payload returned after successful login.
pub struct AuthResponse {
    pub token: String,
    pub user: UserPublic,
}

/// Public-safe user representation (no internal fields exposed)
#[derive(Debug, Serialize, Clone)]
pub struct UserPublic {
    pub id: Uuid,
    pub email: String,
    pub name: String,
    pub avatar_url: Option<String>,
    pub role: String,
    pub phone: Option<String>,
    pub address: Option<String>,
}

impl From<User> for UserPublic {
    fn from(u: User) -> Self {
        Self {
            id: u.id,
            email: u.email,
            name: u.name,
            avatar_url: u.avatar_url,
            role: u.role,
            phone: u.phone,
            address: u.address,
        }
    }
}

/// Input for updating a user's editable profile fields.
#[derive(Debug, Deserialize)]
pub struct UpdateProfileInput {
    pub phone: Option<String>,
    pub address: Option<String>,
}

// ---------------------------------------------------------------------------
// Input for inserting a new user
// ---------------------------------------------------------------------------

/// Internal payload used to insert a new user in DB.
pub struct NewUser {
    pub google_id: String,
    pub email: String,
    pub name: String,
    pub avatar_url: Option<String>,
}
