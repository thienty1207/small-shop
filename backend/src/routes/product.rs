use axum::{routing::get, Router};

use crate::{handlers::product, state::AppState};

pub fn routes(_state: AppState) -> Router<AppState> {
    Router::new()
        .route("/api/categories", get(product::list_categories))
        .route("/api/products", get(product::list_products))
        .route("/api/products/:slug", get(product::get_product))
}
