use axum::{extract::State, Extension, Json};

use crate::{
    error::AppError,
    models::admin::AdminPublic,
    services::{dashboard_service, permissions_service},
    state::AppState,
};

/// GET /api/admin/dashboard
///
/// Returns real aggregated stats from the database.
pub async fn get_stats(
    State(state): State<AppState>,
    Extension(admin): Extension<AdminPublic>,
) -> Result<Json<serde_json::Value>, AppError> {
    permissions_service::require_permission(&state, &admin, "dashboard.view").await?;
    let payload = dashboard_service::get_dashboard_payload(&state).await?;
    Ok(Json(payload))
}
