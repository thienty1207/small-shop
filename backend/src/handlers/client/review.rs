use axum::{
    extract::{Path, Query, State},
    Extension, Json,
};
use uuid::Uuid;

use crate::{
    error::AppError,
    models::{
        review::{CreateReviewInput, ReviewQuery},
        user::UserPublic,
    },
    repositories::review_repo,
    state::AppState,
};

/// GET /api/products/:product_id/reviews
pub async fn list_reviews(
    State(state): State<AppState>,
    Path(product_id): Path<Uuid>,
    Query(query): Query<ReviewQuery>,
) -> Result<Json<serde_json::Value>, AppError> {
    let (items, total) = review_repo::find_by_product(&state.db, product_id, &query).await?;
    let total_pages = (total + query.limit - 1) / query.limit;
    Ok(Json(serde_json::json!({
        "items":       items,
        "total":       total,
        "page":        query.page,
        "limit":       query.limit,
        "total_pages": total_pages,
    })))
}

/// POST /api/products/:product_id/reviews  (requires auth)
pub async fn create_review(
    State(state): State<AppState>,
    Extension(user): Extension<UserPublic>,
    Path(product_id): Path<Uuid>,
    Json(input): Json<CreateReviewInput>,
) -> Result<Json<serde_json::Value>, AppError> {
    let review = review_repo::upsert(&state.db, user.id, product_id, &input).await?;
    Ok(Json(serde_json::json!(review)))
}

/// GET /api/products/:product_id/reviews/me  — current user's review (requires auth)
pub async fn get_my_review(
    State(state): State<AppState>,
    Extension(user): Extension<UserPublic>,
    Path(product_id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    let review = review_repo::find_by_user_product(&state.db, user.id, product_id).await?;
    Ok(Json(serde_json::json!(review)))
}
