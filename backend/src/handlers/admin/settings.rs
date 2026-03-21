use axum::{
    extract::State,
    http::{header, HeaderValue},
    response::IntoResponse,
    Extension, Json,
};

use crate::{
    error::AppError,
    models::{admin::AdminPublic, settings::UpdateSettingsInput},
    services::settings_service,
    state::AppState,
};

/// GET /api/admin/settings — fetch all settings as key-value map
pub async fn get_settings(
    State(state): State<AppState>,
    Extension(_admin): Extension<AdminPublic>,
) -> Result<Json<serde_json::Value>, AppError> {
    let value = settings_service::get_settings(&state).await?;
    Ok(Json(value))
}

/// PUT /api/admin/settings — bulk-upsert settings (super_admin only)
pub async fn update_settings(
    State(state): State<AppState>,
    Extension(admin): Extension<AdminPublic>,
    Json(input): Json<UpdateSettingsInput>,
) -> Result<Json<serde_json::Value>, AppError> {
    if admin.role != "super_admin" {
        return Err(AppError::Forbidden(
            "Chỉ super_admin mới có thể thay đổi cài đặt".into(),
        ));
    }

    let value = settings_service::update_settings(&state, &input).await?;
    Ok(Json(value))
}

/// GET /api/settings — public endpoint: returns selected settings for the client
pub async fn get_public_settings(
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    let payload = settings_service::get_public_settings(&state).await?;

    Ok((
        [(
            header::CACHE_CONTROL,
            HeaderValue::from_static("no-store, no-cache, must-revalidate"),
        )],
        Json(payload),
    ))
}
