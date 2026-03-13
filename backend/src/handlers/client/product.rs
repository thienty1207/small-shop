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
/// Returns the product plus all its variants sorted by ml ascending.
pub async fn get_product(
    State(state): State<AppState>,
    Path(slug): Path<String>,
) -> Result<(StatusCode, Json<ProductPublic>), AppError> {
    let product = product_repo::find_by_slug(&state.db, &slug)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Product '{}' not found", slug)))?;

    let product_id = product.id;
    let mut public = ProductPublic::from(product);
    // Attach all variants so the client can render the size selector.
    public.variants = product_repo::find_variants_by_product(&state.db, product_id).await?;

    Ok((StatusCode::OK, Json(public)))
}

/// GET /api/products/:slug/related?limit=4
/// Returns related products (same brand first, fallback same category).
pub async fn get_related_products(
    State(state): State<AppState>,
    Path(slug): Path<String>,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> Result<Json<Vec<ProductPublic>>, AppError> {
    let limit = params
        .get("limit")
        .and_then(|v| v.parse::<i64>().ok())
        .unwrap_or(4)
        .min(12);
    let related = product_repo::find_related(&state.db, &slug, limit).await?;
    Ok(Json(related))
}

/// GET /api/categories
pub async fn list_categories(
    State(state): State<AppState>,
) -> Result<Json<Vec<crate::models::product::Category>>, AppError> {
    let categories = product_repo::find_all_categories(&state.db).await?;
    Ok(Json(categories))
}
