use axum::{
    middleware,
    routing::{get, post, put},
    Router,
};

use crate::{
    handlers::admin::{auth, category, customer, dashboard, order, product},
    middleware::admin_guard::admin_guard,
    state::AppState,
};

/// All admin-only routes.
///
/// Structure:
///   - POST /api/admin/auth/login           — public, NO middleware
///   - All others                           — protected via nest+layer (admin_guard)
pub fn routes(state: AppState) -> Router<AppState> {
    let protected = Router::new()
        // ── Auth ──────────────────────────────────────────────────────────
        .route("/me", get(auth::get_me))

        // ── Dashboard ─────────────────────────────────────────────────────
        .route("/dashboard", get(dashboard::get_stats))

        // ── Products ─────────────────────────────────────────────────────
        .route("/products",     get(product::list_products).post(product::create_product))
        .route("/products/:id", get(product::get_product)
                                    .put(product::update_product)
                                    .delete(product::delete_product))

        // ── Image upload ──────────────────────────────────────────────────
        .route("/upload/image", post(product::upload_image))

        // ── Categories ────────────────────────────────────────────────────
        .route("/categories",     get(category::list_categories).post(category::create_category))
        .route("/categories/:id", put(category::update_category).delete(category::delete_category))

        // ── Orders ────────────────────────────────────────────────────────
        .route("/orders",           get(order::list_orders))
        .route("/orders/:id",       get(order::get_order))
        .route("/orders/:id/status", put(order::update_order_status))

        // ── Customers ─────────────────────────────────────────────────────
        .route("/customers", get(customer::list_customers))

        .layer(middleware::from_fn_with_state(state, admin_guard));

    Router::new()
        .route("/api/admin/auth/login", post(auth::login))
        .nest("/api/admin", protected)
}
