use axum::{
    extract::{Path, Query, State},
    Extension, Json,
};
use uuid::Uuid;

use crate::{
    error::AppError,
    models::{
        admin::AdminPublic,
        order::{AdminOrderQuery, UpdateOrderStatusInput},
    },
    services::order_service,
    state::AppState,
};

/// GET /api/admin/orders  — paginated with status/search filters
pub async fn list_orders(
    State(state): State<AppState>,
    Extension(_admin): Extension<AdminPublic>,
    Query(query): Query<AdminOrderQuery>,
) -> Result<Json<serde_json::Value>, AppError> {
    let payload = order_service::list_admin_orders(&state, &query).await?;
    Ok(Json(payload))
}

/// GET /api/admin/orders/:id  — full order with items
pub async fn get_order(
    State(state): State<AppState>,
    Extension(_admin): Extension<AdminPublic>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    let payload = order_service::get_admin_order(&state, id).await?;
    Ok(Json(payload))
}

/// PUT /api/admin/orders/:id/status
pub async fn update_order_status(
    State(state): State<AppState>,
    Extension(_admin): Extension<AdminPublic>,
    Path(id): Path<Uuid>,
    Json(input): Json<UpdateOrderStatusInput>,
) -> Result<Json<serde_json::Value>, AppError> {
    let payload = order_service::update_admin_order_status(&state, id, &input).await?;
    Ok(Json(payload))
}
