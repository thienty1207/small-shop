use uuid::Uuid;

use crate::{
    error::AppError,
    models::coupon::{CouponValidated, CreateCouponInput, UpdateCouponInput, ValidateCouponInput},
    repositories::coupon_repo,
    state::AppState,
};

/// Validate a coupon for checkout flow.
///
/// Accepts `code` + `order_total` for reuse from `order_service`.
pub async fn validate_coupon_for_order(
    state: &AppState,
    code: &str,
    order_total: i64,
) -> Result<CouponValidated, AppError> {
    let input = ValidateCouponInput {
        code: code.to_string(),
        order_total,
    };
    coupon_repo::validate(&state.db, &input).await
}

/// Validate a coupon and return JSON for client/public endpoints.
pub async fn validate_coupon(
    state: &AppState,
    input: &ValidateCouponInput,
) -> Result<serde_json::Value, AppError> {
    let validated = coupon_repo::validate(&state.db, input).await?;
    Ok(serde_json::json!(validated))
}

/// Get the full coupon list for the admin page.
pub async fn list_coupons(state: &AppState) -> Result<serde_json::Value, AppError> {
    let coupons = coupon_repo::find_all(&state.db).await?;
    Ok(serde_json::json!(coupons))
}

/// Create a new coupon from admin input.
pub async fn create_coupon(
    state: &AppState,
    input: &CreateCouponInput,
) -> Result<serde_json::Value, AppError> {
    let coupon = coupon_repo::create(&state.db, input).await?;
    Ok(serde_json::json!(coupon))
}

/// Update an existing coupon by `id`.
pub async fn update_coupon(
    state: &AppState,
    id: Uuid,
    input: &UpdateCouponInput,
) -> Result<serde_json::Value, AppError> {
    let coupon = coupon_repo::update(&state.db, id, input).await?;
    Ok(serde_json::json!(coupon))
}

/// Delete a coupon by `id`.
pub async fn delete_coupon(state: &AppState, id: Uuid) -> Result<(), AppError> {
    coupon_repo::delete(&state.db, id).await
}

/// Increment coupon usage count after a successful apply.
pub async fn increment_used(state: &AppState, code: &str) -> Result<(), AppError> {
    coupon_repo::increment_used(&state.db, code).await
}
