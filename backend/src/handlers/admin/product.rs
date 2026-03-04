use axum::{extract::State, Extension, Json};

use crate::{error::AppError, models::user::UserPublic, state::AppState};

/// GET /api/admin/products
///
/// Returns all products (including out-of-stock, unlisted).
/// TODO: full CRUD — POST (create), PATCH /:id (update), DELETE /:id
pub async fn list_products(
    State(_state): State<AppState>,
    Extension(_admin): Extension<UserPublic>,
) -> Result<Json<serde_json::Value>, AppError> {
    // TODO: call product_repo with admin-level filters (no is_active restriction)
    Ok(Json(serde_json::json!([])))
}
