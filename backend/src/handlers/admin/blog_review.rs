use axum::{
    extract::{Path, Query, State},
    Extension, Json,
};
use uuid::Uuid;

use crate::{
    error::AppError,
    models::{admin::AdminPublic, blog_comment::CreateCommentReplyInput},
    services::{blog_review_service, permissions_service},
    state::AppState,
};

/// GET /api/admin/blog-reviews
pub async fn list_reviews(
    State(state): State<AppState>,
    Extension(admin): Extension<AdminPublic>,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> Result<Json<serde_json::Value>, AppError> {
    permissions_service::require_permission(&state, &admin, "blog.view").await?;

    let page = params
        .get("page")
        .and_then(|v| v.parse::<i64>().ok())
        .unwrap_or(1);
    let limit = params
        .get("limit")
        .and_then(|v| v.parse::<i64>().ok())
        .unwrap_or(20);

    let payload = blog_review_service::list_reviews_admin(&state, page, limit).await?;
    Ok(Json(payload))
}

/// DELETE /api/admin/blog-reviews/:id
pub async fn delete_review(
    State(state): State<AppState>,
    Extension(admin): Extension<AdminPublic>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    permissions_service::require_permission(&state, &admin, "blog.delete").await?;
    blog_review_service::delete_review(&state, id).await?;
    Ok(Json(serde_json::json!({ "ok": true })))
}

/// GET /api/admin/blog-reviews/post/:post_id/thread
pub async fn get_post_thread(
    State(state): State<AppState>,
    Extension(admin): Extension<AdminPublic>,
    Path(post_id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    permissions_service::require_permission(&state, &admin, "blog.view").await?;
    let payload = blog_review_service::get_post_thread_admin(&state, post_id).await?;
    Ok(Json(payload))
}

/// POST /api/admin/blog-reviews/comments/:comment_id/replies
pub async fn admin_reply_comment(
    State(state): State<AppState>,
    Extension(admin): Extension<AdminPublic>,
    Path(comment_id): Path<Uuid>,
    Json(input): Json<CreateCommentReplyInput>,
) -> Result<Json<serde_json::Value>, AppError> {
    permissions_service::require_permission(&state, &admin, "blog.edit").await?;
    let payload = blog_review_service::admin_reply_comment(&state, &admin, comment_id, &input).await?;
    Ok(Json(payload))
}

/// DELETE /api/admin/blog-reviews/comments/:comment_id
pub async fn delete_comment(
    State(state): State<AppState>,
    Extension(admin): Extension<AdminPublic>,
    Path(comment_id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    permissions_service::require_permission(&state, &admin, "blog.delete").await?;
    blog_review_service::admin_delete_comment(&state, comment_id).await?;
    Ok(Json(serde_json::json!({ "ok": true })))
}

/// DELETE /api/admin/blog-reviews/replies/:reply_id
pub async fn delete_reply(
    State(state): State<AppState>,
    Extension(admin): Extension<AdminPublic>,
    Path(reply_id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    permissions_service::require_permission(&state, &admin, "blog.delete").await?;
    blog_review_service::admin_delete_reply(&state, reply_id).await?;
    Ok(Json(serde_json::json!({ "ok": true })))
}
