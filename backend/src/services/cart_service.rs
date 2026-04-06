use uuid::Uuid;

use crate::{
    error::AppError,
    models::cart::{AddToCartInput, CartItemWithProduct, UpdateCartInput},
    repositories::cart_repo,
    state::AppState,
};

/// Get the current full cart for a user.
///
/// Returns cart rows already joined with product/variant data for direct frontend rendering.
pub async fn get_cart(
    state: &AppState,
    user_id: Uuid,
) -> Result<Vec<CartItemWithProduct>, AppError> {
    cart_repo::get_user_cart(&state.db, user_id).await
}

/// Add a product to cart, or increase quantity if the item already exists.
///
/// Performs basic business validation: `quantity` must be greater than 0.
pub async fn add_to_cart(
    state: &AppState,
    user_id: Uuid,
    input: &AddToCartInput,
) -> Result<Uuid, AppError> {
    if input.quantity <= 0 {
        return Err(AppError::BadRequest(
            "Quantity must be greater than 0".into(),
        ));
    }

    let item = cart_repo::upsert_item(&state.db, user_id, input).await?;
    Ok(item.id)
}

/// Remove a specific cart item by `item_id`.
///
/// Returns `true` if a row was deleted, `false` if the item does not exist or does not belong to the user.
pub async fn remove_cart_item(
    state: &AppState,
    user_id: Uuid,
    item_id: Uuid,
) -> Result<bool, AppError> {
    cart_repo::remove_item(&state.db, user_id, item_id).await
}

/// Update the quantity of a cart item.
///
/// Validates that quantity is > 0 before calling the repository.
pub async fn update_cart_item(
    state: &AppState,
    user_id: Uuid,
    item_id: Uuid,
    input: &UpdateCartInput,
) -> Result<Uuid, AppError> {
    if input.quantity <= 0 {
        return Err(AppError::BadRequest(
            "Quantity must be greater than 0".into(),
        ));
    }

    let item = cart_repo::update_item_quantity(&state.db, user_id, item_id, input.quantity).await?;
    Ok(item.id)
}

/// Remove all items from the current user's cart.
pub async fn clear_cart(state: &AppState, user_id: Uuid) -> Result<(), AppError> {
    cart_repo::clear_cart(&state.db, user_id).await
}
