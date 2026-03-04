use axum::{middleware, routing::{get, post}, Router};

use crate::{
    handlers::admin::{auth, customer, dashboard, order, product},
    middleware::admin_guard::admin_guard,
    state::AppState,
};

/// All admin-only routes.
///
/// Structure:
///   - POST /api/admin/auth/login           — public, NO middleware
///   - GET  /api/admin/{me,dashboard,...}   — protected, admin_guard scoped via nest+layer
pub fn routes(state: AppState) -> Router<AppState> {
    // ── Protected endpoints — admin_guard applied via nest+layer ─────────────
    // Using nest+layer instead of route_layer on a merged sub-router avoids
    // Axum 0.7 route-layer bleed-through when routers are merged.
    let protected = Router::new()
        .route("/me",        get(auth::get_me))
        .route("/dashboard", get(dashboard::get_stats))
        .route("/products",  get(product::list_products))
        .route("/orders",    get(order::list_orders))
        .route("/customers", get(customer::list_customers))
        .layer(middleware::from_fn_with_state(state, admin_guard));

    Router::new()
        // Public — login has no auth guard
        .route("/api/admin/auth/login", post(auth::login))
        // Protected — nested so the layer is scoped only to these routes
        .nest("/api/admin", protected)
}
