use axum::{
    extract::{Extension, Path, State},
    response::IntoResponse,
    Json,
};
use serde_json::json;
use uuid::Uuid;

use crate::{
    error::AppError, models::user::UserPublic, services::wishlist_service, state::AppState,
};

pub async fn toggle_wishlist(
    State(state): State<AppState>,
    Extension(user): Extension<UserPublic>,
    Path(product_id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    let result = wishlist_service::toggle_wishlist(&state, user.id, product_id).await?;

    Ok(Json(json!({
        "status": "success",
        "data": {
            "is_wishlisted": result
        }
    })))
}

pub async fn get_wishlist(
    State(state): State<AppState>,
    Extension(user): Extension<UserPublic>,
) -> Result<impl IntoResponse, AppError> {
    let products = wishlist_service::get_wishlist(&state, user.id).await?;

    Ok(Json(json!({
        "status": "success",
        "data": products
    })))
}

pub async fn get_wishlist_ids(
    State(state): State<AppState>,
    Extension(user): Extension<UserPublic>,
) -> Result<impl IntoResponse, AppError> {
    let ids = wishlist_service::get_wishlist_ids(&state, user.id).await?;

    Ok(Json(json!({
        "status": "success",
        "data": ids
    })))
}
