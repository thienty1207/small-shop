use axum::{
    extract::{Path, State},
    Extension, Json,
};
use uuid::Uuid;

use crate::{
    error::AppError,
    models::{admin::AdminPublic, product::CategoryInput},
    services::{permissions_service, product_service},
    state::AppState,
};

/// GET /api/admin/categories
pub async fn list_categories(
    State(state): State<AppState>,
    Extension(admin): Extension<AdminPublic>,
) -> Result<Json<serde_json::Value>, AppError> {
    permissions_service::require_permission(&state, &admin, "categories.view").await?;
    let cats = product_service::list_categories(&state).await?;
    Ok(Json(serde_json::json!(cats)))
}

/// POST /api/admin/categories
pub async fn create_category(
    State(state): State<AppState>,
    Extension(admin): Extension<AdminPublic>,
    Json(input): Json<CategoryInput>,
) -> Result<Json<serde_json::Value>, AppError> {
    permissions_service::require_permission(&state, &admin, "categories.edit").await?;
    let cat = product_service::create_category(&state, &input).await?;
    Ok(Json(cat))
}

/// PUT /api/admin/categories/:id
pub async fn update_category(
    State(state): State<AppState>,
    Extension(admin): Extension<AdminPublic>,
    Path(id): Path<Uuid>,
    Json(input): Json<CategoryInput>,
) -> Result<Json<serde_json::Value>, AppError> {
    permissions_service::require_permission(&state, &admin, "categories.edit").await?;
    let cat = product_service::update_category(&state, id, &input).await?;
    Ok(Json(cat))
}

/// DELETE /api/admin/categories/:id
pub async fn delete_category(
    State(state): State<AppState>,
    Extension(admin): Extension<AdminPublic>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    permissions_service::require_permission(&state, &admin, "categories.delete").await?;
    product_service::delete_category(&state, id).await?;
    Ok(Json(serde_json::json!({ "ok": true })))
}
