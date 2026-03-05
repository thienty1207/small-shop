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

    let order = order_repo::update_order_status(&state.db, id, &input.status).await?;

    // Send status-update email (best-effort — don't fail the request on email error)
    if let Some(mailer) = &state.mailer {
        if let Err(e) = email_service::send_order_status_update(
            &state.config,
            mailer,
            &order,
            &input.status,
            input.note.as_deref(),
        )
        .await
        {
            tracing::warn!("Failed to send status-update email for order {id}: {e}");
        }
    }

    Ok(Json(serde_json::json!(order)))
}
