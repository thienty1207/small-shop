use serde_json::Value;
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::AppError,
    models::notification::{NotificationQuery, SystemAnnouncementPublic, UserNotificationPublic},
};

pub struct CreateUserNotification<'a> {
    pub user_id: Uuid,
    pub notif_type: &'a str,
    pub title: &'a str,
    pub message: &'a str,
    pub related_type: Option<&'a str>,
    pub related_id: Option<Uuid>,
    pub data_json: Value,
}

pub async fn insert_user_notification(
    pool: &PgPool,
    input: CreateUserNotification<'_>,
) -> Result<UserNotificationPublic, AppError> {
    let row = sqlx::query_as::<_, UserNotificationPublic>(
        r#"
        INSERT INTO user_notifications
            (user_id, type, title, message, related_type, related_id, data_json)
        VALUES
            ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, type, title, message, related_type, related_id, data_json, is_read, created_at
        "#,
    )
    .bind(input.user_id)
    .bind(input.notif_type)
    .bind(input.title)
    .bind(input.message)
    .bind(input.related_type)
    .bind(input.related_id)
    .bind(input.data_json)
    .fetch_one(pool)
    .await?;

    Ok(row)
}

pub async fn list_user_notifications(
    pool: &PgPool,
    user_id: Uuid,
    query: &NotificationQuery,
) -> Result<(Vec<UserNotificationPublic>, i64), AppError> {
    let offset = (query.page - 1) * query.limit;

    let rows = sqlx::query_as::<_, UserNotificationPublic>(
        r#"
        SELECT id, type, title, message, related_type, related_id, data_json, is_read, created_at
        FROM user_notifications
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
        "#,
    )
    .bind(user_id)
    .bind(query.limit)
    .bind(offset)
    .fetch_all(pool)
    .await?;

    let total: i64 = sqlx::query_scalar(
        "SELECT COUNT(*)::bigint FROM user_notifications WHERE user_id = $1",
    )
    .bind(user_id)
    .fetch_one(pool)
    .await?;

    Ok((rows, total))
}

pub async fn count_unread(pool: &PgPool, user_id: Uuid) -> Result<i64, AppError> {
    let count = sqlx::query_scalar(
        "SELECT COUNT(*)::bigint FROM user_notifications WHERE user_id = $1 AND is_read = FALSE",
    )
    .bind(user_id)
    .fetch_one(pool)
    .await?;

    Ok(count)
}

pub async fn mark_all_read(pool: &PgPool, user_id: Uuid) -> Result<u64, AppError> {
    let result = sqlx::query(
        "UPDATE user_notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE",
    )
    .bind(user_id)
    .execute(pool)
    .await?;

    Ok(result.rows_affected())
}

pub async fn create_announcement(
    pool: &PgPool,
    admin_id: Uuid,
    title: &str,
    message: &str,
) -> Result<SystemAnnouncementPublic, AppError> {
    let row = sqlx::query_as::<_, SystemAnnouncementPublic>(
        r#"
        INSERT INTO system_announcements (title, message, created_by_admin_id)
        VALUES ($1, $2, $3)
        RETURNING id, title, message, created_by_admin_id,
            (
              SELECT au.full_name
              FROM admin_users au
              WHERE au.id = system_announcements.created_by_admin_id
            ) AS created_by_admin_name,
            created_at
        "#,
    )
    .bind(title)
    .bind(message)
    .bind(admin_id)
    .fetch_one(pool)
    .await?;

    Ok(row)
}

pub async fn broadcast_announcement_to_users(
    pool: &PgPool,
    announcement_id: Uuid,
    title: &str,
    message: &str,
) -> Result<u64, AppError> {
    let result = sqlx::query(
        r#"
        INSERT INTO user_notifications (user_id, type, title, message, related_type, related_id, data_json)
        SELECT u.id,
               'system_announcement',
               $2,
               $3,
               'announcement',
               $1,
               jsonb_build_object('announcement_id', $1)
        FROM users u
        "#,
    )
    .bind(announcement_id)
    .bind(title)
    .bind(message)
    .execute(pool)
    .await?;

    Ok(result.rows_affected())
}

pub async fn list_announcements(
    pool: &PgPool,
    query: &NotificationQuery,
) -> Result<(Vec<SystemAnnouncementPublic>, i64), AppError> {
    let offset = (query.page - 1) * query.limit;

    let rows = sqlx::query_as::<_, SystemAnnouncementPublic>(
        r#"
        SELECT sa.id,
               sa.title,
               sa.message,
               sa.created_by_admin_id,
               au.full_name AS created_by_admin_name,
               sa.created_at
        FROM system_announcements sa
        JOIN admin_users au ON au.id = sa.created_by_admin_id
        ORDER BY sa.created_at DESC
        LIMIT $1 OFFSET $2
        "#,
    )
    .bind(query.limit)
    .bind(offset)
    .fetch_all(pool)
    .await?;

    let total: i64 = sqlx::query_scalar("SELECT COUNT(*)::bigint FROM system_announcements")
        .fetch_one(pool)
        .await?;

    Ok((rows, total))
}
