use axum::{extract::{Query, State}, Extension, Json};

use crate::{
    error::AppError,
    models::{notification::NotificationQuery, user::UserPublic},
    services::notification_service,
    state::AppState,
};

/// GET /api/notifications
pub async fn list_notifications(
    State(state): State<AppState>,
    Extension(user): Extension<UserPublic>,
    Query(query): Query<NotificationQuery>,
) -> Result<Json<serde_json::Value>, AppError> {
    let payload = notification_service::list_user_notifications(&state, user.id, &query).await?;
    Ok(Json(payload))
}

/// GET /api/notifications/unread-count
pub async fn unread_count(
    State(state): State<AppState>,
    Extension(user): Extension<UserPublic>,
) -> Result<Json<serde_json::Value>, AppError> {
    let payload = notification_service::unread_count(&state, user.id).await?;
    Ok(Json(payload))
}

/// POST /api/notifications/mark-all-read
pub async fn mark_all_read(
    State(state): State<AppState>,
    Extension(user): Extension<UserPublic>,
) -> Result<Json<serde_json::Value>, AppError> {
    let payload = notification_service::mark_all_read(&state, user.id).await?;
    Ok(Json(payload))
}
