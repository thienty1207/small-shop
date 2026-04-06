use axum::{
    extract::State,
    http::{header::AUTHORIZATION, HeaderMap},
    Extension, Json,
};

use crate::{
    error::AppError,
    models::admin::{AdminLoginInput, AdminLoginResponse, AdminPublic},
    services::{admin_auth_service, auth_service, token_service},
    state::AppState,
};

fn extract_bearer_token(headers: &HeaderMap) -> Result<&str, AppError> {
    headers
        .get(AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .ok_or_else(|| AppError::Unauthorized("Missing Authorization header".into()))
}

/// POST /api/admin/auth/login
///
/// Authenticates an admin with username + password.
/// Returns a JWT on success — the frontend stores it as `admin_auth_token`.
///
/// Returns 401 for unknown usernames OR wrong passwords (same error message
/// on purpose, to prevent username enumeration attacks).
pub async fn login(
    State(state): State<AppState>,
    Json(input): Json<AdminLoginInput>,
) -> Result<Json<AdminLoginResponse>, AppError> {
    let response =
        admin_auth_service::authenticate_admin(&state, &input.username, &input.password).await?;
    tracing::info!("Admin '{}' logged in", response.user.username);
    Ok(Json(response))
}

/// GET /api/admin/me
///
/// Returns the current admin's public profile.
/// Requires a valid admin JWT (enforced by `admin_guard` middleware).
pub async fn get_me(
    Extension(admin): Extension<AdminPublic>,
) -> Result<Json<AdminPublic>, AppError> {
    Ok(Json(admin))
}

/// POST /api/admin/auth/logout
///
/// Revokes the current admin JWT immediately.
pub async fn logout(
    State(state): State<AppState>,
    Extension(admin): Extension<AdminPublic>,
    headers: HeaderMap,
) -> Result<Json<serde_json::Value>, AppError> {
    let token = extract_bearer_token(&headers)?;
    let claims = auth_service::verify_jwt(&state.config, token)?;

    token_service::revoke(&state.db, token, &claims, "admin", Some(admin.id)).await?;

    Ok(Json(serde_json::json!({ "ok": true })))
}
