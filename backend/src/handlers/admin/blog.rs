use axum::{
    extract::{Path, Query, State},
    Extension, Json,
};
use uuid::Uuid;

use crate::{
    error::AppError,
    models::{
        admin::AdminPublic,
        blog::{AdminBlogQuery, BlogTagInput, CreateBlogPostInput, UpdateBlogPostInput},
    },
    services::{blog_service, permissions_service},
    state::AppState,
};

/// GET /api/admin/blog
pub async fn list_posts(
    State(state): State<AppState>,
    Extension(admin): Extension<AdminPublic>,
    Query(query): Query<AdminBlogQuery>,
) -> Result<Json<serde_json::Value>, AppError> {
    permissions_service::require_permission(&state, &admin, "blog.view").await?;
    let page = blog_service::list_admin_posts(&state, &query).await?;
    Ok(Json(page))
}

/// GET /api/admin/blog/:id
pub async fn get_post(
    State(state): State<AppState>,
    Extension(admin): Extension<AdminPublic>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    permissions_service::require_permission(&state, &admin, "blog.view").await?;
    let payload = blog_service::get_admin_post(&state, id).await?;
    Ok(Json(payload))
}

/// POST /api/admin/blog
pub async fn create_post(
    State(state): State<AppState>,
    Extension(admin): Extension<AdminPublic>,
    Json(input): Json<CreateBlogPostInput>,
) -> Result<Json<serde_json::Value>, AppError> {
    permissions_service::require_permission(&state, &admin, "blog.edit").await?;
    let post = blog_service::create_post(&state, &input).await?;
    Ok(Json(post))
}

/// PUT /api/admin/blog/:id
pub async fn update_post(
    State(state): State<AppState>,
    Extension(admin): Extension<AdminPublic>,
    Path(id): Path<Uuid>,
    Json(input): Json<UpdateBlogPostInput>,
) -> Result<Json<serde_json::Value>, AppError> {
    permissions_service::require_permission(&state, &admin, "blog.edit").await?;
    let post = blog_service::update_post(&state, id, &input).await?;
    Ok(Json(post))
}

/// DELETE /api/admin/blog/:id
pub async fn delete_post(
    State(state): State<AppState>,
    Extension(admin): Extension<AdminPublic>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    permissions_service::require_permission(&state, &admin, "blog.delete").await?;
    blog_service::delete_post(&state, id).await?;
    Ok(Json(serde_json::json!({ "ok": true })))
}

/// GET /api/admin/blog-tags
pub async fn list_tags(
    State(state): State<AppState>,
    Extension(admin): Extension<AdminPublic>,
) -> Result<Json<serde_json::Value>, AppError> {
    permissions_service::require_permission(&state, &admin, "blog.view").await?;
    let tags = blog_service::list_admin_tags(&state).await?;
    Ok(Json(serde_json::json!(tags)))
}

/// POST /api/admin/blog-tags
pub async fn create_tag(
    State(state): State<AppState>,
    Extension(admin): Extension<AdminPublic>,
    Json(input): Json<BlogTagInput>,
) -> Result<Json<serde_json::Value>, AppError> {
    permissions_service::require_permission(&state, &admin, "blog.edit").await?;
    let tag = blog_service::create_tag(&state, &input).await?;
    Ok(Json(tag))
}

/// PUT /api/admin/blog-tags/:id
pub async fn update_tag(
    State(state): State<AppState>,
    Extension(admin): Extension<AdminPublic>,
    Path(id): Path<Uuid>,
    Json(input): Json<BlogTagInput>,
) -> Result<Json<serde_json::Value>, AppError> {
    permissions_service::require_permission(&state, &admin, "blog.edit").await?;
    let tag = blog_service::update_tag(&state, id, &input).await?;
    Ok(Json(tag))
}

/// DELETE /api/admin/blog-tags/:id
pub async fn delete_tag(
    State(state): State<AppState>,
    Extension(admin): Extension<AdminPublic>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    permissions_service::require_permission(&state, &admin, "blog.delete").await?;
    blog_service::delete_tag(&state, id).await?;
    Ok(Json(serde_json::json!({ "ok": true })))
}
