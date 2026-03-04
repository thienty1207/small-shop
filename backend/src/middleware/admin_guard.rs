use axum::{
    body::Body,
    http::Request,
    middleware::Next,
    response::Response,
};

use crate::{error::AppError, models::user::UserPublic};

/// Admin guard middleware.
///
/// Must be placed AFTER `jwt_auth` — it reads the `UserPublic` extension
/// already injected by `jwt_auth` and rejects the request if the user's
/// role is not `"admin"`.
///
/// Usage in routes:
/// ```rust
/// Router::new()
///     .route("/api/admin/...", get(handler))
///     .route_layer(middleware::from_fn_with_state(state.clone(), jwt_auth))
///     .route_layer(middleware::from_fn(admin_guard));
/// ```
pub async fn admin_guard(
    request: Request<Body>,
    next: Next,
) -> Result<Response, AppError> {
    let user = request
        .extensions()
        .get::<UserPublic>()
        .ok_or_else(|| AppError::Unauthorized("Not authenticated".into()))?;

    if user.role != "admin" {
        return Err(AppError::Forbidden(
            "Admin access required".into(),
        ));
    }

    Ok(next.run(request).await)
}
