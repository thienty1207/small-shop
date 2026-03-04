use axum::{extract::State, Extension, Json};

use crate::{error::AppError, models::admin::AdminPublic, state::AppState};

/// GET /api/admin/orders
///
/// Returns all orders across all customers.
/// TODO: PATCH /:id to update status (pending → confirmed → shipped → delivered)
pub async fn list_orders(
    State(_state): State<AppState>,
    Extension(_admin): Extension<AdminPublic>,
) -> Result<Json<serde_json::Value>, AppError> {
    // TODO: call order_repo::find_all_admin()
    Ok(Json(serde_json::json!([])))
}
