use axum::{
    middleware,
    routing::{get, post},
    Router,
};

use crate::{
    handlers::{
        client::{product, review},
    },
    middleware::auth::jwt_auth,
    state::AppState,
};

/// Register public product/category/review routes and merge protected review routes.
pub fn routes(state: AppState) -> Router<AppState> {
    // Protected review routes
    let protected_reviews = Router::new()
        .route(
            "/api/products/:product_id/reviews",
            post(review::create_review),
        )
        .route(
            "/api/products/:product_id/reviews/me",
            get(review::get_my_review),
        )
        .route_layer(middleware::from_fn_with_state(state, jwt_auth));

    Router::new()
        .route("/api/categories", get(product::list_categories))
        .route("/api/products/filters", get(product::list_product_filters))
        .route(
            "/api/products/search/suggest",
            get(product::search_product_suggestions),
        )
        .route("/api/products", get(product::list_products))
        .route("/api/products/:slug", get(product::get_product))
        .route(
            "/api/products/:slug/related",
            get(product::get_related_products),
        )
        .route(
            "/api/products/:product_id/reviews",
            get(review::list_reviews),
        )
        .merge(protected_reviews)
}
