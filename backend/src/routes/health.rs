use axum::{routing::get, Router};

use crate::{handlers::client::health, state::AppState};

pub fn routes(_state: AppState) -> Router<AppState> {
    Router::new()
        .route("/healthz", get(health::liveness))
        .route("/readyz", get(health::readiness))
}
