use axum::{
    extract::{Path, State, Extension},
    response::IntoResponse,
    Json,
};
use serde_json::json;
use uuid::Uuid;

use crate::{
    error::{AppError},
    models::user::UserPublic,
    repositories::wishlist_repo,
    state::AppState,
};

pub async fn toggle_wishlist(
    State(state): State<AppState>,
    Extension(user): Extension<UserPublic>,
    Path(product_id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    let result = wishlist_repo::toggle_wishlist(&state.db, user.id, product_id).await.map_err(AppError::from)?;
    
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
    let products = wishlist_repo::get_wishlist(&state.db, user.id).await.map_err(AppError::from)?;
    
    Ok(Json(json!({
        "status": "success",
        "data": products
    })))
}

pub async fn get_wishlist_ids(
    State(state): State<AppState>,
    Extension(user): Extension<UserPublic>,
) -> Result<impl IntoResponse, AppError> {
    let ids = wishlist_repo::get_wishlist_ids(&state.db, user.id).await.map_err(AppError::from)?;
    
    Ok(Json(json!({
        "status": "success",
        "data": ids
    })))
}