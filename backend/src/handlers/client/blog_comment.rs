use axum::{
    extract::{Path, Query, State},
    Extension, Json,
};
use uuid::Uuid;

use crate::{
    error::AppError,
    models::{
        blog_comment::{BlogCommentQuery, CreateCommentReplyInput},
        user::UserPublic,
    },
    services::blog_comment_service,
    state::AppState,
};

/// GET /api/blog/:post_id/comments
pub async fn list_comments(
    State(state): State<AppState>,
    Path(post_id): Path<Uuid>,
    Query(query): Query<BlogCommentQuery>,
) -> Result<Json<serde_json::Value>, AppError> {
    let payload = blog_comment_service::list_comments(&state, post_id, &query).await?;
    Ok(Json(payload))
}

/// GET /api/blog/comments/:comment_id/replies
pub async fn list_replies(
    State(state): State<AppState>,
    Path(comment_id): Path<Uuid>,
    Query(query): Query<BlogCommentQuery>,
) -> Result<Json<serde_json::Value>, AppError> {
    let payload = blog_comment_service::list_replies(&state, comment_id, &query).await?;
    Ok(Json(payload))
}

/// POST /api/blog/comments/:comment_id/replies
pub async fn create_reply(
    State(state): State<AppState>,
    Extension(user): Extension<UserPublic>,
    Path(comment_id): Path<Uuid>,
    Json(input): Json<CreateCommentReplyInput>,
) -> Result<Json<serde_json::Value>, AppError> {
    let payload = blog_comment_service::create_reply(&state, &user, comment_id, &input).await?;
    Ok(Json(payload))
}

/// POST /api/blog/comments/:comment_id/likes/toggle
pub async fn toggle_like(
    State(state): State<AppState>,
    Extension(user): Extension<UserPublic>,
    Path(comment_id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    let payload = blog_comment_service::toggle_like(&state, &user, comment_id).await?;
    Ok(Json(payload))
}

/// GET /api/blog/:post_id/comments/likes/me
pub async fn my_liked_comment_ids(
    State(state): State<AppState>,
    Extension(user): Extension<UserPublic>,
    Path(post_id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    let payload = blog_comment_service::list_my_liked_comment_ids(&state, user.id, post_id).await?;
    Ok(Json(payload))
}
