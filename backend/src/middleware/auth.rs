use axum::{
    body::Body,
    extract::State,
    http::{header::AUTHORIZATION, Request},
    middleware::Next,
    response::Response,
};

use crate::{
    error::AppError,
    models::user::UserPublic,
    repositories::user_repo,
    services::{auth_service, token_service},
    state::AppState,
};

/// JWT authentication middleware.
///
/// Extracts the Bearer token from the `Authorization` header, verifies it,
/// loads the user from the database, and injects `UserPublic` into request
/// extensions so handlers can access it via `Extension<UserPublic>`.
///
/// Returns 401 if the token is missing, invalid, expired, or the user no longer exists.
///
/// SECURITY: Token is validated on every request and checked against revocation storage.
pub async fn jwt_auth(
    State(state): State<AppState>,
    mut request: Request<Body>,
    next: Next,
) -> Result<Response, AppError> {
    // Extract token from "Authorization: Bearer <token>"
    let token = request
        .headers()
        .get(AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .ok_or_else(|| AppError::Unauthorized("Missing Authorization header".into()))?;

    if token_service::is_revoked(&state.db, token).await? {
        return Err(AppError::Unauthorized("Token has been revoked".into()));
    }

    // Verify signature and expiry
    let claims = auth_service::verify_jwt(&state.config, token)?;

    // Parse user UUID from claims.sub
    let user_id = claims
        .sub
        .parse::<uuid::Uuid>()
        .map_err(|_| AppError::Unauthorized("Invalid token subject".into()))?;

    // Confirm user still exists in the database.
    // Catches cases where the account was deleted after the token was issued.
    let db_user = user_repo::find_by_id(&state.db, user_id)
        .await?
        .ok_or_else(|| AppError::Unauthorized("User account not found".into()))?;

    // Inject public user representation into request extensions
    request.extensions_mut().insert(UserPublic::from(db_user));

    Ok(next.run(request).await)
}
