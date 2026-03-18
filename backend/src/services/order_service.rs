use chrono::Utc;
use rand::distributions::Alphanumeric;
use rand::{thread_rng, Rng};

use crate::{
    error::AppError,
    models::order::{CreateOrderInput, OrderItemInput},
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
