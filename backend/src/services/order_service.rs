use chrono::Utc;
use rand::distributions::Alphanumeric;
use rand::{thread_rng, Rng};
use uuid::Uuid;

use crate::{
    error::AppError,
    models::order::{
        AdminOrderQuery, CreateOrderInput, OrderListItem, OrderPublic, OrderItemInput,
        UpdateOrderStatusInput,
    },
    repositories::order_repo,
    services::{coupon_service, email_service},
    state::AppState,
};

/// Validate the order input and calculate totals.
/// Returns `(items_validated, subtotal, shipping_fee, total)`.
pub fn validate_and_calculate(
    input: &CreateOrderInput,
) -> Result<(Vec<OrderItemInput>, i64, i64, i64), AppError> {
    if input.items.is_empty() {
        return Err(AppError::BadRequest(
            "Order must contain at least one item".into(),
        ));
    }

    if input.customer_name.trim().is_empty() {
        return Err(AppError::BadRequest("Customer name is required".into()));
    }

    if input.customer_email.trim().is_empty() || !input.customer_email.contains('@') {
        return Err(AppError::BadRequest(
            "Valid customer email is required".into(),
        ));
    }

    if input.customer_phone.trim().is_empty() {
        return Err(AppError::BadRequest("Customer phone is required".into()));
    }

    if input.address.trim().is_empty() {
        return Err(AppError::BadRequest("Delivery address is required".into()));
    }

    if !["cod", "bank_transfer", "wallet"].contains(&input.payment_method.as_str()) {
        return Err(AppError::BadRequest("Invalid payment method".into()));
    }

    // Validate quantities
    for item in &input.items {
        if item.quantity <= 0 {
            return Err(AppError::BadRequest(format!(
                "Invalid quantity {} for product {}",
                item.quantity, item.product_name
            )));
        }
        if item.unit_price <= 0 {
            return Err(AppError::BadRequest(format!(
                "Invalid price for product {}",
                item.product_name
            )));
        }
    }

    let subtotal: i64 = input
        .items
        .iter()
        .map(|i| i.unit_price * i.quantity as i64)
        .sum();

    let shipping_fee: i64 = 30_000; // flat 30,000 VND
    let total = subtotal + shipping_fee;

    Ok((input.items.clone(), subtotal, shipping_fee, total))
}

/// Generate a unique order code like "HS-20260304-A1B2".
pub fn generate_order_code() -> String {
    let date = Utc::now().format("%Y%m%d").to_string();
    let suffix: String = thread_rng()
        .sample_iter(&Alphanumeric)
        .take(6)
        .map(char::from)
        .collect::<String>()
        .to_uppercase();
    format!("HS-{date}-{suffix}")
}

pub async fn create_order_for_user(
    state: &AppState,
    user_id: Uuid,
    input: &CreateOrderInput,
) -> Result<OrderPublic, AppError> {
    let (items, subtotal, shipping_fee, mut total) = validate_and_calculate(input)?;

    let mut coupon_code: Option<String> = None;
    let mut coupon_type: Option<String> = None;
    let mut coupon_value: Option<i64> = None;
    let mut discount_amt: i64 = 0;

    if let Some(raw_code) = input.coupon_code.as_deref() {
        let code = raw_code.trim();
        if !code.is_empty() {
            let validated = coupon_service::validate_coupon_for_order(state, code, subtotal).await?;
            coupon_code = Some(validated.code);
            coupon_type = Some(validated.coupon_type);
            coupon_value = Some(validated.value);
            discount_amt = validated.discount_amt.max(0);
        }
    }

    if discount_amt > 0 {
        total = (total - discount_amt).max(0);
    }

    let order_code = generate_order_code();

    let (order, order_items) = order_repo::create_order(
        &state.db,
        Some(user_id),
        &order_code,
        &input.customer_name,
        &input.customer_email,
        &input.customer_phone,
        &input.address,
        input.note.as_deref(),
        &input.payment_method,
        subtotal,
        shipping_fee,
        coupon_code.as_deref(),
        coupon_type.as_deref(),
        coupon_value,
        discount_amt,
        total,
        &items,
    )
    .await?;

    let _ = crate::services::cart_service::clear_cart(state, user_id).await;

    if let Some(ref code) = coupon_code {
        let _ = coupon_service::increment_used(state, code).await;
    }

    if let Some(mailer) = state.mailer.clone() {
        let config = state.config.clone();
        let order_clone = order.clone();
        let items_clone = order_items.clone();
        tokio::spawn(async move {
            if let Err(e) =
                email_service::send_order_confirmation(&config, &mailer, &order_clone, &items_clone)
                    .await
            {
                tracing::error!("Failed to send order confirmation email: {e}");
            }
        });
    }

    Ok(OrderPublic {
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
        coupon_code: order.coupon_code,
        coupon_type: order.coupon_type,
        coupon_value: order.coupon_value,
        discount_amt: order.discount_amt,
        total: order.total,
        items: order_items,
        created_at: order.created_at,
    })
}

pub async fn get_user_order(
    state: &AppState,
    user_id: Uuid,
    order_id: Uuid,
) -> Result<OrderPublic, AppError> {
    let (order, items) = order_repo::find_by_id(&state.db, order_id)
        .await?
        .ok_or_else(|| AppError::NotFound("Order not found".into()))?;

    if order.user_id != Some(user_id) {
        return Err(AppError::Unauthorized("Access denied".into()));
    }

    Ok(OrderPublic {
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
        coupon_code: order.coupon_code,
        coupon_type: order.coupon_type,
        coupon_value: order.coupon_value,
        discount_amt: order.discount_amt,
        total: order.total,
        items,
        created_at: order.created_at,
    })
}

pub async fn list_user_orders(state: &AppState, user_id: Uuid) -> Result<Vec<OrderListItem>, AppError> {
    order_repo::find_by_user(&state.db, user_id).await
}

pub async fn list_admin_orders(
    state: &AppState,
    query: &AdminOrderQuery,
) -> Result<serde_json::Value, AppError> {
    let (items, total) = order_repo::find_all_admin(&state.db, query).await?;
    let total_pages = (total + query.limit - 1) / query.limit;
    Ok(serde_json::json!({
        "items":       items,
        "total":       total,
        "page":        query.page,
        "limit":       query.limit,
        "total_pages": total_pages,
    }))
}

pub async fn get_admin_order(state: &AppState, id: Uuid) -> Result<serde_json::Value, AppError> {
    let (order, items) = order_repo::find_by_id(&state.db, id)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Order {id} not found")))?;
    Ok(serde_json::json!({ "order": order, "items": items }))
}

pub async fn update_admin_order_status(
    state: &AppState,
    id: Uuid,
    input: &UpdateOrderStatusInput,
) -> Result<serde_json::Value, AppError> {
    let valid = ["pending", "confirmed", "shipping", "delivered", "cancelled"];
    if !valid.contains(&input.status.as_str()) {
        return Err(AppError::BadRequest(format!(
            "Invalid status '{}'. Must be one of: {}",
            input.status,
            valid.join(", ")
        )));
    }

    let (current_order, _) = order_repo::find_by_id(&state.db, id)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Order {id} not found")))?;

    if input.status == "cancelled" && current_order.status != "cancelled" {
        order_repo::restore_stock_for_order(&state.db, id).await?;
    }

    let order = order_repo::update_order_status(&state.db, id, &input.status).await?;

    if let Some(mailer) = state.mailer.clone() {
        let config = state.config.clone();
        let order_c = order.clone();
        let status = input.status.clone();
        let note = input.note.clone();
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

    Ok(serde_json::json!(order))
}
