use crate::{handlers::client::wishlist, middleware::auth::jwt_auth, state::AppState};
use axum::{
    routing::{get, post},
    Router,
};

/// Register client wishlist routes and apply JWT middleware to the whole branch.
pub fn client_wishlist_routes(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/ids", get(wishlist::get_wishlist_ids))
        .route("/", get(wishlist::get_wishlist))
        .route("/:product_id", post(wishlist::toggle_wishlist))
        .route_layer(axum::middleware::from_fn_with_state(
            state.clone(),
            jwt_auth,
        ))
}
