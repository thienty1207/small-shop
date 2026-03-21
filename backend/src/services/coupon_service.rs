use uuid::Uuid;

use crate::{
    error::AppError,
    models::coupon::{CouponValidated, CreateCouponInput, UpdateCouponInput, ValidateCouponInput},
    repositories::coupon_repo,
    state::AppState,
};

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

pub async fn validate_coupon(
    state: &AppState,
    input: &ValidateCouponInput,
) -> Result<serde_json::Value, AppError> {
    let validated = coupon_repo::validate(&state.db, input).await?;
    Ok(serde_json::json!(validated))
}

pub async fn list_coupons(state: &AppState) -> Result<serde_json::Value, AppError> {
    let coupons = coupon_repo::find_all(&state.db).await?;
    Ok(serde_json::json!(coupons))
}

pub async fn create_coupon(
    state: &AppState,
    input: &CreateCouponInput,
) -> Result<serde_json::Value, AppError> {
    let coupon = coupon_repo::create(&state.db, input).await?;
    Ok(serde_json::json!(coupon))
}

pub async fn update_coupon(
    state: &AppState,
    id: Uuid,
    input: &UpdateCouponInput,
) -> Result<serde_json::Value, AppError> {
    let coupon = coupon_repo::update(&state.db, id, input).await?;
    Ok(serde_json::json!(coupon))
}

pub async fn delete_coupon(state: &AppState, id: Uuid) -> Result<(), AppError> {
    coupon_repo::delete(&state.db, id).await
}

pub async fn increment_used(state: &AppState, code: &str) -> Result<(), AppError> {
    coupon_repo::increment_used(&state.db, code).await
}
