use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::AppError,
    models::user::{UpdateProfileInput, UserPublic},
    repositories::user_repo,
    services::{auth_service, cloudinary as cloudinary_service},
    state::AppState,
};

/// Handle OAuth callback exchange and build frontend redirect URL with JWT token.
pub async fn build_oauth_redirect_url(state: &AppState, code: &str) -> Result<String, AppError> {
    let access_token = auth_service::exchange_code_for_token(&state.config, code).await?;
    let google_info = auth_service::fetch_google_user_info(&access_token).await?;
    let user = auth_service::upsert_user(&state.db, google_info).await?;
    let token = auth_service::generate_jwt(&state.config, &user)?;

    Ok(format!(
        "{}/auth/callback?token={}",
        state.config.frontend_url, token
    ))
}

/// Update editable user profile fields (for example phone/address).
pub async fn update_profile(
    db: &PgPool,
    user_id: Uuid,
    input: &UpdateProfileInput,
) -> Result<UserPublic, AppError> {
    let updated = user_repo::update_profile(db, user_id, input).await?;
    Ok(updated.into())
}

/// Infer upload image MIME type.
///
/// Prefers request `content-type`; falls back to filename extension when needed.
pub fn infer_image_content_type(raw_ct: &str, filename_hint: &str) -> Result<String, AppError> {
    let filename_hint = filename_hint.to_lowercase();
    if raw_ct.starts_with("image/") {
        Ok(raw_ct.to_string())
    } else if !raw_ct.is_empty() && !raw_ct.starts_with("image/") {
        Err(AppError::BadRequest("Only image files are allowed".into()))
    } else if filename_hint.ends_with(".png") {
        Ok("image/png".into())
    } else if filename_hint.ends_with(".webp") {
        Ok("image/webp".into())
    } else if filename_hint.ends_with(".gif") {
        Ok("image/gif".into())
    } else if filename_hint.ends_with(".jpg") || filename_hint.ends_with(".jpeg") {
        Ok("image/jpeg".into())
    } else {
        Ok("image/jpeg".into())
    }
}

/// Infer upload video MIME type.
///
/// Prefers request `content-type`; falls back to filename extension when needed.
pub fn infer_video_content_type(raw_ct: &str, filename_hint: &str) -> Result<String, AppError> {
    let filename_hint = filename_hint.to_lowercase();
    if raw_ct.starts_with("video/") {
        Ok(raw_ct.to_string())
    } else if !raw_ct.is_empty() && !raw_ct.starts_with("video/") {
        Err(AppError::BadRequest("Only video files are allowed".into()))
    } else if filename_hint.ends_with(".mp4") {
        Ok("video/mp4".into())
    } else if filename_hint.ends_with(".webm") {
        Ok("video/webm".into())
    } else if filename_hint.ends_with(".mov") {
        Ok("video/quicktime".into())
    } else if filename_hint.ends_with(".m4v") {
        Ok("video/x-m4v".into())
    } else if filename_hint.ends_with(".ogg") || filename_hint.ends_with(".ogv") {
        Ok("video/ogg".into())
    } else {
        Ok("video/mp4".into())
    }
}

/// Upload avatar from raw bytes to Cloudinary and update user's `avatar_url`.
///
/// Current constraints:
/// - File must not be empty.
/// - Maximum size is 5 MB.
pub async fn upload_avatar_from_bytes(
    state: &AppState,
    user_id: Uuid,
    bytes: Vec<u8>,
    content_type: &str,
) -> Result<UserPublic, AppError> {
    if bytes.is_empty() {
        return Err(AppError::BadRequest("Empty file".into()));
    }
    if bytes.len() > 5 * 1024 * 1024 {
        return Err(AppError::BadRequest("File too large (max 5 MB)".into()));
    }

    let cloudinary = state
        .cloudinary
        .as_ref()
        .ok_or_else(|| AppError::Internal("Cloudinary chưa được cấu hình".into()))?;

    let url = cloudinary_service::upload_image(
        cloudinary,
        &state.http_client,
        bytes,
        content_type,
        "shop/avatars",
    )
    .await?;

    let updated = user_repo::update_avatar_url(&state.db, user_id, &url).await?;
    Ok(updated.into())
}
