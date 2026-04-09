use chrono::{DateTime, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use crate::error::AppError;

/// Persist a token revocation record.
///
/// Idempotent for the same token hash.
pub async fn revoke_token(
    pool: &PgPool,
    token_hash: &str,
    expires_at: DateTime<Utc>,
    revoked_by_role: &str,
    revoked_by_user_id: Option<Uuid>,
) -> Result<(), AppError> {
    sqlx::query(
        r#"
        INSERT INTO revoked_tokens (token_hash, expires_at, revoked_by_role, revoked_by_user_id)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (token_hash) DO NOTHING
        "#,
    )
    .bind(token_hash)
    .bind(expires_at)
    .bind(revoked_by_role)
    .bind(revoked_by_user_id)
    .execute(pool)
    .await?;

    Ok(())
}

/// Return true if a non-expired revocation record exists for the token hash.
pub async fn is_token_revoked(pool: &PgPool, token_hash: &str) -> Result<bool, AppError> {
    let exists: bool = sqlx::query_scalar(
        r#"
        SELECT EXISTS (
            SELECT 1
            FROM revoked_tokens
            WHERE token_hash = $1
              AND expires_at > now()
        )
        "#,
    )
    .bind(token_hash)
    .fetch_one(pool)
    .await?;

    Ok(exists)
}

/// Best-effort cleanup for expired revocation rows.
pub async fn purge_expired(pool: &PgPool) -> Result<u64, AppError> {
    let res = sqlx::query(
        r#"
        DELETE FROM revoked_tokens
        WHERE expires_at <= now()
        "#,
    )
    .execute(pool)
    .await?;

    Ok(res.rows_affected())
}
