use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// =========================
// 1) DB MODELS (sqlx rows)
// =========================

/// Raw DB row for the `coupons` table.
#[derive(Debug, Clone, sqlx::FromRow, Serialize)]
pub struct Coupon {
    pub id: Uuid,
    pub code: String,
    #[serde(rename = "type")]
    pub coupon_type: String,
    pub value: i64,
    pub min_order: i64,
    pub max_uses: Option<i32>,
    pub used_count: i32,
    pub expires_at: Option<DateTime<Utc>>,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
}

// ========================
// 2) INPUT DTOs (request)
// ========================

/// Request body to create a coupon (admin).
#[derive(Debug, Deserialize)]
pub struct CreateCouponInput {
    pub code: String,
    #[serde(rename = "type")]
    pub coupon_type: String, // "percent" | "fixed"
    pub value: i64,
    pub min_order: Option<i64>,
    pub max_uses: Option<i32>,
    pub expires_at: Option<DateTime<Utc>>,
}

/// Request body to update a coupon (admin).
#[derive(Debug, Deserialize)]
pub struct UpdateCouponInput {
    pub coupon_type: Option<String>,
    pub value: Option<i64>,
    pub min_order: Option<i64>,
    pub max_uses: Option<i32>,
    pub expires_at: Option<DateTime<Utc>>,
    pub is_active: Option<bool>,
}

/// Request body: validate a coupon code at checkout.
#[derive(Debug, Deserialize)]
pub struct ValidateCouponInput {
    pub code: String,
    pub order_total: i64,
}

// =========================
// 3) OUTPUT DTOs (response)
// =========================

/// Response after validating a coupon.
#[derive(Debug, Serialize)]
pub struct CouponValidated {
    pub code: String,
    pub coupon_type: String,
    pub value: i64,
    pub discount_amt: i64, // computed discount amount in VND
}
