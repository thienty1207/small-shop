use axum::{extract::State, Extension, Json};

use crate::{error::AppError, models::user::UserPublic, state::AppState};

/// GET /api/admin/customers
///
/// Returns all registered users (paginated in the future).
/// TODO: PATCH /:id to change role (user ↔ admin), soft-delete
pub async fn list_customers(
    State(_state): State<AppState>,
    Extension(_admin): Extension<UserPublic>,
) -> Result<Json<serde_json::Value>, AppError> {
    // TODO: call user_repo::find_all_admin()
    Ok(Json(serde_json::json!([])))
}
