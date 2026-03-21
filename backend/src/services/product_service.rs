use uuid::Uuid;

use crate::{
    error::AppError,
    models::product::{
        AdminProductQuery, Category, CategoryInput, CreateProductInput, PaginatedResponse,
        ProductPublic, ProductQuery, UpdateProductInput, UpdateStockInput,
    },
    repositories::product_repo,
    state::AppState,
};

pub async fn list_products(
    state: &AppState,
    query: &ProductQuery,
) -> Result<PaginatedResponse<ProductPublic>, AppError> {
    product_repo::find_all(&state.db, query).await
}

pub async fn get_product(state: &AppState, slug: &str) -> Result<ProductPublic, AppError> {
    let product = product_repo::find_by_slug(&state.db, slug)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Product '{}' not found", slug)))?;

    let product_id = product.id;
    let mut public = ProductPublic::from(product);
    public.variants = product_repo::find_variants_by_product(&state.db, product_id).await?;
    Ok(public)
}

pub async fn get_related_products(
    state: &AppState,
    slug: &str,
    limit: i64,
) -> Result<Vec<ProductPublic>, AppError> {
    product_repo::find_related(&state.db, slug, limit.min(12)).await
}

pub async fn list_categories(state: &AppState) -> Result<Vec<Category>, AppError> {
    product_repo::find_all_categories(&state.db).await
}

pub async fn list_products_admin(
    state: &AppState,
    query: &AdminProductQuery,
) -> Result<serde_json::Value, AppError> {
    let page = product_repo::find_all_admin(&state.db, query).await?;
    Ok(serde_json::json!(page))
}

pub async fn get_product_admin(state: &AppState, id: Uuid) -> Result<serde_json::Value, AppError> {
    let product = product_repo::find_admin_by_id(&state.db, id)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Product {id} not found")))?;
    let variants = product_repo::find_variants_by_product(&state.db, id).await?;
    Ok(serde_json::json!({ "product": product, "variants": variants }))
}

pub async fn create_product(
    state: &AppState,
    input: &CreateProductInput,
) -> Result<serde_json::Value, AppError> {
    if input.name.trim().is_empty() {
        return Err(AppError::BadRequest("Product name is required".into()));
    }
    let product = product_repo::create_product(&state.db, input).await?;
    Ok(serde_json::json!(product))
}

pub async fn update_product(
    state: &AppState,
    id: Uuid,
    input: &UpdateProductInput,
) -> Result<serde_json::Value, AppError> {
    if input.name.trim().is_empty() {
        return Err(AppError::BadRequest("Product name is required".into()));
    }
    let product = product_repo::update_product(&state.db, id, input).await?;
    Ok(serde_json::json!(product))
}

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

pub async fn delete_product(state: &AppState, id: Uuid) -> Result<(), AppError> {
    product_repo::delete_product(&state.db, id).await
}

pub async fn list_inventory(state: &AppState) -> Result<serde_json::Value, AppError> {
    let rows = product_repo::get_inventory_list(&state.db).await?;
    Ok(serde_json::json!(rows))
}

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

pub async fn delete_category(state: &AppState, id: Uuid) -> Result<(), AppError> {
    product_repo::delete_category(&state.db, id).await
}
