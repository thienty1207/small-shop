use axum::{routing::get, Router};

use crate::{handlers::admin::settings, state::AppState};

pub fn routes(_state: AppState) -> Router<AppState> {
    Router::new().route("/api/settings", get(settings::get_public_settings))
}
