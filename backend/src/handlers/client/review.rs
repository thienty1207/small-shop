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
    services::review_service,
    state::AppState,
};

/// GET /api/products/:product_id/reviews
pub async fn list_reviews(
    State(state): State<AppState>,
    Path(product_id): Path<Uuid>,
    Query(query): Query<ReviewQuery>,
) -> Result<Json<serde_json::Value>, AppError> {
    let payload = review_service::list_reviews(&state, product_id, &query).await?;
    Ok(Json(payload))
}

/// POST /api/products/:product_id/reviews  (requires auth)
pub async fn create_review(
    State(state): State<AppState>,
    Extension(user): Extension<UserPublic>,
    Path(product_id): Path<Uuid>,
    Json(input): Json<CreateReviewInput>,
) -> Result<Json<serde_json::Value>, AppError> {
    let review = review_service::create_review(&state, user.id, product_id, &input).await?;
    Ok(Json(serde_json::json!(review)))
}

/// GET /api/products/:product_id/reviews/me  — current user's review (requires auth)
pub async fn get_my_review(
    State(state): State<AppState>,
    Extension(user): Extension<UserPublic>,
    Path(product_id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    let review = review_service::get_my_review(&state, user.id, product_id).await?;
    Ok(Json(review))
}
