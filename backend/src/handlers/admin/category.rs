use axum::{
    extract::{Path, State},
    Extension, Json,
};
use uuid::Uuid;

use crate::{
    error::AppError,
    models::{admin::AdminPublic, product::CategoryInput},
    repositories::product_repo,
    state::AppState,
};

/// GET /api/admin/categories
pub async fn list_categories(
    State(state): State<AppState>,
    Extension(_admin): Extension<AdminPublic>,
) -> Result<Json<serde_json::Value>, AppError> {
    let cats = product_repo::find_all_categories(&state.db).await?;
    Ok(Json(serde_json::json!(cats)))
}

/// POST /api/admin/categories
pub async fn create_category(
    State(state): State<AppState>,
    Extension(_admin): Extension<AdminPublic>,
    Json(input): Json<CategoryInput>,
) -> Result<Json<serde_json::Value>, AppError> {
    if input.name.trim().is_empty() {
        return Err(AppError::BadRequest("Category name is required".into()));
    }
    let cat = product_repo::create_category(&state.db, &input).await?;
    Ok(Json(serde_json::json!(cat)))
}

/// PUT /api/admin/categories/:id
pub async fn update_category(
    State(state): State<AppState>,
    Extension(_admin): Extension<AdminPublic>,
    Path(id): Path<Uuid>,
    Json(input): Json<CategoryInput>,
) -> Result<Json<serde_json::Value>, AppError> {
    if input.name.trim().is_empty() {
        return Err(AppError::BadRequest("Category name is required".into()));
    }
    let cat = product_repo::update_category(&state.db, id, &input).await?;
    Ok(Json(serde_json::json!(cat)))
}

/// DELETE /api/admin/categories/:id
pub async fn delete_category(
    State(state): State<AppState>,
    Extension(_admin): Extension<AdminPublic>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    product_repo::delete_category(&state.db, id).await?;
    Ok(Json(serde_json::json!({ "ok": true })))
}
