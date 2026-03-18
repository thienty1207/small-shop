use axum::{
    extract::{Path, Query, State},
    Extension, Json,
};
use uuid::Uuid;

use crate::{
    error::AppError, models::admin::AdminPublic, repositories::review_repo, state::AppState,
};

/// GET /api/admin/reviews
pub async fn list_reviews(
    State(state): State<AppState>,
    Extension(_admin): Extension<AdminPublic>,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> Result<Json<serde_json::Value>, AppError> {
    let page = params
        .get("page")
        .and_then(|v| v.parse::<i64>().ok())
        .unwrap_or(1);
    let limit = params
        .get("limit")
        .and_then(|v| v.parse::<i64>().ok())
        .unwrap_or(20);
    let (items, total) = review_repo::find_all_admin(&state.db, page, limit).await?;
    let total_pages = (total + limit - 1) / limit;
    Ok(Json(serde_json::json!({
        "items": items, "total": total, "page": page,
        "limit": limit, "total_pages": total_pages,
    })))
}

/// DELETE /api/admin/reviews/:id
pub async fn delete_review(
    State(state): State<AppState>,
    Extension(_admin): Extension<AdminPublic>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    review_repo::delete(&state.db, id).await?;
    Ok(Json(serde_json::json!({ "ok": true })))
}
