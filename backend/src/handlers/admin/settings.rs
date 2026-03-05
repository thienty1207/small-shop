use axum::{extract::State, Extension, Json};

use crate::{
    error::AppError,
    models::{admin::AdminPublic, settings::UpdateSettingsInput},
    repositories::settings_repo,
    state::AppState,
};

/// GET /api/admin/settings — fetch all settings as key-value map
pub async fn get_settings(
    State(state): State<AppState>,
    Extension(_admin): Extension<AdminPublic>,
) -> Result<Json<serde_json::Value>, AppError> {
    let settings = settings_repo::get_all(&state.db).await?;
    Ok(Json(serde_json::to_value(settings).unwrap_or_default()))
}

/// PUT /api/admin/settings — bulk-upsert settings (super_admin only)
pub async fn update_settings(
    State(state): State<AppState>,
    Extension(admin): Extension<AdminPublic>,
    Json(input): Json<UpdateSettingsInput>,
) -> Result<Json<serde_json::Value>, AppError> {
    if admin.role != "super_admin" {
        return Err(AppError::Forbidden("Chỉ super_admin mới có thể thay đổi cài đặt".into()));
    }

    settings_repo::upsert_bulk(&state.db, &input.settings).await?;
    let updated = settings_repo::get_all(&state.db).await?;
    Ok(Json(serde_json::to_value(updated).unwrap_or_default()))
}

/// GET /api/settings — public endpoint: returns selected settings for the client
pub async fn get_public_settings(
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, AppError> {
    let all = settings_repo::get_all(&state.db).await?;

    // Only expose the keys safe for public consumption
    let public_keys = [
        "store_name",
        "store_phone",
        "store_facebook",
        "store_instagram",
        "store_tiktok",
        "hero_title",
        "hero_subtitle",
        "hero_image_url",
        "banner_image_url",
        "banner_link",
        "shipping_fee_default",
        "free_shipping_from",
    ];

    let public: serde_json::Map<String, serde_json::Value> = public_keys
        .iter()
        .filter_map(|k| {
            all.get(*k)
                .map(|v| (k.to_string(), serde_json::Value::String(v.clone())))
        })
        .collect();

    Ok(Json(serde_json::Value::Object(public)))
}
