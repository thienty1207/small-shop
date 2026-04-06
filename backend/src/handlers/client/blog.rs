use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};

use crate::{
    error::AppError,
    models::blog::{BlogPostPublic, BlogQuery, PublicBlogTag},
    models::product::PaginatedResponse,
    services::blog_service,
    state::AppState,
};

/// GET /api/blog
pub async fn list_posts(
    State(state): State<AppState>,
    Query(query): Query<BlogQuery>,
) -> Result<Json<PaginatedResponse<BlogPostPublic>>, AppError> {
    let paginated = blog_service::list_public_posts(&state, &query).await?;
    Ok(Json(paginated))
}

/// GET /api/blog/tags
pub async fn list_tags(
    State(state): State<AppState>,
) -> Result<Json<Vec<PublicBlogTag>>, AppError> {
    let tags = blog_service::list_public_tags(&state).await?;
    Ok(Json(tags))
}

/// GET /api/blog/:slug
pub async fn get_post(
    State(state): State<AppState>,
    Path(slug): Path<String>,
) -> Result<(StatusCode, Json<BlogPostPublic>), AppError> {
    let post = blog_service::get_public_post(&state, &slug).await?;
    Ok((StatusCode::OK, Json(post)))
}
