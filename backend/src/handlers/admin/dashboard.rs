use axum::{extract::State, Extension, Json};

use crate::{
    error::AppError,
    models::admin::AdminPublic,
    services::dashboard_service,
    state::AppState,
};

/// GET /api/admin/dashboard
///
/// Returns real aggregated stats from the database.
pub async fn get_stats(
    State(state): State<AppState>,
    Extension(_admin): Extension<AdminPublic>,
) -> Result<Json<serde_json::Value>, AppError> {
    let payload = dashboard_service::get_dashboard_payload(&state).await?;
    Ok(Json(payload))
}
