use axum::{extract::{Query, State}, Extension, Json};

use crate::{
    error::AppError,
    models::{
        admin::AdminPublic,
        notification::{CreateSystemAnnouncementInput, NotificationQuery},
    },
    services::{notification_service, permissions_service},
    state::AppState,
};

/// GET /api/admin/system-notifications
pub async fn list_announcements(
    State(state): State<AppState>,
    Extension(admin): Extension<AdminPublic>,
    Query(query): Query<NotificationQuery>,
) -> Result<Json<serde_json::Value>, AppError> {
    permissions_service::require_permission(&state, &admin, "settings.view").await?;
    let payload = notification_service::list_system_announcements(&state, &query).await?;
    Ok(Json(payload))
}

/// POST /api/admin/system-notifications
pub async fn create_announcement(
    State(state): State<AppState>,
    Extension(admin): Extension<AdminPublic>,
    Json(input): Json<CreateSystemAnnouncementInput>,
) -> Result<Json<serde_json::Value>, AppError> {
    permissions_service::require_permission(&state, &admin, "settings.edit").await?;
    let payload = notification_service::publish_system_announcement(&state, admin.id, &input).await?;
    Ok(Json(payload))
}
