use axum::{
    extract::{Path, State},
    http::StatusCode,
    Extension, Json,
};
use uuid::Uuid;

use crate::{
    error::AppError,
    models::{
        cart::{AddToCartInput, CartItemWithProduct, UpdateCartInput},
        user::UserPublic,
    },
    services::cart_service,
    state::AppState,
};

/// GET /api/cart — get the current user's cart
pub async fn get_cart(
    State(state): State<AppState>,
    Extension(user): Extension<UserPublic>,
) -> Result<Json<Vec<CartItemWithProduct>>, AppError> {
    let items = cart_service::get_cart(&state, user.id).await?;
    Ok(Json(items))
}

/// POST /api/cart — add or update a cart item
pub async fn add_to_cart(
    State(state): State<AppState>,
    Extension(user): Extension<UserPublic>,
    Json(input): Json<AddToCartInput>,
) -> Result<(StatusCode, Json<serde_json::Value>), AppError> {
    let item_id = cart_service::add_to_cart(&state, user.id, &input).await?;

    Ok((
        StatusCode::CREATED,
        Json(serde_json::json!({ "message": "Item added to cart", "id": item_id })),
    ))
}

/// DELETE /api/cart/:id — remove a specific item from the cart
pub async fn remove_cart_item(
    State(state): State<AppState>,
    Extension(user): Extension<UserPublic>,
    Path(item_id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    let removed = cart_service::remove_cart_item(&state, user.id, item_id).await?;

    if removed {
        Ok(Json(serde_json::json!({ "message": "Item removed" })))
    } else {
        Err(AppError::NotFound("Cart item not found".into()))
    }
}

/// PATCH /api/cart/items/:id — update quantity for a specific cart item
pub async fn update_cart_item(
    State(state): State<AppState>,
    Extension(user): Extension<UserPublic>,
    Path(item_id): Path<Uuid>,
    Json(input): Json<UpdateCartInput>,
) -> Result<Json<serde_json::Value>, AppError> {
    let item_id = cart_service::update_cart_item(&state, user.id, item_id, &input).await?;
    Ok(Json(
        serde_json::json!({ "message": "Cart item updated", "id": item_id }),
    ))
}

/// DELETE /api/cart — clear the entire cart
pub async fn clear_cart(
    State(state): State<AppState>,
    Extension(user): Extension<UserPublic>,
) -> Result<Json<serde_json::Value>, AppError> {
    cart_service::clear_cart(&state, user.id).await?;
    Ok(Json(serde_json::json!({ "message": "Cart cleared" })))
}
