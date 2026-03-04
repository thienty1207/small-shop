use sqlx::PgPool;
use uuid::Uuid;

use crate::{error::AppError, models::admin::AdminUser};

/// Look up an admin account by username.
pub async fn find_by_username(
    pool: &PgPool,
    username: &str,
) -> Result<Option<AdminUser>, AppError> {
    let row = sqlx::query_as::<_, AdminUser>(
        "SELECT id, username, password_hash, created_at
         FROM admin_users
         WHERE username = $1",
    )
    .bind(username)
    .fetch_optional(pool)
    .await?;

    Ok(row)
}

/// Look up an admin account by primary key.
/// Used by `admin_guard` to confirm the admin still exists after JWT issuance.
pub async fn find_by_id(pool: &PgPool, id: Uuid) -> Result<Option<AdminUser>, AppError> {
    let row = sqlx::query_as::<_, AdminUser>(
        "SELECT id, username, password_hash, created_at
         FROM admin_users
         WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(pool)
    .await?;

    Ok(row)
}

/// Insert a new admin account.
/// Called once at startup to seed the bootstrap admin.
pub async fn create(
    pool: &PgPool,
    username: &str,
    password_hash: &str,
) -> Result<AdminUser, AppError> {
    let row = sqlx::query_as::<_, AdminUser>(
        "INSERT INTO admin_users (username, password_hash)
         VALUES ($1, $2)
         RETURNING id, username, password_hash, created_at",
    )
    .bind(username)
    .bind(password_hash)
    .fetch_one(pool)
    .await?;

    Ok(row)
}

/// Return the total number of admin accounts.
/// Used by the seed function to decide whether to create the bootstrap admin.
pub async fn count(pool: &PgPool) -> Result<i64, AppError> {
    let row: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM admin_users")
        .fetch_one(pool)
        .await?;

    Ok(row.0)
}
