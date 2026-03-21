use uuid::Uuid;

use crate::{error::AppError, repositories::wishlist_repo, state::AppState};

pub async fn toggle_wishlist(
    state: &AppState,
    user_id: Uuid,
    product_id: Uuid,
) -> Result<bool, AppError> {
    wishlist_repo::toggle_wishlist(&state.db, user_id, product_id)
        .await
        .map_err(AppError::from)
}

pub async fn get_wishlist(state: &AppState, user_id: Uuid) -> Result<serde_json::Value, AppError> {
    let products = wishlist_repo::get_wishlist(&state.db, user_id)
        .await
        .map_err(AppError::from)?;
    Ok(serde_json::json!(products))
}

pub async fn get_wishlist_ids(state: &AppState, user_id: Uuid) -> Result<serde_json::Value, AppError> {
    let ids = wishlist_repo::get_wishlist_ids(&state.db, user_id)
        .await
        .map_err(AppError::from)?;
    Ok(serde_json::json!(ids))
}
