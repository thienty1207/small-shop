use axum::{extract::State, Extension, Json};

use crate::{
    error::AppError,
    models::admin::{AdminLoginInput, AdminLoginResponse, AdminPublic},
    repositories::admin_repo,
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
    // 1. Look up admin by username
    let admin = admin_repo::find_by_username(&state.db, &input.username)
        .await?
        .ok_or_else(|| AppError::Unauthorized("Invalid username or password".into()))?;

    // 2. Verify password against Argon2id hash
    let ok = admin_auth_service::verify_password(&input.password, &admin.password_hash)?;
    if !ok {
        return Err(AppError::Unauthorized("Invalid username or password".into()));
    }

    // 3. Issue JWT with role = "admin"
    let token = admin_auth_service::generate_admin_jwt(&state.config, &admin)?;

    tracing::info!("Admin '{}' logged in", admin.username);

    Ok(Json(AdminLoginResponse {
        token,
        user: AdminPublic::from(admin),
    }))
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
