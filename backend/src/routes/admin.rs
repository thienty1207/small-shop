use axum::{middleware, routing::{get, post}, Router};

use crate::{
    handlers::admin::{auth, customer, dashboard, order, product},
    middleware::admin_guard::admin_guard,
    state::AppState,
};

/// All admin-only routes.
///
/// Structure:
///   - Public  → POST /api/admin/auth/login (no auth required)
///   - Protected → everything else, behind `admin_guard` which verifies JWT
///                 and confirms role == "admin" in one self-contained step.
pub fn routes(state: AppState) -> Router<AppState> {
    // ── Public endpoints (no authentication) ─────────────────────────────────
    let public = Router::new()
        .route("/api/admin/auth/login", post(auth::login));

    // ── Protected endpoints (admin_guard applied as route layer) ─────────────
    let protected = Router::new()
        .route("/api/admin/me",        get(auth::get_me))
        .route("/api/admin/dashboard", get(dashboard::get_stats))
        .route("/api/admin/products",  get(product::list_products))
        .route("/api/admin/orders",    get(order::list_orders))
        .route("/api/admin/customers", get(customer::list_customers))
        .route_layer(middleware::from_fn_with_state(state, admin_guard));

    Router::new().merge(public).merge(protected)
}
