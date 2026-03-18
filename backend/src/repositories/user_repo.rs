use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::AppError,
    models::user::{NewUser, UpdateProfileInput, User},
};

/// Find a user by their Google account ID.
/// This is the primary lookup on every OAuth callback.
pub async fn find_by_google_id(pool: &PgPool, google_id: &str) -> Result<Option<User>, AppError> {
    let user = sqlx::query_as::<_, User>(
        r#"
        SELECT id, google_id, email, name, avatar_url, role,
               phone, address,
               refresh_token, token_expires_at, last_login_at,
               created_at, updated_at
        FROM users
        WHERE google_id = $1
        "#,
    )
    .bind(google_id)
    .fetch_optional(pool)
    .await?;

    Ok(user)
}

/// Find a user by email address.
/// Used to detect account merges (same email, different provider).
pub async fn find_by_email(pool: &PgPool, email: &str) -> Result<Option<User>, AppError> {
    let user = sqlx::query_as::<_, User>(
        r#"
        SELECT id, google_id, email, name, avatar_url, role,
               phone, address,
               refresh_token, token_expires_at, last_login_at,
               created_at, updated_at
        FROM users
        WHERE email = $1
        "#,
    )
    .bind(email)
    .fetch_optional(pool)
    .await?;

    Ok(user)
}

/// Find a user by their internal UUID.
pub async fn find_by_id(pool: &PgPool, id: Uuid) -> Result<Option<User>, AppError> {
    let user = sqlx::query_as::<_, User>(
        r#"
        SELECT id, google_id, email, name, avatar_url, role,
               phone, address,
               refresh_token, token_expires_at, last_login_at,
               created_at, updated_at
        FROM users
        WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(pool)
    .await?;

    Ok(user)
}

/// Insert a new user row and return the created record.
pub async fn insert_user(pool: &PgPool, data: NewUser) -> Result<User, AppError> {
    let user = sqlx::query_as::<_, User>(
        r#"
        INSERT INTO users (google_id, email, name, avatar_url)
        VALUES ($1, $2, $3, $4)
        RETURNING id, google_id, email, name, avatar_url, role,
                  phone, address,
                  refresh_token, token_expires_at, last_login_at,
                  created_at, updated_at
        "#,
    )
    .bind(&data.google_id)
    .bind(&data.email)
    .bind(&data.name)
    .bind(&data.avatar_url)
    .fetch_one(pool)
    .await?;

    Ok(user)
}

/// Stamp the `last_login_at` column with the current timestamp.
pub async fn update_last_login(pool: &PgPool, user_id: Uuid) -> Result<(), AppError> {
    sqlx::query("UPDATE users SET last_login_at = now() WHERE id = $1")
        .bind(user_id)
        .execute(pool)
        .await?;

    Ok(())
}

/// Update the user's editable profile fields (phone and address).
pub async fn update_profile(
    pool: &PgPool,
    user_id: Uuid,
    input: &UpdateProfileInput,
) -> Result<User, AppError> {
    let user = sqlx::query_as::<_, User>(
        r#"
        UPDATE users
        SET phone = $1, address = $2, updated_at = now()
        WHERE id = $3
        RETURNING id, google_id, email, name, avatar_url, role,
                  phone, address,
                  refresh_token, token_expires_at, last_login_at,
                  created_at, updated_at
        "#,
    )
    .bind(&input.phone)
    .bind(&input.address)
    .bind(user_id)
    .fetch_one(pool)
    .await?;

    Ok(user)
}

/// Update the user's avatar URL.
pub async fn update_avatar_url(
    pool: &PgPool,
    user_id: Uuid,
    avatar_url: &str,
) -> Result<User, AppError> {
    let user = sqlx::query_as::<_, User>(
        r#"
        UPDATE users
        SET avatar_url = $1, updated_at = now()
        WHERE id = $2
        RETURNING id, google_id, email, name, avatar_url, role,
                  phone, address,
                  refresh_token, token_expires_at, last_login_at,
                  created_at, updated_at
        "#,
    )
    .bind(avatar_url)
    .bind(user_id)
    .fetch_one(pool)
    .await?;

    Ok(user)
}
