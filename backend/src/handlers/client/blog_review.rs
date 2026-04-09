use axum::{
    extract::{Path, Query, State},
    Extension, Json,
};
use uuid::Uuid;

use crate::{
    error::AppError,
    models::{
        blog_review::{BlogReviewQuery, CreateBlogReviewInput},
        user::UserPublic,
    },
    services::blog_review_service,
    state::AppState,
};

/// GET /api/blog/:post_id/reviews
pub async fn list_reviews(
    State(state): State<AppState>,
    Path(post_id): Path<Uuid>,
    Query(query): Query<BlogReviewQuery>,
) -> Result<Json<serde_json::Value>, AppError> {
    let payload = blog_review_service::list_reviews(&state, post_id, &query).await?;
    Ok(Json(payload))
}

/// GET /api/blog/:post_id/hearts
pub async fn list_hearts(
    State(state): State<AppState>,
    Path(post_id): Path<Uuid>,
    Query(query): Query<BlogReviewQuery>,
) -> Result<Json<serde_json::Value>, AppError> {
    let payload = blog_review_service::list_hearted_users(&state, post_id, &query).await?;
    Ok(Json(payload))
}

/// POST /api/blog/:post_id/reviews (requires auth)
pub async fn create_or_update_review(
    State(state): State<AppState>,
    Extension(user): Extension<UserPublic>,
    Path(post_id): Path<Uuid>,
    Json(input): Json<CreateBlogReviewInput>,
) -> Result<Json<serde_json::Value>, AppError> {
    let payload =
        blog_review_service::create_or_update_review(&state, user.id, post_id, &input).await?;
    Ok(Json(payload))
}

/// GET /api/blog/:post_id/reviews/me (requires auth)
pub async fn get_my_review(
    State(state): State<AppState>,
    Extension(user): Extension<UserPublic>,
    Path(post_id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    let payload = blog_review_service::get_my_review(&state, user.id, post_id).await?;
    Ok(Json(payload))
}
