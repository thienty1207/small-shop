use axum::{
    extract::State,
    http::{header, HeaderValue},
    response::IntoResponse,
    Extension, Json,
};

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
    let value = serde_json::to_value(settings)
        .map_err(|e| AppError::Internal(format!("Serialization error: {e}")))?;
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

    settings_repo::upsert_bulk(&state.db, &input.settings).await?;
    let updated = settings_repo::get_all(&state.db).await?;
    let value = serde_json::to_value(updated)
        .map_err(|e| AppError::Internal(format!("Serialization error: {e}")))?;
    Ok(Json(value))
}

/// GET /api/settings — public endpoint: returns selected settings for the client
pub async fn get_public_settings(
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    // Query only the keys we need — no full table scan
    let public_keys: &[&str] = &[
        "store_name",
        "store_email",
        "store_phone",
        "store_address",
        "social_facebook",
        "social_instagram",
        "social_tiktok",
        "hero_title",
        "hero_subtitle",
        "hero_image_url",
        "banner_image_url",
        "banner_link",
        "banner_title",
        "banner_subtitle",
        "shipping_fee_default",
        "free_shipping_from",
        "hero_slide_1_img",
        "hero_slide_1_title",
        "hero_slide_1_subtitle",
        "hero_slide_1_cta",
        "hero_slide_1_href",
        "hero_slide_2_img",
        "hero_slide_2_title",
        "hero_slide_2_subtitle",
        "hero_slide_2_cta",
        "hero_slide_2_href",
        "hero_slide_3_img",
        "hero_slide_3_title",
        "hero_slide_3_subtitle",
        "hero_slide_3_cta",
        "hero_slide_3_href",
        "brand_section_title",
        "brand_slide_1_img",
        "brand_slide_1_thumbnail",
        "brand_slide_2_img",
        "brand_slide_2_thumbnail",
        "brand_slide_3_img",
        "brand_slide_3_thumbnail",
        "shop_font",
    ];

    let settings = settings_repo::get_by_keys(&state.db, public_keys).await?;

    let map: serde_json::Map<String, serde_json::Value> = settings
        .into_iter()
        .map(|(k, v)| (k, serde_json::Value::String(v)))
        .collect();

    Ok((
        [(
            header::CACHE_CONTROL,
            HeaderValue::from_static("no-store, no-cache, must-revalidate"),
        )],
        Json(serde_json::Value::Object(map)),
    ))
}
