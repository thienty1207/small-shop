use axum::{
    extract::{Path, State},
    http::StatusCode,
    Extension, Json,
};
use uuid::Uuid;

use crate::{
    error::AppError,
    models::{
        order::{CreateOrderInput, OrderPublic},
        user::UserPublic,
    },
    services::order_service,
    state::AppState,
};

/// POST /api/orders — place a new order (authenticated users only)
pub async fn create_order(
    State(state): State<AppState>,
    Extension(user): Extension<UserPublic>,
    Json(input): Json<CreateOrderInput>,
) -> Result<(StatusCode, Json<OrderPublic>), AppError> {
    let response = order_service::create_order_for_user(&state, user.id, &input).await?;
    Ok((StatusCode::CREATED, Json(response)))
}

/// GET /api/orders/:id — get a single order (must belong to the requesting user)
pub async fn get_order(
    State(state): State<AppState>,
    Extension(user): Extension<UserPublic>,
    Path(order_id): Path<Uuid>,
) -> Result<Json<OrderPublic>, AppError> {
    let order = order_service::get_user_order(&state, user.id, order_id).await?;
    Ok(Json(order))
}

/// GET /api/orders — list orders for the current user
pub async fn list_orders(
    State(state): State<AppState>,
    Extension(user): Extension<UserPublic>,
) -> Result<Json<Vec<crate::models::order::OrderListItem>>, AppError> {
    let orders = order_service::list_user_orders(&state, user.id).await?;
    Ok(Json(orders))
}
