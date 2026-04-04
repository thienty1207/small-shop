use axum::{
    extract::{Multipart, Path, Query, State},
    Extension, Json,
};
use serde::Deserialize;
use uuid::Uuid;

use crate::{
    error::AppError,
    models::{
        admin::AdminPublic,
        product::{AdminProductQuery, CreateProductInput, UpdateProductInput, UpdateStockInput},
    },
    services::{permissions_service, product_service, user_service},
    state::AppState,
};

fn map_multipart_error(context: &str, error: impl std::fmt::Display) -> AppError {
    let message = error.to_string();
    let lower = message.to_lowercase();

    if lower.contains("body too large")
        || lower.contains("length limit")
        || lower.contains("too large")
        || lower.contains("overflow")
    {
        return AppError::BadRequest("File too large (max 10 MB)".into());
    }

    AppError::BadRequest(format!("{context}: {message}"))
}

/// GET /api/admin/products  — paginated list with search & filter
pub async fn list_products(
    State(state): State<AppState>,
    Extension(admin): Extension<AdminPublic>,
    Query(query): Query<AdminProductQuery>,
) -> Result<Json<serde_json::Value>, AppError> {
    permissions_service::require_permission(&state, &admin, "products.view").await?;
    let page = product_service::list_products_admin(&state, &query).await?;
    Ok(Json(page))
}

/// GET /api/admin/products/:id
pub async fn get_product(
    State(state): State<AppState>,
    Extension(admin): Extension<AdminPublic>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    permissions_service::require_permission(&state, &admin, "products.view").await?;
    let payload = product_service::get_product_admin(&state, id).await?;
    Ok(Json(payload))
}

/// POST /api/admin/products
pub async fn create_product(
    State(state): State<AppState>,
    Extension(admin): Extension<AdminPublic>,
    Json(input): Json<CreateProductInput>,
) -> Result<Json<serde_json::Value>, AppError> {
    permissions_service::require_permission(&state, &admin, "products.edit").await?;
    let product = product_service::create_product(&state, &input).await?;
    Ok(Json(product))
}

/// PUT /api/admin/products/:id
pub async fn update_product(
    State(state): State<AppState>,
    Extension(admin): Extension<AdminPublic>,
    Path(id): Path<Uuid>,
    Json(input): Json<UpdateProductInput>,
) -> Result<Json<serde_json::Value>, AppError> {
    permissions_service::require_permission(&state, &admin, "products.edit").await?;
    let product = product_service::update_product(&state, id, &input).await?;
    Ok(Json(product))
}

#[derive(Debug, Deserialize)]
/// Payload for reordering product gallery images.
pub struct ReorderImagesInput {
    pub images: Vec<String>,
}

/// PUT /api/admin/products/:id/images/reorder
pub async fn reorder_product_images(
    State(state): State<AppState>,
    Extension(admin): Extension<AdminPublic>,
    Path(id): Path<Uuid>,
    Json(input): Json<ReorderImagesInput>,
) -> Result<Json<serde_json::Value>, AppError> {
    permissions_service::require_permission(&state, &admin, "products.edit").await?;
    let product = product_service::reorder_product_images(&state, id, input.images).await?;
    Ok(Json(product))
}

/// DELETE /api/admin/products/:id
pub async fn delete_product(
    State(state): State<AppState>,
    Extension(admin): Extension<AdminPublic>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    permissions_service::require_permission(&state, &admin, "products.delete").await?;
    product_service::delete_product(&state, id).await?;
    Ok(Json(serde_json::json!({ "ok": true })))
}

// ─── Inventory ────────────────────────────────────────────────────────────────

/// GET /api/admin/inventory  — all variants with product info for stock management
pub async fn list_inventory(
    State(state): State<AppState>,
    Extension(admin): Extension<AdminPublic>,
) -> Result<Json<serde_json::Value>, AppError> {
    permissions_service::require_permission(&state, &admin, "products.view").await?;
    let rows = product_service::list_inventory(&state).await?;
    Ok(Json(rows))
}

/// PATCH /api/admin/inventory/variants/:id/stock
pub async fn update_variant_stock(
    State(state): State<AppState>,
    Extension(admin): Extension<AdminPublic>,
    Path(variant_id): Path<Uuid>,
    Json(input): Json<UpdateStockInput>,
) -> Result<Json<serde_json::Value>, AppError> {
    permissions_service::require_permission(&state, &admin, "products.edit").await?;
    let variant = product_service::update_variant_stock(&state, variant_id, &input).await?;
    Ok(Json(variant))
}

// ─── Image Upload ─────────────────────────────────────────────────────────────

/// POST /api/admin/upload/image  — multipart image upload to Cloudinary
pub async fn upload_image(
    State(state): State<AppState>,
    Extension(admin): Extension<AdminPublic>,
    mut multipart: Multipart,
) -> Result<Json<serde_json::Value>, AppError> {
    permissions_service::require_permission(&state, &admin, "products.edit").await?;
    let cloudinary = state.cloudinary.as_ref().ok_or_else(|| {
        AppError::Internal(
            "Cloudinary chưa được cấu hình — kiểm tra CLOUDINARY_URL trong .env".into(),
        )
    })?;

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| map_multipart_error("Multipart error", e))?
    {
        let raw_ct = field.content_type().unwrap_or("");
        let filename_hint = field.file_name().unwrap_or("");
        let content_type = user_service::infer_image_content_type(raw_ct, filename_hint)?;

        let data = field
            .bytes()
            .await
            .map_err(|e| map_multipart_error("Read error", e))?;

        if data.is_empty() {
            return Err(AppError::BadRequest("Empty file".into()));
        }
        if data.len() > 10 * 1024 * 1024 {
            return Err(AppError::BadRequest("File too large (max 10 MB)".into()));
        }

        let url = crate::services::cloudinary::upload_image(
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

/// POST /api/admin/upload/video  — multipart video upload to Cloudinary
pub async fn upload_video(
    State(state): State<AppState>,
    Extension(admin): Extension<AdminPublic>,
    mut multipart: Multipart,
) -> Result<Json<serde_json::Value>, AppError> {
    permissions_service::require_permission(&state, &admin, "products.edit").await?;
    let cloudinary = state.cloudinary.as_ref().ok_or_else(|| {
        AppError::Internal(
            "Cloudinary chưa được cấu hình — kiểm tra CLOUDINARY_URL trong .env".into(),
        )
    })?;

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| map_multipart_error("Multipart error", e))?
    {
        let raw_ct = field.content_type().unwrap_or("");
        let filename_hint = field.file_name().unwrap_or("");
        let content_type = user_service::infer_video_content_type(raw_ct, filename_hint)?;

        let data = field
            .bytes()
            .await
            .map_err(|e| map_multipart_error("Read error", e))?;

        if data.is_empty() {
            return Err(AppError::BadRequest("Empty file".into()));
        }
        if data.len() > 35 * 1024 * 1024 {
            return Err(AppError::BadRequest("File too large (max 35 MB)".into()));
        }

        let url = crate::services::cloudinary::upload_video(
            cloudinary,
            &state.http_client,
            data.to_vec(),
            &content_type,
            "shop/videos",
        )
        .await?;

        return Ok(Json(serde_json::json!({ "url": url })));
    }

    Err(AppError::BadRequest("No video field in request".into()))
}
