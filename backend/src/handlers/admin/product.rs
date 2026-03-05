use axum::{
    extract::{Multipart, Path, Query, State},
    Extension, Json,
};
use uuid::Uuid;

use crate::{
    error::AppError,
    models::{
        admin::AdminPublic,
        product::{AdminProductQuery, CreateProductInput, UpdateProductInput},
    },
    repositories::product_repo,
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
    Ok(Json(serde_json::json!(product)))
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
    if input.price <= 0 {
        return Err(AppError::BadRequest("Price must be positive".into()));
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

/// POST /api/admin/upload/image  — multipart image upload
///
/// Accepts a single `image` field, saves to `uploads/` and returns the URL.
pub async fn upload_image(
    Extension(_admin): Extension<AdminPublic>,
    mut multipart: Multipart,
) -> Result<Json<serde_json::Value>, AppError> {
    let uploads_dir = std::path::Path::new("uploads");
    if !uploads_dir.exists() {
        tokio::fs::create_dir_all(uploads_dir)
            .await
            .map_err(|e| AppError::Internal(format!("Cannot create uploads dir: {e}")))?;
    }

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| AppError::BadRequest(format!("Multipart error: {e}")))?
    {
        let content_type = field.content_type().unwrap_or("").to_string();
        if !content_type.starts_with("image/") {
            return Err(AppError::BadRequest("Only image files are allowed".into()));
        }

        let ext = match content_type.as_str() {
            "image/png"  => "png",
            "image/webp" => "webp",
            "image/gif"  => "gif",
            _            => "jpg",
        };

        let filename = format!("{}.{}", Uuid::new_v4(), ext);
        let filepath = format!("uploads/{filename}");

        let data = field
            .bytes()
            .await
            .map_err(|e| AppError::Internal(format!("Read error: {e}")))?;

        if data.len() > 5 * 1024 * 1024 {
            return Err(AppError::BadRequest("File too large (max 5 MB)".into()));
        }

        tokio::fs::write(&filepath, &data)
            .await
            .map_err(|e| AppError::Internal(format!("Write error: {e}")))?;

        return Ok(Json(serde_json::json!({ "url": format!("/uploads/{filename}") })));
    }

    Err(AppError::BadRequest("No image field in request".into()))
}
