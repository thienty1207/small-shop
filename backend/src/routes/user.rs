use axum::{
    middleware,
    routing::{get, post},
    Router,
};

use crate::{
    handlers::client::{
        notification,
        user::{get_me, google_callback, google_login, logout, put_me, upload_avatar},
    },
    middleware::auth::jwt_auth,
    state::AppState,
};

/// All user / auth routes.
/// Accepts `state` so the jwt_auth middleware can access config.jwt_secret.
pub fn routes(state: AppState) -> Router<AppState> {
    // Public OAuth routes — no authentication required
    let public = Router::new()
        .route("/auth/google", get(google_login))
        .route("/auth/google/callback", get(google_callback));

    // Protected routes — jwt_auth middleware validates the Bearer token
    // and injects UserPublic into request extensions for handlers to use.
    let protected = Router::new()
        .route("/api/me", get(get_me).put(put_me))
        .route("/api/me/avatar", post(upload_avatar))
        .route("/api/logout", post(logout))
        .route("/api/notifications", get(notification::list_notifications))
        .route(
            "/api/notifications/unread-count",
            get(notification::unread_count),
        )
        .route(
            "/api/notifications/mark-all-read",
            post(notification::mark_all_read),
        )
        .route_layer(middleware::from_fn_with_state(state, jwt_auth));

    Router::new().merge(public).merge(protected)
}
