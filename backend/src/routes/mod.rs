// routes/mod.rs — ONLY pub mod declarations and re-exports are allowed here
// NEVER write any logic, structs, or functions in this file

pub mod admin;
pub mod cart;
pub mod contact;
pub mod coupon;
pub mod order;
pub mod product;
pub mod settings;
pub mod user;

use axum::Router;

use crate::state::AppState;

/// Assemble all route modules into a single Router.
/// State is passed down so middleware can access it during setup.
pub fn create_router(state: AppState) -> Router<AppState> {
    Router::new()
        .merge(user::routes(state.clone()))
        .merge(contact::routes(state.clone()))
        .merge(product::routes(state.clone()))
        .merge(settings::routes(state.clone()))
        .merge(cart::routes(state.clone()))
        .merge(order::routes(state.clone()))
        .merge(coupon::routes())
        .nest(
            "/api/wishlist",
            wishlist::client_wishlist_routes(state.clone()),
        )
        .nest(
            "/api/wishlists",
            wishlist::client_wishlist_routes(state.clone()),
        )
        .merge(admin::routes(state))
}

pub mod wishlist;
