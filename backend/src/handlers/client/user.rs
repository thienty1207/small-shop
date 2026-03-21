use axum::{
    extract::{Multipart, Query, State},
    response::{IntoResponse, Redirect},
    Extension, Json,
};
use serde::Deserialize;

use crate::{
    error::AppError,
    models::user::{UpdateProfileInput, UserPublic},
    services::{auth_service, user_service},
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

    let redirect_url = user_service::build_oauth_redirect_url(&state, &params.code).await?;

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
    let updated = user_service::update_profile(&state.db, current_user.id, &input).await?;
    Ok(Json(updated))
}

// ---------------------------------------------------------------------------
// Protected: POST /api/me/avatar — upload & update avatar via Cloudinary
// ---------------------------------------------------------------------------

pub async fn upload_avatar(
    State(state): State<AppState>,
    Extension(current_user): Extension<UserPublic>,
    mut multipart: Multipart,
) -> Result<Json<UserPublic>, AppError> {
    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| AppError::BadRequest(format!("Multipart error: {e}")))?
    {
        let raw_ct = field.content_type().unwrap_or("");
        let filename_hint = field.file_name().unwrap_or("");
        let content_type = user_service::infer_image_content_type(raw_ct, filename_hint)?;

        let data = field
            .bytes()
            .await
            .map_err(|e| AppError::Internal(format!("Read error: {e}")))?;

        let updated = user_service::upload_avatar_from_bytes(
            &state,
            current_user.id,
            data.to_vec(),
            &content_type,
        )
        .await?;
        return Ok(Json(updated.into()));
    }

    Err(AppError::BadRequest("No image field in request".into()))
}
