use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};

use crate::{
    error::AppError,
    models::product::{
        PaginatedResponse, ProductFiltersResponse, ProductPublic, ProductQuery,
        ProductSearchSuggestQuery, ProductSearchSuggestion,
    },
    services::product_service,
    state::AppState,
};

/// GET /api/products
pub async fn list_products(
    State(state): State<AppState>,
    Query(query): Query<ProductQuery>,
) -> Result<Json<PaginatedResponse<ProductPublic>>, AppError> {
    let paginated = product_service::list_products(&state, &query).await?;
    Ok(Json(paginated))
}

/// GET /api/products/filters
pub async fn list_product_filters(
    State(state): State<AppState>,
    Query(query): Query<ProductQuery>,
) -> Result<Json<ProductFiltersResponse>, AppError> {
    let filters = product_service::list_product_filters(&state, &query).await?;
    Ok(Json(filters))
}

/// GET /api/products/search/suggest?search=...&limit=8
pub async fn search_product_suggestions(
    State(state): State<AppState>,
    Query(query): Query<ProductSearchSuggestQuery>,
) -> Result<Json<Vec<ProductSearchSuggestion>>, AppError> {
    let keyword = query.search.unwrap_or_default();
    let limit = query.limit.unwrap_or(8).clamp(1, 12);
    let items = product_service::search_product_suggestions(&state, &keyword, limit).await?;
    Ok(Json(items))
}

/// GET /api/products/:slug
/// Returns the product plus all its variants sorted by ml ascending.
pub async fn get_product(
    State(state): State<AppState>,
    Path(slug): Path<String>,
) -> Result<(StatusCode, Json<ProductPublic>), AppError> {
    let public = product_service::get_product(&state, &slug).await?;
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
    let related = product_service::get_related_products(&state, &slug, limit).await?;
    Ok(Json(related))
}

/// GET /api/categories
pub async fn list_categories(
    State(state): State<AppState>,
) -> Result<Json<Vec<crate::models::product::Category>>, AppError> {
    let categories = product_service::list_categories(&state).await?;
    Ok(Json(categories))
}
