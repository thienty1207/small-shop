use axum::{
    extract::{Multipart, Query, State},
    response::{IntoResponse, Redirect},
    Extension, Json,
};
use serde::Deserialize;

use crate::{
    error::AppError,
    models::user::{UpdateProfileInput, UserPublic},
    repositories::user_repo,
    services::{auth_service, cloudinary as cloudinary_service},
    state::AppState,
};

// ---------------------------------------------------------------------------
// Google OAuth — Step 1: redirect user to Google consent page
// ---------------------------------------------------------------------------

pub async fn google_login(State(state): State<AppState>) -> impl IntoResponse {
    let (url, _csrf_state) = auth_service::build_google_auth_url(&state.config);

    // TODO: Store _csrf_state in a signed short-lived cookie before redirecting
    //       so we can validate it in the callback (CSRF protection).

    Redirect::temporary(&url)
}

// ---------------------------------------------------------------------------
// Google OAuth — Step 2: handle callback with authorization code
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
pub struct CallbackParams {
    pub code: String,
    pub state: Option<String>,
}

pub async fn google_callback(
    State(state): State<AppState>,
    Query(params): Query<CallbackParams>,
) -> Result<impl IntoResponse, AppError> {
    // TODO: Validate params.state against the stored CSRF state cookie.
    //       If mismatch → return AppError::Unauthorized("CSRF state mismatch").

    // Exchange authorization code for Google access token
    let access_token =
        auth_service::exchange_code_for_token(&state.config, &params.code).await?;

    // Fetch user profile from Google
    let google_info = auth_service::fetch_google_user_info(&access_token).await?;

    // Find or create user in our database
    let user = auth_service::upsert_user(&state.db, google_info).await?;

    // Issue our own JWT
    let token = auth_service::generate_jwt(&state.config, &user)?;

    // Redirect to frontend with token as query param
    // The frontend /auth/callback page will pick this up, store it, then redirect to /
    //
    // SECURITY NOTE: Passing JWT in URL is acceptable for this OAuth redirect pattern,
    // but the token must be consumed immediately (single use window).
    // TODO: Consider using a short-lived one-time code instead of the full JWT in the URL.
    let redirect_url = format!(
        "{}/auth/callback?token={}",
        state.config.frontend_url, token
    );

    Ok(Redirect::temporary(&redirect_url))
}

// ---------------------------------------------------------------------------
// Protected: GET /api/me — return current user from JWT
// ---------------------------------------------------------------------------

pub async fn get_me(
    Extension(current_user): Extension<UserPublic>,
) -> Result<Json<UserPublic>, AppError> {
    Ok(Json(current_user))
}

// ---------------------------------------------------------------------------
// Protected: PUT /api/me — update editable profile fields
// ---------------------------------------------------------------------------

pub async fn put_me(
    State(state): State<AppState>,
    Extension(current_user): Extension<UserPublic>,
    Json(input): Json<UpdateProfileInput>,
) -> Result<Json<UserPublic>, AppError> {
    let updated = user_repo::update_profile(&state.db, current_user.id, &input).await?;
    Ok(Json(updated.into()))
}

// ---------------------------------------------------------------------------
// Protected: POST /api/me/avatar — upload & update avatar via Cloudinary
// ---------------------------------------------------------------------------

pub async fn upload_avatar(
    State(state): State<AppState>,
    Extension(current_user): Extension<UserPublic>,
    mut multipart: Multipart,
) -> Result<Json<UserPublic>, AppError> {
    let cloudinary = state.cloudinary.as_ref().ok_or_else(|| {
        AppError::Internal("Cloudinary chưa được cấu hình".into())
    })?;

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| AppError::BadRequest(format!("Multipart error: {e}")))?
    {
        let raw_ct = field.content_type().unwrap_or("").to_string();
        let filename_hint = field.file_name().unwrap_or("").to_lowercase();
        let content_type: String = if raw_ct.starts_with("image/") {
            raw_ct
        } else if filename_hint.ends_with(".png") {
            "image/png".into()
        } else if filename_hint.ends_with(".webp") {
            "image/webp".into()
        } else if filename_hint.ends_with(".gif") {
            "image/gif".into()
        } else {
            "image/jpeg".into()
        };

        let data = field
            .bytes()
            .await
            .map_err(|e| AppError::Internal(format!("Read error: {e}")))?;

        if data.is_empty() {
            return Err(AppError::BadRequest("Empty file".into()));
        }
        if data.len() > 5 * 1024 * 1024 {
            return Err(AppError::BadRequest("File too large (max 5 MB)".into()));
        }

        let url = cloudinary_service::upload_image(
            cloudinary,
            &state.http_client,
            data.to_vec(),
            &content_type,
            "shop/avatars",
        )
        .await?;

        let updated = user_repo::update_avatar_url(&state.db, current_user.id, &url).await?;
        return Ok(Json(updated.into()));
    }

    Err(AppError::BadRequest("No image field in request".into()))
}
