use axum::{
    extract::{Multipart, Query, State},
    http::{header::AUTHORIZATION, header::SET_COOKIE, HeaderMap, HeaderValue},
    response::{IntoResponse, Redirect, Response},
    Extension, Json,
};
use serde::Deserialize;

use crate::{
    error::AppError,
    models::user::{UpdateProfileInput, UserPublic},
    services::{auth_service, email_service, token_service, user_service},
    state::AppState,
};

fn extract_bearer_token(headers: &HeaderMap) -> Result<&str, AppError> {
    headers
        .get(AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .ok_or_else(|| AppError::Unauthorized("Missing Authorization header".into()))
}

// ---------------------------------------------------------------------------
// Google OAuth — Step 1: redirect user to Google consent page
// ---------------------------------------------------------------------------

/// Redirect the user to Google's consent page to start OAuth flow.
#[derive(Deserialize)]
pub struct GoogleLoginParams {
    pub cf_turnstile_response: String,
}

pub async fn google_login(
    State(state): State<AppState>,
    Query(params): Query<GoogleLoginParams>,
) -> Result<Response, AppError> {
    let token = params.cf_turnstile_response.trim();
    if token.is_empty() {
        return Err(AppError::BadRequest(
            "Missing Cloudflare Turnstile token".into(),
        ));
    }

    let ok = email_service::verify_turnstile(&state.config.cloudflare_secret_key, token).await?;
    if !ok {
        return Err(AppError::Unauthorized(
            "Cloudflare verification failed".into(),
        ));
    }

    let csrf_state = auth_service::generate_csrf_state();
    let url = auth_service::build_google_auth_url(&state.config, &csrf_state);
    let csrf_cookie = auth_service::build_csrf_cookie(&state.config, &csrf_state)?;

    let mut response = Redirect::temporary(&url).into_response();
    let cookie_value = HeaderValue::from_str(&csrf_cookie)
        .map_err(|e| AppError::Internal(format!("Invalid Set-Cookie header: {e}")))?;
    response.headers_mut().append(SET_COOKIE, cookie_value);

    Ok(response)
}

// ---------------------------------------------------------------------------
// Google OAuth — Step 2: handle callback with authorization code
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
/// Query params returned from Google OAuth callback.
///
/// `state` is validated against the signed oauth_state cookie.
pub struct CallbackParams {
    pub code: String,
    pub state: Option<String>,
}

/// Handle Google OAuth callback and redirect to frontend with login token.
pub async fn google_callback(
    State(state): State<AppState>,
    Query(params): Query<CallbackParams>,
    headers: HeaderMap,
) -> Result<Response, AppError> {
    let cookie_header = headers
        .get(axum::http::header::COOKIE)
        .and_then(|value| value.to_str().ok());
    let oauth_state_cookie = auth_service::extract_cookie_value(cookie_header, "oauth_state");

    auth_service::verify_csrf_state(
        &state.config,
        oauth_state_cookie.as_deref(),
        params.state.as_deref(),
    )?;

    let redirect_url = user_service::build_oauth_redirect_url(&state, &params.code).await?;

    let mut response = Redirect::temporary(&redirect_url).into_response();
    let clear_cookie = HeaderValue::from_str(&auth_service::clear_csrf_cookie(&state.config))
        .map_err(|e| AppError::Internal(format!("Invalid Set-Cookie header: {e}")))?;
    response.headers_mut().append(SET_COOKIE, clear_cookie);

    Ok(response)
}

// ---------------------------------------------------------------------------
// Protected: GET /api/me — return current user from JWT
// ---------------------------------------------------------------------------

/// Return current user information injected by auth middleware into `Extension`.
pub async fn get_me(
    Extension(current_user): Extension<UserPublic>,
) -> Result<Json<UserPublic>, AppError> {
    Ok(Json(current_user))
}

// ---------------------------------------------------------------------------
// Protected: PUT /api/me — update editable profile fields
// ---------------------------------------------------------------------------

/// Update basic profile fields of the current user.
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

/// Receive avatar multipart upload, upload to Cloudinary, and update user `avatar_url`.
pub async fn upload_avatar(
    State(state): State<AppState>,
    Extension(current_user): Extension<UserPublic>,
    mut multipart: Multipart,
) -> Result<Json<UserPublic>, AppError> {
    if let Some(field) = multipart
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
        return Ok(Json(updated));
    }

    Err(AppError::BadRequest("No image field in request".into()))
}

/// POST /api/logout
///
/// Revokes the current JWT immediately so it can no longer be used.
pub async fn logout(
    State(state): State<AppState>,
    Extension(current_user): Extension<UserPublic>,
    headers: HeaderMap,
) -> Result<Json<serde_json::Value>, AppError> {
    let token = extract_bearer_token(&headers)?;
    let claims = auth_service::verify_jwt(&state.config, token)?;

    token_service::revoke(&state.db, token, &claims, "user", Some(current_user.id)).await?;

    Ok(Json(serde_json::json!({ "ok": true })))
}
