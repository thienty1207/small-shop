use axum::{
    middleware,
    routing::{delete, get, post},
    Router,
};

use crate::{handlers::client::cart, middleware::auth::jwt_auth, state::AppState};

pub fn routes(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/api/cart", get(cart::get_cart).delete(cart::clear_cart))
        .route("/api/cart/items", post(cart::add_to_cart))
        .route("/api/cart/items/:id", delete(cart::remove_cart_item))
        .layer(middleware::from_fn_with_state(state, jwt_auth))
}
