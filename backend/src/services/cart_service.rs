use uuid::Uuid;

use crate::{
    error::AppError,
    models::cart::{AddToCartInput, CartItemWithProduct, UpdateCartInput},
    repositories::cart_repo,
    state::AppState,
};

pub async fn get_cart(state: &AppState, user_id: Uuid) -> Result<Vec<CartItemWithProduct>, AppError> {
    cart_repo::get_user_cart(&state.db, user_id).await
}

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

pub async fn remove_cart_item(state: &AppState, user_id: Uuid, item_id: Uuid) -> Result<bool, AppError> {
    cart_repo::remove_item(&state.db, user_id, item_id).await
}

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

pub async fn clear_cart(state: &AppState, user_id: Uuid) -> Result<(), AppError> {
    cart_repo::clear_cart(&state.db, user_id).await
}
