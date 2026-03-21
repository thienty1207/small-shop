use crate::{
    error::AppError,
    models::settings::UpdateSettingsInput,
    repositories::settings_repo,
    state::AppState,
};

pub async fn get_settings(state: &AppState) -> Result<serde_json::Value, AppError> {
    let settings = settings_repo::get_all(&state.db).await?;
    serde_json::to_value(settings).map_err(|e| AppError::Internal(format!("Serialization error: {e}")))
}

pub async fn update_settings(
    state: &AppState,
    input: &UpdateSettingsInput,
) -> Result<serde_json::Value, AppError> {
    settings_repo::upsert_bulk(&state.db, &input.settings).await?;
    get_settings(state).await
}

pub async fn get_public_settings(
    state: &AppState,
) -> Result<serde_json::Value, AppError> {
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
        "brand_slide_1_href",
        "brand_slide_2_img",
        "brand_slide_2_thumbnail",
        "brand_slide_2_href",
        "brand_slide_3_img",
        "brand_slide_3_thumbnail",
        "brand_slide_3_href",
        "shop_font",
    ];

    let settings = settings_repo::get_by_keys(&state.db, public_keys).await?;

    let map: serde_json::Map<String, serde_json::Value> = settings
        .into_iter()
        .map(|(k, v)| (k, serde_json::Value::String(v)))
        .collect();

    Ok(serde_json::Value::Object(map))
}
