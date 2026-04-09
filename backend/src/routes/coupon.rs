use axum::{routing::post, Router};

use crate::{handlers::admin::coupon, state::AppState};

/// Public coupon routes (no auth required — validate at checkout).
pub fn routes() -> Router<AppState> {
    Router::new().route("/api/coupons/validate", post(coupon::validate_coupon))
}
