use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::AppError,
    models::coupon::{
        Coupon, CouponValidated, CreateCouponInput, UpdateCouponInput, ValidateCouponInput,
    },
};

/// Validate a coupon code against an order total.
/// Returns the validated coupon with computed discount amount.
pub async fn validate(
    pool: &PgPool,
    input: &ValidateCouponInput,
) -> Result<CouponValidated, AppError> {
    let coupon = sqlx::query_as::<_, Coupon>(
        r#"
        SELECT id, code, type AS coupon_type, value, min_order, max_uses,
               used_count, expires_at, is_active, created_at
        FROM coupons
        WHERE UPPER(code) = UPPER($1)
        "#,
    )
    .bind(&input.code)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Mã giảm giá không tồn tại".into()))?;

    if !coupon.is_active {
        return Err(AppError::BadRequest("Mã giảm giá đã hết hiệu lực".into()));
    }
    if let Some(exp) = coupon.expires_at {
        if exp < chrono::Utc::now() {
            return Err(AppError::BadRequest("Mã giảm giá đã hết hạn".into()));
        }
    }
    if let Some(max) = coupon.max_uses {
        if coupon.used_count >= max {
            return Err(AppError::BadRequest("Mã giảm giá đã được dùng hết".into()));
        }
    }
    if input.order_total < coupon.min_order {
        return Err(AppError::BadRequest(format!(
            "Đơn hàng tối thiểu {}đ để dùng mã này",
            coupon.min_order
        )));
    }

    let discount_amt = if coupon.coupon_type == "percent" {
        input.order_total * coupon.value / 100
    } else {
        coupon.value.min(input.order_total)
    };

    Ok(CouponValidated {
        code: coupon.code,
        coupon_type: coupon.coupon_type,
        value: coupon.value,
        discount_amt,
    })
}

/// Increment used_count when an order is placed with a coupon.
pub async fn increment_used(pool: &PgPool, code: &str) -> Result<(), AppError> {
    sqlx::query("UPDATE coupons SET used_count = used_count + 1 WHERE UPPER(code) = UPPER($1)")
        .bind(code)
        .execute(pool)
        .await?;
    Ok(())
}

/// Admin: list all coupons.
pub async fn find_all(pool: &PgPool) -> Result<Vec<Coupon>, AppError> {
    let rows = sqlx::query_as::<_, Coupon>(
        "SELECT id, code, type AS coupon_type, value, min_order, max_uses, used_count, expires_at, is_active, created_at FROM coupons ORDER BY created_at DESC",
    )
    .fetch_all(pool)
    .await?;
    Ok(rows)
}

/// Admin: create a coupon.
pub async fn create(pool: &PgPool, input: &CreateCouponInput) -> Result<Coupon, AppError> {
    if input.code.trim().is_empty() {
        return Err(AppError::BadRequest("Coupon code is required".into()));
    }
    let valid_types = ["percent", "fixed"];
    if !valid_types.contains(&input.coupon_type.as_str()) {
        return Err(AppError::BadRequest(
            "type must be 'percent' or 'fixed'".into(),
        ));
    }

    let row = sqlx::query_as::<_, Coupon>(
        r#"
        INSERT INTO coupons (code, type, value, min_order, max_uses, expires_at)
        VALUES (UPPER($1), $2, $3, $4, $5, $6)
        RETURNING id, code, type AS coupon_type, value, min_order, max_uses, used_count, expires_at, is_active, created_at
        "#,
    )
    .bind(input.code.trim())
    .bind(&input.coupon_type)
    .bind(input.value)
    .bind(input.min_order.unwrap_or(0))
    .bind(input.max_uses)
    .bind(input.expires_at)
    .fetch_one(pool)
    .await?;

    Ok(row)
}

/// Admin: update a coupon.
pub async fn update(
    pool: &PgPool,
    id: Uuid,
    input: &UpdateCouponInput,
) -> Result<Coupon, AppError> {
    let row = sqlx::query_as::<_, Coupon>(
        r#"
        UPDATE coupons SET
            type       = COALESCE($2, type),
            value      = COALESCE($3, value),
            min_order  = COALESCE($4, min_order),
            max_uses   = COALESCE($5, max_uses),
            expires_at = COALESCE($6, expires_at),
            is_active  = COALESCE($7, is_active)
        WHERE id = $1
        RETURNING id, code, type AS coupon_type, value, min_order, max_uses, used_count, expires_at, is_active, created_at
        "#,
    )
    .bind(id)
    .bind(&input.coupon_type)
    .bind(input.value)
    .bind(input.min_order)
    .bind(input.max_uses)
    .bind(input.expires_at)
    .bind(input.is_active)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Coupon {id} not found")))?;

    Ok(row)
}

/// Admin: delete a coupon.
pub async fn delete(pool: &PgPool, id: Uuid) -> Result<(), AppError> {
    let result = sqlx::query("DELETE FROM coupons WHERE id = $1")
        .bind(id)
        .execute(pool)
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound(format!("Coupon {id} not found")));
    }
    Ok(())
}
