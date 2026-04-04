use uuid::Uuid;

use crate::{
    error::AppError,
    models::product::{
        AdminProductQuery, Category, CategoryInput, CreateProductInput, PaginatedResponse,
        ProductFiltersResponse, ProductPublic, ProductQuery, ProductSearchSuggestion,
        UpdateProductInput, UpdateStockInput,
    },
    repositories::product_repo,
    state::AppState,
};

const ALLOWED_FRAGRANCE_GENDERS: &[&str] = &["male", "female", "unisex"];
const ALLOWED_FRAGRANCE_LINES: &[&str] = &["designer", "niche", "clone"];

fn validate_badge(badge: Option<&str>) -> Result<(), AppError> {
    let Some(value) = badge.map(str::trim).filter(|value| !value.is_empty()) else {
        return Ok(());
    };

    let normalized = value.to_lowercase();
    if matches!(normalized.as_str(), "sale" | "giam gia" | "giam-gia" | "giảm giá") {
        return Err(AppError::BadRequest(
            "Sale badge has been removed from the storefront".into(),
        ));
    }

    Ok(())
}

fn validate_product_metadata(
    name: &str,
    fragrance_gender: &str,
    homepage_section: Option<&str>,
    fragrance_line: &str,
) -> Result<(), AppError> {
    if name.trim().is_empty() {
        return Err(AppError::BadRequest("Product name is required".into()));
    }

    let normalized_gender = fragrance_gender.trim().to_lowercase();
    if !ALLOWED_FRAGRANCE_GENDERS.contains(&normalized_gender.as_str()) {
        return Err(AppError::BadRequest(
            "Fragrance gender must be one of: male, female, unisex".into(),
        ));
    }

    if let Some(value) = homepage_section.map(str::trim).filter(|value| !value.is_empty()) {
        let normalized_homepage_section = value.to_lowercase();
        if !ALLOWED_FRAGRANCE_GENDERS.contains(&normalized_homepage_section.as_str()) {
            return Err(AppError::BadRequest(
                "Homepage section must be one of: male, female, unisex".into(),
            ));
        }
    }

    let normalized_line = fragrance_line.trim().to_lowercase();
    if !ALLOWED_FRAGRANCE_LINES.contains(&normalized_line.as_str()) {
        return Err(AppError::BadRequest(
            "Fragrance line must be one of: designer, niche, clone".into(),
        ));
    }

    Ok(())
}

/// List public products using `ProductQuery` filters and pagination.
pub async fn list_products(
    state: &AppState,
    query: &ProductQuery,
) -> Result<PaginatedResponse<ProductPublic>, AppError> {
    product_repo::find_all(&state.db, query).await
}

pub async fn list_product_filters(
    state: &AppState,
    query: &ProductQuery,
) -> Result<ProductFiltersResponse, AppError> {
    product_repo::find_filters(&state.db, query).await
}

pub async fn search_product_suggestions(
    state: &AppState,
    search: &str,
    limit: i64,
) -> Result<Vec<ProductSearchSuggestion>, AppError> {
    product_repo::find_search_suggestions(&state.db, search, limit).await
}

/// Get product details by `slug`, including variant list.
pub async fn get_product(state: &AppState, slug: &str) -> Result<ProductPublic, AppError> {
    let product = product_repo::find_by_slug(&state.db, slug)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Product '{}' not found", slug)))?;

    let product_id = product.id;
    let mut public = ProductPublic::from(product);
    public.variants = product_repo::find_variants_by_product(&state.db, product_id).await?;
    Ok(public)
}

/// Get related products for the current `slug`.
///
/// Hard-caps result size to 12 to avoid oversized responses.
pub async fn get_related_products(
    state: &AppState,
    slug: &str,
    limit: i64,
) -> Result<Vec<ProductPublic>, AppError> {
    product_repo::find_related(&state.db, slug, limit.min(12)).await
}

/// Get all product categories.
pub async fn list_categories(state: &AppState) -> Result<Vec<Category>, AppError> {
    product_repo::find_all_categories(&state.db).await
}

