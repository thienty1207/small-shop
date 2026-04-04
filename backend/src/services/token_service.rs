use chrono::{DateTime, Utc};
use sha1::{Digest, Sha1};
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::AppError,
    models::user::Claims,
    repositories::token_repo,
};

/// Return a stable SHA-1 fingerprint for a raw JWT string.
///
/// We store only the fingerprint in DB to avoid keeping raw tokens at rest.
pub fn token_fingerprint(token: &str) -> String {
    let mut hasher = Sha1::new();
    hasher.update(token.as_bytes());
    format!("{:x}", hasher.finalize())
}

/// Check whether a raw token has been revoked.
pub async fn is_revoked(pool: &PgPool, raw_token: &str) -> Result<bool, AppError> {
    let fp = token_fingerprint(raw_token);
    token_repo::is_token_revoked(pool, &fp).await
}

/// Revoke a raw token until its JWT expiration time.
pub async fn revoke(
    pool: &PgPool,
    raw_token: &str,
    claims: &Claims,
    revoked_by_role: &str,
    revoked_by_user_id: Option<Uuid>,
) -> Result<(), AppError> {
    let expires_at = DateTime::<Utc>::from_timestamp(claims.exp, 0)
        .ok_or_else(|| AppError::BadRequest("Invalid token expiration claim".into()))?;

    let fp = token_fingerprint(raw_token);
    token_repo::revoke_token(pool, &fp, expires_at, revoked_by_role, revoked_by_user_id).await?;

    // Lightweight opportunistic cleanup.
    let _ = token_repo::purge_expired(pool).await;

    Ok(())
}
