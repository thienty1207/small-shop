use axum::{
    extract::{Path, Query, State},
    Extension, Json,
};
use uuid::Uuid;

use crate::{
    error::AppError,
    models::admin::AdminPublic,
    services::{permissions_service, review_service},
    state::AppState,
};

/// GET /api/admin/reviews
pub async fn list_reviews(
    State(state): State<AppState>,
    Extension(admin): Extension<AdminPublic>,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> Result<Json<serde_json::Value>, AppError> {
    permissions_service::require_permission(&state, &admin, "reviews.view").await?;
    let page = params
        .get("page")
        .and_then(|v| v.parse::<i64>().ok())
        .unwrap_or(1);
    let limit = params
        .get("limit")
        .and_then(|v| v.parse::<i64>().ok())
        .unwrap_or(20);
    let payload = review_service::list_reviews_admin(&state, page, limit).await?;
    Ok(Json(payload))
}

/// DELETE /api/admin/reviews/:id
pub async fn delete_review(
    State(state): State<AppState>,
    Extension(admin): Extension<AdminPublic>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    permissions_service::require_permission(&state, &admin, "reviews.delete").await?;
    review_service::delete_review(&state, id).await?;
    Ok(Json(serde_json::json!({ "ok": true })))
}