/// List products for admin panel (includes pagination metadata).
pub async fn list_products_admin(
    state: &AppState,
    query: &AdminProductQuery,
) -> Result<serde_json::Value, AppError> {
    let page = product_repo::find_all_admin(&state.db, query).await?;
    Ok(serde_json::json!(page))
}

/// Get admin product details by `id`, including variants.
pub async fn get_product_admin(state: &AppState, id: Uuid) -> Result<serde_json::Value, AppError> {
    let product = product_repo::find_admin_by_id(&state.db, id)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Product {id} not found")))?;
    let variants = product_repo::find_variants_by_product(&state.db, id).await?;
    Ok(serde_json::json!({ "product": product, "variants": variants }))
}

/// Create a new product after validating required fields.
pub async fn create_product(
    state: &AppState,
    input: &CreateProductInput,
) -> Result<serde_json::Value, AppError> {
    validate_badge(input.badge.as_deref())?;
    validate_product_metadata(
        &input.name,
        &input.fragrance_gender,
        input.homepage_section.as_deref(),
        &input.fragrance_line,
    )?;
    let product = product_repo::create_product(&state.db, input).await?;
    Ok(serde_json::json!(product))
}

/// Update a product by `id` after input validation.
pub async fn update_product(
    state: &AppState,
    id: Uuid,
    input: &UpdateProductInput,
) -> Result<serde_json::Value, AppError> {
    validate_badge(input.badge.as_deref())?;
    validate_product_metadata(
        &input.name,
        &input.fragrance_gender,
        input.homepage_section.as_deref(),
        &input.fragrance_line,
    )?;
    let product = product_repo::update_product(&state.db, id, input).await?;
    Ok(serde_json::json!(product))
}

/// Reorder product gallery images.
///
/// Allows up to 3 images and removes empty URLs before persisting.
pub async fn reorder_product_images(
    state: &AppState,
    id: Uuid,
    mut images: Vec<String>,
) -> Result<serde_json::Value, AppError> {
    if images.len() > 3 {
        return Err(AppError::BadRequest("Tối đa 3 ảnh gallery".into()));
    }

    images.retain(|u| !u.trim().is_empty());
    let product = product_repo::reorder_product_images(&state.db, id, &images).await?;
    Ok(serde_json::json!(product))
}

/// Delete a product by `id`.
pub async fn delete_product(state: &AppState, id: Uuid) -> Result<(), AppError> {
    product_repo::delete_product(&state.db, id).await
}

/// Get variant inventory rows for the admin inventory screen.
pub async fn list_inventory(state: &AppState) -> Result<serde_json::Value, AppError> {
    let rows = product_repo::get_inventory_list(&state.db).await?;
    Ok(serde_json::json!(rows))
}

/// Update stock for a specific variant.
///
/// Negative stock is not allowed.
pub async fn update_variant_stock(
    state: &AppState,
    variant_id: Uuid,
    input: &UpdateStockInput,
) -> Result<serde_json::Value, AppError> {
    if input.stock < 0 {
        return Err(AppError::BadRequest("Stock cannot be negative".into()));
    }

    let variant = product_repo::update_variant_stock(&state.db, variant_id, input).await?;
    Ok(serde_json::json!(variant))
}

/// Create a new category from admin input.
pub async fn create_category(
    state: &AppState,
    input: &CategoryInput,
) -> Result<serde_json::Value, AppError> {
    if input.name.trim().is_empty() {
        return Err(AppError::BadRequest("Category name is required".into()));
    }
    let cat = product_repo::create_category(&state.db, input).await?;
    Ok(serde_json::json!(cat))
}

/// Update a category by `id`.
pub async fn update_category(
    state: &AppState,
    id: Uuid,
    input: &CategoryInput,
) -> Result<serde_json::Value, AppError> {
    if input.name.trim().is_empty() {
        return Err(AppError::BadRequest("Category name is required".into()));
    }
    let cat = product_repo::update_category(&state.db, id, input).await?;
    Ok(serde_json::json!(cat))
}

/// Delete a category by `id`.
pub async fn delete_category(state: &AppState, id: Uuid) -> Result<(), AppError> {
    product_repo::delete_category(&state.db, id).await
}
