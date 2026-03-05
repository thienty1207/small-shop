use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::AppError,
    models::admin::{AdminUser, StaffListItem},
};

/// Look up an admin account by username.
pub async fn find_by_username(
    pool: &PgPool,
    username: &str,
) -> Result<Option<AdminUser>, AppError> {
    let row = sqlx::query_as::<_, AdminUser>(
        "SELECT id, username, password_hash, full_name, role, is_active, created_at
         FROM admin_users
         WHERE username = $1",
    )
    .bind(username)
    .fetch_optional(pool)
    .await?;

    Ok(row)
}

/// Look up an admin account by primary key.
pub async fn find_by_id(pool: &PgPool, id: Uuid) -> Result<Option<AdminUser>, AppError> {
    let row = sqlx::query_as::<_, AdminUser>(
        "SELECT id, username, password_hash, full_name, role, is_active, created_at
         FROM admin_users
         WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(pool)
    .await?;

    Ok(row)
}

/// Insert a new admin account (used for seeding + staff creation).
pub async fn create(
    pool: &PgPool,
    username: &str,
    password_hash: &str,
) -> Result<AdminUser, AppError> {
    let row = sqlx::query_as::<_, AdminUser>(
        "INSERT INTO admin_users (username, password_hash)
         VALUES ($1, $2)
         RETURNING id, username, password_hash, full_name, role, is_active, created_at",
    )
    .bind(username)
    .bind(password_hash)
    .fetch_one(pool)
    .await?;

    Ok(row)
}

/// Return the total number of admin accounts.
pub async fn count(pool: &PgPool) -> Result<i64, AppError> {
    let row: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM admin_users")
        .fetch_one(pool)
        .await?;

    Ok(row.0)
}

// ─── Staff CRUD (B7) ─────────────────────────────────────────────────────────

/// List all staff members (lightweight, no password hash).
pub async fn list_staff(pool: &PgPool) -> Result<Vec<StaffListItem>, AppError> {
    let rows = sqlx::query_as::<_, StaffListItem>(
        "SELECT id, username, full_name, role, is_active, created_at
         FROM admin_users
         ORDER BY created_at ASC",
    )
    .fetch_all(pool)
    .await?;

    Ok(rows)
}

/// Create a new staff member with a specific role.
pub async fn create_staff(
    pool: &PgPool,
    username: &str,
    password_hash: &str,
    full_name: &str,
    role: &str,
) -> Result<StaffListItem, AppError> {
    let row = sqlx::query_as::<_, StaffListItem>(
        "INSERT INTO admin_users (username, password_hash, full_name, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id, username, full_name, role, is_active, created_at",
    )
    .bind(username)
    .bind(password_hash)
    .bind(full_name)
    .bind(role)
    .fetch_one(pool)
    .await?;

    Ok(row)
}

/// Update staff member info (optionally reset password).
pub async fn update_staff(
    pool: &PgPool,
    id: Uuid,
    full_name: &str,
    role: &str,
    is_active: bool,
    password_hash: Option<&str>,
) -> Result<StaffListItem, AppError> {
    // If password_hash provided, update it too; otherwise leave it unchanged
    let row = if let Some(hash) = password_hash {
        sqlx::query_as::<_, StaffListItem>(
            "UPDATE admin_users
             SET full_name = $2, role = $3, is_active = $4, password_hash = $5
             WHERE id = $1
             RETURNING id, username, full_name, role, is_active, created_at",
        )
        .bind(id)
        .bind(full_name)
        .bind(role)
        .bind(is_active)
        .bind(hash)
        .fetch_optional(pool)
        .await?
    } else {
        sqlx::query_as::<_, StaffListItem>(
            "UPDATE admin_users
             SET full_name = $2, role = $3, is_active = $4
             WHERE id = $1
             RETURNING id, username, full_name, role, is_active, created_at",
        )
        .bind(id)
        .bind(full_name)
        .bind(role)
        .bind(is_active)
        .fetch_optional(pool)
        .await?
    };

    row.ok_or_else(|| AppError::NotFound(format!("Staff {id} not found")))
}

/// Delete a staff member. Prevents deleting super_admin accounts.
pub async fn delete_staff(pool: &PgPool, id: Uuid) -> Result<(), AppError> {
    // Get the role first — super_admin cannot be deleted
    let role: Option<String> = sqlx::query_scalar(
        "SELECT role FROM admin_users WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(pool)
    .await?;

    match role.as_deref() {
        None => return Err(AppError::NotFound(format!("Staff {id} not found"))),
        Some("super_admin") => {
            return Err(AppError::BadRequest("Không thể xoá tài khoản super_admin".into()))
        }
        _ => {}
    }

    sqlx::query("DELETE FROM admin_users WHERE id = $1")
        .bind(id)
        .execute(pool)
        .await?;

    Ok(())
}
