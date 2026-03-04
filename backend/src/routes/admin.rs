use axum::{middleware, routing::get, Router};

use crate::{
    handlers::admin::{customer, dashboard, order, product},
    middleware::{admin_guard::admin_guard, auth::jwt_auth},
    state::AppState,
};

/// All admin-only routes.
///
/// Every route here is protected by two layers:
///   1. `jwt_auth`    — validates the Bearer JWT token
///   2. `admin_guard` — confirms the user has role = "admin"
///
/// Prefix: /api/admin
pub fn routes(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/api/admin/dashboard", get(dashboard::get_stats))
        .route("/api/admin/products",  get(product::list_products))
        .route("/api/admin/orders",    get(order::list_orders))
        .route("/api/admin/customers", get(customer::list_customers))
        // jwt_auth runs first, then admin_guard
        .route_layer(middleware::from_fn(admin_guard))
        .route_layer(middleware::from_fn_with_state(state, jwt_auth))
}
