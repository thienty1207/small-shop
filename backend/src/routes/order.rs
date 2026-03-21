use axum::{middleware, routing::get, Router};

use crate::{handlers::client::order, middleware::auth::jwt_auth, state::AppState};

/// Register order routes for authenticated users and protect them with JWT middleware.
pub fn routes(state: AppState) -> Router<AppState> {
    Router::new()
        .route(
            "/api/orders",
            get(order::list_orders).post(order::create_order),
        )
        .route("/api/orders/:id", get(order::get_order))
        .layer(middleware::from_fn_with_state(state, jwt_auth))
}
