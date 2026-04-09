use axum::{
    extract::{Path, State},
    Extension, Json,
};
use uuid::Uuid;

use crate::{
    error::AppError,
    models::{
        admin::AdminPublic,
        coupon::{CreateCouponInput, UpdateCouponInput, ValidateCouponInput},
    },
    services::{coupon_service, permissions_service},
    state::AppState,
};

/// POST /api/coupons/validate  — public endpoint used at checkout
pub async fn validate_coupon(
    State(state): State<AppState>,
    Json(input): Json<ValidateCouponInput>,
) -> Result<Json<serde_json::Value>, AppError> {
    let validated = coupon_service::validate_coupon(&state, &input).await?;
    Ok(Json(validated))
}

/// GET /api/admin/coupons
pub async fn list_coupons(
    State(state): State<AppState>,
    Extension(admin): Extension<AdminPublic>,
) -> Result<Json<serde_json::Value>, AppError> {
    permissions_service::require_permission(&state, &admin, "coupons.view").await?;
    let coupons = coupon_service::list_coupons(&state).await?;
    Ok(Json(coupons))
}

/// POST /api/admin/coupons
pub async fn create_coupon(
    State(state): State<AppState>,
    Extension(admin): Extension<AdminPublic>,
    Json(input): Json<CreateCouponInput>,
) -> Result<Json<serde_json::Value>, AppError> {
    permissions_service::require_permission(&state, &admin, "coupons.edit").await?;
    let coupon = coupon_service::create_coupon(&state, &input).await?;
    Ok(Json(coupon))
}

/// PUT /api/admin/coupons/:id
pub async fn update_coupon(
    State(state): State<AppState>,
    Extension(admin): Extension<AdminPublic>,
    Path(id): Path<Uuid>,
    Json(input): Json<UpdateCouponInput>,
) -> Result<Json<serde_json::Value>, AppError> {
    permissions_service::require_permission(&state, &admin, "coupons.edit").await?;
    let coupon = coupon_service::update_coupon(&state, id, &input).await?;
    Ok(Json(coupon))
}

/// DELETE /api/admin/coupons/:id
pub async fn delete_coupon(
    State(state): State<AppState>,
    Extension(admin): Extension<AdminPublic>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    permissions_service::require_permission(&state, &admin, "coupons.delete").await?;
    coupon_service::delete_coupon(&state, id).await?;
    Ok(Json(serde_json::json!({ "ok": true })))
}
