use axum::{extract::State, Json};

use crate::{error::AppError, state::AppState};

/// Liveness probe.
/// Returns OK when process is alive.
pub async fn liveness() -> Json<serde_json::Value> {
    Json(serde_json::json!({ "status": "ok" }))
}

/// Readiness probe.
/// Returns ready only when DB is reachable.
pub async fn readiness(State(state): State<AppState>) -> Result<Json<serde_json::Value>, AppError> {
    let _: i32 = sqlx::query_scalar("SELECT 1").fetch_one(&state.db).await?;
    Ok(Json(serde_json::json!({ "status": "ready" })))
}
