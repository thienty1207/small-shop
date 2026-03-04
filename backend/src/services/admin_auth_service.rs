use std::sync::Arc;

use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use chrono::Utc;
use jsonwebtoken::{encode, EncodingKey, Header};
use sqlx::PgPool;

use crate::{
    config::Config,
    error::AppError,
    models::{admin::AdminUser, user::Claims},
    repositories::admin_repo,
};

// ---------------------------------------------------------------------------
// Password hashing (Argon2id)
// ---------------------------------------------------------------------------

/// Hash a plaintext password using Argon2id.
/// Returns a PHC string (including salt + params) safe to store in the DB.
pub fn hash_password(password: &str) -> Result<String, AppError> {
    let salt = SaltString::generate(&mut OsRng);
    Argon2::default()
        .hash_password(password.as_bytes(), &salt)
        .map(|h| h.to_string())
        .map_err(|e| AppError::Internal(format!("Password hashing failed: {e}")))
}

/// Verify a plaintext password against a stored Argon2id hash.
pub fn verify_password(password: &str, hash: &str) -> Result<bool, AppError> {
    let parsed = PasswordHash::new(hash)
        .map_err(|e| AppError::Internal(format!("Invalid password hash format: {e}")))?;

    Ok(Argon2::default()
        .verify_password(password.as_bytes(), &parsed)
        .is_ok())
}

// ---------------------------------------------------------------------------
// JWT for admin
// ---------------------------------------------------------------------------

/// Issue a JWT for an authenticated admin user.
/// Reuses the shared `Claims` struct so `admin_guard` can verify with the
/// same `auth_service::verify_jwt` function.
pub fn generate_admin_jwt(config: &Arc<Config>, admin: &AdminUser) -> Result<String, AppError> {
    let now    = Utc::now().timestamp();
    let expiry = now + config.jwt_expiration_hours * 3_600;

    let claims = Claims {
        sub:   admin.id.to_string(),
        email: String::new(), // admin accounts have no email
        name:  admin.username.clone(),
        role:  "admin".into(),
        exp:   expiry,
        iat:   now,
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(config.jwt_secret.as_bytes()),
    )
    .map_err(|e| AppError::Internal(format!("JWT signing error: {e}")))
}

// ---------------------------------------------------------------------------
// Startup seed
// ---------------------------------------------------------------------------

/// Ensure the bootstrap admin account exists in the `admin_users` table.
///
/// Called once during application startup after database migrations run.
/// If no admin account exists, creates one from the environment-provided
/// `ADMIN_USERNAME` / `ADMIN_PASSWORD` credentials.
///
/// This is intentionally idempotent — safe to call on every restart.
pub async fn seed_admin_user(pool: &PgPool, config: &Config) -> Result<(), AppError> {
    let existing_count = admin_repo::count(pool).await?;

    if existing_count == 0 {
        let hash = hash_password(&config.admin_password)?;
        admin_repo::create(pool, &config.admin_username, &hash).await?;

        tracing::info!(
            "Admin account '{}' created successfully",
            config.admin_username
        );
    } else {
        tracing::info!(
            "Admin account already exists — skipping seed"
        );
    }

    Ok(())
}
