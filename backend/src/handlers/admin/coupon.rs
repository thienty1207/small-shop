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
    repositories::coupon_repo,
    state::AppState,
};

/// POST /api/coupons/validate  — public endpoint used at checkout
pub async fn validate_coupon(
    State(state): State<AppState>,
    Json(input): Json<ValidateCouponInput>,
) -> Result<Json<serde_json::Value>, AppError> {
    let validated = coupon_repo::validate(&state.db, &input).await?;
    Ok(Json(serde_json::json!(validated)))
}

/// GET /api/admin/coupons
pub async fn list_coupons(
    State(state): State<AppState>,
    Extension(_admin): Extension<AdminPublic>,
) -> Result<Json<serde_json::Value>, AppError> {
    let coupons = coupon_repo::find_all(&state.db).await?;
    Ok(Json(serde_json::json!(coupons)))
}

/// POST /api/admin/coupons
pub async fn create_coupon(
    State(state): State<AppState>,
    Extension(_admin): Extension<AdminPublic>,
    Json(input): Json<CreateCouponInput>,
) -> Result<Json<serde_json::Value>, AppError> {
    let coupon = coupon_repo::create(&state.db, &input).await?;
    Ok(Json(serde_json::json!(coupon)))
}

/// PUT /api/admin/coupons/:id
pub async fn update_coupon(
    State(state): State<AppState>,
    Extension(_admin): Extension<AdminPublic>,
    Path(id): Path<Uuid>,
    Json(input): Json<UpdateCouponInput>,
) -> Result<Json<serde_json::Value>, AppError> {
    let coupon = coupon_repo::update(&state.db, id, &input).await?;
    Ok(Json(serde_json::json!(coupon)))
}

/// DELETE /api/admin/coupons/:id
pub async fn delete_coupon(
    State(state): State<AppState>,
    Extension(_admin): Extension<AdminPublic>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    coupon_repo::delete(&state.db, id).await?;
    Ok(Json(serde_json::json!({ "ok": true })))
}
