use axum::{
    extract::{Query, State},
    response::{IntoResponse, Redirect},
    Extension, Json,
};
use serde::Deserialize;

use crate::{
    error::AppError,
    models::user::{UpdateProfileInput, UserPublic},
    repositories::user_repo,
    services::auth_service,
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
