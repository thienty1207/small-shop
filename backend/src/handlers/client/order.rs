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
    repositories::{cart_repo, order_repo},
    services::{email_service, order_service},
    state::AppState,
};

/// POST /api/orders — place a new order (authenticated users only)
pub async fn create_order(
    State(state): State<AppState>,
    Extension(user): Extension<UserPublic>,
    Json(input): Json<CreateOrderInput>,
) -> Result<(StatusCode, Json<OrderPublic>), AppError> {
    // 1. Validate input and calculate totals
    let (items, subtotal, shipping_fee, total) =
        order_service::validate_and_calculate(&input)?;

    // 2. Generate unique order code
    let order_code = order_service::generate_order_code();

    // 3. Persist order + items in one transaction (returns both — no extra round-trip)
    let (order, order_items) = order_repo::create_order(
        &state.db,
        Some(user.id),
        &order_code,
        &input.customer_name,
        &input.customer_email,
        &input.customer_phone,
        &input.address,
        input.note.as_deref(),
        &input.payment_method,
        subtotal,
        shipping_fee,
        total,
        &items,
    )
    .await?;

    // 4. Clear DB cart after successful order
    let _ = cart_repo::clear_cart(&state.db, user.id).await;

    // 5. Fire-and-forget: send confirmation email in background (don't block response)
    if let Some(mailer) = state.mailer.clone() {
        let config = state.config.clone();
        let order_clone = order.clone();
        let items_clone = order_items.clone();
        tokio::spawn(async move {
            if let Err(e) = email_service::send_order_confirmation(
                &config,
                &mailer,
                &order_clone,
                &items_clone,
            )
            .await
            {
                tracing::error!("Failed to send order confirmation email: {e}");
            }
        });
    }

    // 6. Return order details immediately (email sends in background)
    let response = OrderPublic {
        id: order.id,
        order_code: order.order_code,
        customer_name: order.customer_name,
        customer_email: order.customer_email,
        customer_phone: order.customer_phone,
        address: order.address,
        note: order.note,
        payment_method: order.payment_method,
        status: order.status,
        subtotal: order.subtotal,
        shipping_fee: order.shipping_fee,
        total: order.total,
        items: order_items,
        created_at: order.created_at,
    };

    Ok((StatusCode::CREATED, Json(response)))
}

/// GET /api/orders/:id — get a single order (must belong to the requesting user)
pub async fn get_order(
    State(state): State<AppState>,
    Extension(user): Extension<UserPublic>,
    Path(order_id): Path<Uuid>,
) -> Result<Json<OrderPublic>, AppError> {
    let (order, items) = order_repo::find_by_id(&state.db, order_id)
        .await?
        .ok_or_else(|| AppError::NotFound("Order not found".into()))?;

    // Security: only the owner can see their order
    if order.user_id != Some(user.id) {
        return Err(AppError::Unauthorized("Access denied".into()));
    }

    Ok(Json(OrderPublic {
        id: order.id,
        order_code: order.order_code,
        customer_name: order.customer_name,
        customer_email: order.customer_email,
        customer_phone: order.customer_phone,
        address: order.address,
        note: order.note,
        payment_method: order.payment_method,
        status: order.status,
        subtotal: order.subtotal,
        shipping_fee: order.shipping_fee,
        total: order.total,
        items,
        created_at: order.created_at,
    }))
}

/// GET /api/orders — list orders for the current user
pub async fn list_orders(
    State(state): State<AppState>,
    Extension(user): Extension<UserPublic>,
) -> Result<Json<Vec<crate::models::order::OrderListItem>>, AppError> {
    let orders = order_repo::find_by_user(&state.db, user.id).await?;
    Ok(Json(orders))
}
