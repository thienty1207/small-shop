use axum::{extract::State, Extension, Json};

use crate::{
    error::AppError,
    models::admin::{AdminLoginInput, AdminLoginResponse, AdminPublic},
    services::admin_auth_service,
    state::AppState,
};

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
    let response = admin_auth_service::authenticate_admin(&state, &input.username, &input.password).await?;
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
