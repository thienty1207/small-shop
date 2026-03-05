use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};

use crate::{
    error::AppError,
    models::product::{PaginatedResponse, ProductPublic, ProductQuery},
    repositories::product_repo,
    state::AppState,
};

/// GET /api/products
pub async fn list_products(
    State(state): State<AppState>,
    Query(query): Query<ProductQuery>,
) -> Result<Json<PaginatedResponse<ProductPublic>>, AppError> {
    let paginated = product_repo::find_all(&state.db, &query).await?;
    Ok(Json(paginated))
}

/// GET /api/products/:slug
pub async fn get_product(
    State(state): State<AppState>,
    Path(slug): Path<String>,
) -> Result<(StatusCode, Json<ProductPublic>), AppError> {
    let product = product_repo::find_by_slug(&state.db, &slug)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Product '{}' not found", slug)))?;

    Ok((StatusCode::OK, Json(ProductPublic::from(product))))
}

/// GET /api/categories
pub async fn list_categories(
    State(state): State<AppState>,
) -> Result<Json<Vec<crate::models::product::Category>>, AppError> {
    let categories = product_repo::find_all_categories(&state.db).await?;
    Ok(Json(categories))
}
