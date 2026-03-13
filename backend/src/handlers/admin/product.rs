use axum::{
    extract::{Multipart, Path, Query, State},
    Extension, Json,
};
use uuid::Uuid;

use crate::{
    error::AppError,
    models::{
        admin::AdminPublic,
        product::{AdminProductQuery, CreateProductInput, UpdateProductInput, UpdateStockInput},
    },
    repositories::product_repo,
    services::cloudinary as cloudinary_service,
    state::AppState,
};

/// GET /api/admin/products  — paginated list with search & filter
pub async fn list_products(
    State(state): State<AppState>,
    Extension(_admin): Extension<AdminPublic>,
    Query(query): Query<AdminProductQuery>,
) -> Result<Json<serde_json::Value>, AppError> {
    let page = product_repo::find_all_admin(&state.db, &query).await?;
    Ok(Json(serde_json::json!(page)))
}

/// GET /api/admin/products/:id
pub async fn get_product(
    State(state): State<AppState>,
    Extension(_admin): Extension<AdminPublic>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    let product = product_repo::find_admin_by_id(&state.db, id)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Product {id} not found")))?;
    let variants = product_repo::find_variants_by_product(&state.db, id).await?;
    Ok(Json(serde_json::json!({ "product": product, "variants": variants })))
}

/// POST /api/admin/products
pub async fn create_product(
    State(state): State<AppState>,
    Extension(_admin): Extension<AdminPublic>,
    Json(input): Json<CreateProductInput>,
) -> Result<Json<serde_json::Value>, AppError> {
    if input.name.trim().is_empty() {
        return Err(AppError::BadRequest("Product name is required".into()));
    }
    let product = product_repo::create_product(&state.db, &input).await?;
    Ok(Json(serde_json::json!(product)))
}

/// PUT /api/admin/products/:id
pub async fn update_product(
    State(state): State<AppState>,
    Extension(_admin): Extension<AdminPublic>,
    Path(id): Path<Uuid>,
    Json(input): Json<UpdateProductInput>,
) -> Result<Json<serde_json::Value>, AppError> {
    if input.name.trim().is_empty() {
        return Err(AppError::BadRequest("Product name is required".into()));
    }
    let product = product_repo::update_product(&state.db, id, &input).await?;
    Ok(Json(serde_json::json!(product)))
}

/// DELETE /api/admin/products/:id
pub async fn delete_product(
    State(state): State<AppState>,
    Extension(_admin): Extension<AdminPublic>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    product_repo::delete_product(&state.db, id).await?;
    Ok(Json(serde_json::json!({ "ok": true })))
}

// ─── Inventory ────────────────────────────────────────────────────────────────

/// GET /api/admin/inventory  — all variants with product info for stock management
pub async fn list_inventory(
    State(state): State<AppState>,
    Extension(_admin): Extension<AdminPublic>,
) -> Result<Json<serde_json::Value>, AppError> {
    let rows = product_repo::get_inventory_list(&state.db).await?;
    Ok(Json(serde_json::json!(rows)))
}

/// PATCH /api/admin/inventory/variants/:id/stock
pub async fn update_variant_stock(
    State(state): State<AppState>,
    Extension(_admin): Extension<AdminPublic>,
    Path(variant_id): Path<Uuid>,
    Json(input): Json<UpdateStockInput>,
) -> Result<Json<serde_json::Value>, AppError> {
    if input.stock < 0 {
        return Err(AppError::BadRequest("Stock cannot be negative".into()));
    }
    let variant = product_repo::update_variant_stock(&state.db, variant_id, &input).await?;
    Ok(Json(serde_json::json!(variant)))
}

// ─── Image Upload ─────────────────────────────────────────────────────────────

/// POST /api/admin/upload/image  — multipart image upload to Cloudinary
pub async fn upload_image(
    State(state): State<AppState>,
    Extension(_admin): Extension<AdminPublic>,
    mut multipart: Multipart,
) -> Result<Json<serde_json::Value>, AppError> {
    let cloudinary = state.cloudinary.as_ref().ok_or_else(|| {
        AppError::Internal("Cloudinary chưa được cấu hình — kiểm tra CLOUDINARY_URL trong .env".into())
    })?;

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| AppError::BadRequest(format!("Multipart error: {e}")))?
    {
        let raw_ct = field.content_type().unwrap_or("").to_string();
        let filename_hint = field.file_name().unwrap_or("").to_lowercase();
        let content_type: String = if raw_ct.starts_with("image/") {
            raw_ct
        } else if filename_hint.ends_with(".png") {
            "image/png".into()
        } else if filename_hint.ends_with(".webp") {
            "image/webp".into()
        } else if filename_hint.ends_with(".gif") {
            "image/gif".into()
        } else if filename_hint.ends_with(".jpg") || filename_hint.ends_with(".jpeg") {
            "image/jpeg".into()
        } else if !raw_ct.is_empty() && !raw_ct.starts_with("image/") {
            return Err(AppError::BadRequest("Only image files are allowed".into()));
        } else {
            "image/jpeg".into()
        };

        let data = field
            .bytes()
            .await
            .map_err(|e| AppError::Internal(format!("Read error: {e}")))?;

        if data.is_empty() {
            return Err(AppError::BadRequest("Empty file".into()));
        }
        if data.len() > 10 * 1024 * 1024 {
            return Err(AppError::BadRequest("File too large (max 10 MB)".into()));
        }

        let url = cloudinary_service::upload_image(
            cloudinary,
            &state.http_client,
            data.to_vec(),
            &content_type,
            "shop/images",
        )
        .await?;

        return Ok(Json(serde_json::json!({ "url": url })));
    }

    Err(AppError::BadRequest("No image field in request".into()))
}
