use uuid::Uuid;

use crate::{error::AppError, repositories::wishlist_repo, state::AppState};

/// Toggle wishlist state for a product for the current user.
///
/// Returns `true` if the product is wishlisted after the operation, `false` if it was removed.
pub async fn toggle_wishlist(
    state: &AppState,
    user_id: Uuid,
    product_id: Uuid,
) -> Result<bool, AppError> {
    wishlist_repo::toggle_wishlist(&state.db, user_id, product_id)
        .await
        .map_err(AppError::from)
}

/// Get all products in the user's wishlist.
pub async fn get_wishlist(state: &AppState, user_id: Uuid) -> Result<serde_json::Value, AppError> {
    let products = wishlist_repo::get_wishlist(&state.db, user_id)
        .await
        .map_err(AppError::from)?;
    Ok(serde_json::json!(products))
}

/// Get wishlist `product_id` values (useful for quick liked-state marking on frontend).
pub async fn get_wishlist_ids(
    state: &AppState,
    user_id: Uuid,
) -> Result<serde_json::Value, AppError> {
    let ids = wishlist_repo::get_wishlist_ids(&state.db, user_id)
        .await
        .map_err(AppError::from)?;
    Ok(serde_json::json!(ids))
}
