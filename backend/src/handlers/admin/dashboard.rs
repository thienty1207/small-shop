use axum::{extract::State, Extension, Json};

use crate::{error::AppError, models::admin::AdminPublic, state::AppState};

/// GET /api/admin/dashboard
///
/// Returns high-level statistics: total orders, revenue, customers, products.
pub async fn get_stats(
    State(_state): State<AppState>,
    Extension(_admin): Extension<AdminPublic>,
) -> Result<Json<serde_json::Value>, AppError> {
    // TODO: query actual aggregates from DB
    Ok(Json(serde_json::json!({
        "total_orders":    0,
        "total_revenue":   0,
        "total_customers": 0,
        "total_products":  0,
    })))
}
