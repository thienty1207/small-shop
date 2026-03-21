use axum::{routing::get, Router};

use crate::{handlers::admin::settings, state::AppState};

/// Expose a public endpoint for frontend-facing shop settings.
pub fn routes(_state: AppState) -> Router<AppState> {
    Router::new().route("/api/settings", get(settings::get_public_settings))
}
