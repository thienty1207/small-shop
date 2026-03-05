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
    repositories::order_repo,
    services::email_service,
    state::AppState,
};

/// GET /api/admin/orders  — paginated with status/search filters
pub async fn list_orders(
    State(state): State<AppState>,
    Extension(_admin): Extension<AdminPublic>,
    Query(query): Query<AdminOrderQuery>,
) -> Result<Json<serde_json::Value>, AppError> {
    let (items, total) = order_repo::find_all_admin(&state.db, &query).await?;
    let total_pages = (total + query.limit - 1) / query.limit;
    Ok(Json(serde_json::json!({
        "items":       items,
        "total":       total,
        "page":        query.page,
        "limit":       query.limit,
        "total_pages": total_pages,
    })))
}

/// GET /api/admin/orders/:id  — full order with items
pub async fn get_order(
    State(state): State<AppState>,
    Extension(_admin): Extension<AdminPublic>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    let (order, items) = order_repo::find_by_id(&state.db, id)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Order {id} not found")))?;
    Ok(Json(serde_json::json!({ "order": order, "items": items })))
}

/// PUT /api/admin/orders/:id/status
pub async fn update_order_status(
    State(state): State<AppState>,
    Extension(_admin): Extension<AdminPublic>,
    Path(id): Path<Uuid>,
    Json(input): Json<UpdateOrderStatusInput>,
) -> Result<Json<serde_json::Value>, AppError> {
    let valid = ["pending", "confirmed", "shipping", "delivered", "cancelled"];
    if !valid.contains(&input.status.as_str()) {
        return Err(AppError::BadRequest(format!(
            "Invalid status '{}'. Must be one of: {}",
            input.status,
            valid.join(", ")
        )));
    }

    // Fetch current order to check existing status before update
    let (current_order, _) = order_repo::find_by_id(&state.db, id)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Order {id} not found")))?;

    // Restore stock when cancelling (only if not already cancelled)
    if input.status == "cancelled" && current_order.status != "cancelled" {
        order_repo::restore_stock_for_order(&state.db, id).await?;
    }

    let order = order_repo::update_order_status(&state.db, id, &input.status).await?;

    // Send status-update email in a background task — do NOT block the HTTP response.
    // Clone only what the async task needs (all are cheap Arc/String clones).
    if let Some(mailer) = state.mailer.clone() {
        let config  = state.config.clone();
        let order_c = order.clone();
        let status  = input.status.clone();
        let note    = input.note.clone();
        tokio::spawn(async move {
            if let Err(e) = email_service::send_order_status_update(
                &config,
                &mailer,
                &order_c,
                &status,
                note.as_deref(),
            )
            .await
            {
                tracing::warn!("Failed to send status-update email for order {id}: {e}");
            }
        });
    }

    Ok(Json(serde_json::json!(order)))
}
