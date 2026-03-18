use axum::{
    body::Body,
    extract::State,
    http::{header::AUTHORIZATION, Request},
    middleware::Next,
    response::Response,
};

use crate::{
    error::AppError, models::admin::AdminPublic, repositories::admin_repo, services::auth_service,
    state::AppState,
};

/// Admin authentication + authorisation middleware.
///
/// Fully self-contained — does NOT depend on `jwt_auth`.
///
/// Pipeline:
///   1. Extract Bearer token from `Authorization` header
///   2. Verify JWT signature + expiry (reuses `auth_service::verify_jwt`)
///   3. Confirm `claims.role == "admin"` → 403 if not
///   4. Confirm admin account still exists in `admin_users` table → 401 if deleted
///   5. Inject `AdminPublic` into request extensions for downstream handlers
pub async fn admin_guard(
    State(state): State<AppState>,
    mut request: Request<Body>,
    next: Next,
) -> Result<Response, AppError> {
    // 1. Extract Bearer token
    let token = request
        .headers()
        .get(AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .ok_or_else(|| AppError::Unauthorized("Missing Authorization header".into()))?;

    // 2. Verify JWT
    let claims = auth_service::verify_jwt(&state.config, token)?;

    // 3. Role check — reject non-admin tokens (e.g. regular user JWTs)
    if claims.role != "admin" {
        return Err(AppError::Forbidden("Admin access required".into()));
    }

    // 4. Parse admin UUID and confirm the account still exists in DB
    let admin_id = claims
        .sub
        .parse::<uuid::Uuid>()
        .map_err(|_| AppError::Unauthorized("Invalid token subject".into()))?;

    let admin = admin_repo::find_by_id(&state.db, admin_id)
        .await?
        .ok_or_else(|| AppError::Unauthorized("Admin account not found".into()))?;

    // 5a. Check account is still active
    if !admin.is_active {
        return Err(AppError::Unauthorized("Tài khoản đã bị vô hiệu hoá".into()));
    }

    // 5b. Inject public admin representation into extensions
    request.extensions_mut().insert(AdminPublic::from(admin));

    Ok(next.run(request).await)
}
