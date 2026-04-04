use axum::{
    extract::DefaultBodyLimit,
    middleware,
    routing::{delete, get, patch, post, put},
    Router,
};

use crate::{
    handlers::admin::{
        auth, category, coupon, customer, dashboard, export, notifications, order, product, review,
        permissions, settings, staff,
    },
    middleware::admin_guard::admin_guard,
    state::AppState,
};

/// All admin-only routes.
pub fn routes(state: AppState) -> Router<AppState> {
    let protected = Router::new()
        // ── Auth ──────────────────────────────────────────────────────────
        .route("/me", get(auth::get_me))
        .route("/auth/logout", post(auth::logout))
        // ── Dashboard ─────────────────────────────────────────────────────
        .route("/dashboard", get(dashboard::get_stats))
        // ── Products ─────────────────────────────────────────────────────
        .route(
            "/products",
            get(product::list_products).post(product::create_product),
        )
        .route(
            "/products/:id",
            get(product::get_product)
                .put(product::update_product)
                .delete(product::delete_product),
        )
        .route(
            "/products/:id/images/reorder",
            put(product::reorder_product_images),
        )
        // ── Image upload ──────────────────────────────────────────────────
        .route(
            "/upload/image",
            post(product::upload_image).layer(DefaultBodyLimit::max(12 * 1024 * 1024)),
        )
        .route(
            "/upload/video",
            post(product::upload_video).layer(DefaultBodyLimit::max(40 * 1024 * 1024)),
        )
        // ── Inventory ────────────────────────────────────────────────────
        .route("/inventory", get(product::list_inventory))
        .route(
            "/inventory/variants/:id/stock",
            patch(product::update_variant_stock),
        )
        // ── Categories ────────────────────────────────────────────────────
        .route(
            "/categories",
            get(category::list_categories).post(category::create_category),
        )
        .route(
            "/categories/:id",
            put(category::update_category).delete(category::delete_category),
        )
        // ── Orders ────────────────────────────────────────────────────────
        .route("/orders", get(order::list_orders))
        .route("/orders/:id", get(order::get_order))
        .route("/orders/:id/status", put(order::update_order_status))
        // ── Customers ─────────────────────────────────────────────────────
        .route("/customers", get(customer::list_customers))
        // ── Permissions (P4) ──────────────────────────────────────────────
        .route(
            "/permissions",
            get(permissions::get_permissions).patch(permissions::update_permissions),
        )
        // ── Staff (B7) ────────────────────────────────────────────────────
        .route("/staff", get(staff::list_staff).post(staff::create_staff))
        .route(
            "/staff/:id",
            put(staff::update_staff).delete(staff::delete_staff),
        )
        // ── Settings (B8) ─────────────────────────────────────────────────
        .route(
            "/settings",
            get(settings::get_settings).put(settings::update_settings),
        )
        // ── Reviews (B10) ─────────────────────────────────────────────────
        .route("/reviews", get(review::list_reviews))
        .route("/reviews/:id", delete(review::delete_review))
        // ── Coupons (B11) ─────────────────────────────────────────────────
        .route(
            "/coupons",
            get(coupon::list_coupons).post(coupon::create_coupon),
        )
        .route(
            "/coupons/:id",
            put(coupon::update_coupon).delete(coupon::delete_coupon),
        )
        // ── Export CSV (B13) ──────────────────────────────────────────────
        .route("/orders/export", get(export::export_orders))
        .route("/products/export", get(export::export_products))
        // ── Notifications SSE (B12) ───────────────────────────────────────
        .route(
            "/notifications/stream",
            get(notifications::notification_stream),
        )
        .layer(middleware::from_fn_with_state(state, admin_guard));

    Router::new()
        .route("/api/admin/auth/login", post(auth::login))
        .nest("/api/admin", protected)
}
