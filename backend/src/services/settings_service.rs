use crate::{
    error::AppError, models::settings::UpdateSettingsInput, repositories::settings_repo,
    state::AppState,
};

/// Read all shop settings from DB and serialize as JSON API output.
pub async fn get_settings(state: &AppState) -> Result<serde_json::Value, AppError> {
    let settings = settings_repo::get_all(&state.db).await?;
    serde_json::to_value(settings)
        .map_err(|e| AppError::Internal(format!("Serialization error: {e}")))
}

/// Bulk-upsert settings, then reload and return the latest state.
pub async fn update_settings(
    state: &AppState,
    input: &UpdateSettingsInput,
) -> Result<serde_json::Value, AppError> {
    settings_repo::upsert_bulk(&state.db, &input.settings).await?;
    get_settings(state).await
}

/// Return a frontend-safe subset of public settings.
///
/// Only exposes keys from the `public_keys` allow-list.
pub async fn get_public_settings(state: &AppState) -> Result<serde_json::Value, AppError> {
    let public_keys: &[&str] = &[
        "store_name",
        "store_logo_url",
        "store_logo",
        "logo_url",
        "storeLogoUrl",
        "brand_logo_url",
        "logo",
        "store_email",
        "store_phone",
        "store_address",
        "social_facebook",
        "social_instagram",
        "social_tiktok",
        "footer_description",
        "footer_shop_title",
        "footer_info_title",
        "footer_contact_title",
        "footer_shop_link_1_label",
        "footer_shop_link_1_href",
        "footer_shop_link_2_label",
        "footer_shop_link_2_href",
        "footer_shop_link_3_label",
        "footer_shop_link_3_href",
        "footer_shop_link_4_label",
        "footer_shop_link_4_href",
        "footer_shop_link_5_label",
        "footer_shop_link_5_href",
        "footer_info_link_1_label",
        "footer_info_link_1_href",
        "footer_info_link_2_label",
        "footer_info_link_2_href",
        "footer_info_link_3_label",
        "footer_info_link_3_href",
        "footer_info_link_4_label",
        "footer_info_link_4_href",
        "footer_info_link_5_label",
        "footer_info_link_5_href",
        "footer_bottom_left",
        "footer_bottom_right",
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
        "hero_slide_1_video",
        "hero_slide_1_title",
        "hero_slide_1_discover_1_label",
        "hero_slide_1_discover_1_link",
        "hero_slide_1_discover_2_label",
        "hero_slide_1_discover_2_link",
        "hero_slide_1_discover_3_label",
        "hero_slide_1_discover_3_link",
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
        "homepage_featured_eyebrow",
        "homepage_featured_title",
        "homepage_featured_discover_label",
        "homepage_featured_left_discover_label",
        "homepage_featured_right_discover_label",
        "homepage_featured_left_title",
        "homepage_featured_left_image",
        "homepage_featured_left_link",
        "homepage_featured_right_title",
        "homepage_featured_right_image",
        "homepage_featured_right_link",
        "hero_section_3_image",
        "hero_section_3_link",
        "hero_section_3_title",
        "hero_section_3_discover_label",
        "hero_section_4_image_1",
        "hero_section_4_link_1",
        "hero_section_4_image_2",
        "hero_section_4_link_2",
        "hero_section_4_image_3",
        "hero_section_4_link_3",
        "hero_section_4_image_4",
        "hero_section_4_link_4",
        "hero_section_3_image_1",
        "hero_section_3_link_1",
        "hero_section_3_image_2",
        "hero_section_3_link_2",
        "hero_section_3_image_3",
        "hero_section_3_link_3",
        "hero_section_3_image_4",
        "hero_section_3_link_4",
        "hero_section_3_image_5",
        "hero_section_3_link_5",
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
