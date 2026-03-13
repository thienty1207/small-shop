use axum::{
    extract::{Query, State},
    http::header,
    response::Response,
    Extension,
};
use axum::body::Body;
use std::collections::HashMap;

use crate::{
    error::AppError,
    models::admin::AdminPublic,
    state::AppState,
};

fn csv_response(filename: &str, body: String) -> Response<Body> {
    Response::builder()
        .header(header::CONTENT_TYPE, "text/csv; charset=utf-8")
        .header(
            header::CONTENT_DISPOSITION,
            format!("attachment; filename=\"{}\"", filename),
        )
        .body(Body::from(body))
        .unwrap()
}

/// GET /api/admin/orders/export?from=&to=&status=
pub async fn export_orders(
    State(state): State<AppState>,
    Extension(_admin): Extension<AdminPublic>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Response<Body>, AppError> {
    let status_filter = params.get("status").cloned();
    let from_filter   = params.get("from").cloned();
    let to_filter     = params.get("to").cloned();

    let rows = sqlx::query!(
        r#"
        SELECT o.order_code, o.customer_name, o.customer_email, o.customer_phone,
               o.address, o.payment_method, o.status, o.subtotal, o.shipping_fee,
               o.total, o.created_at
        FROM orders o
        WHERE ($1::TEXT IS NULL OR o.status = $1)
          AND ($2::TIMESTAMPTZ IS NULL OR o.created_at >= $2::TIMESTAMPTZ)
          AND ($3::TIMESTAMPTZ IS NULL OR o.created_at <= $3::TIMESTAMPTZ)
        ORDER BY o.created_at DESC
        "#,
        status_filter.as_deref(),
        from_filter.as_deref().and_then(|s| s.parse::<chrono::DateTime<chrono::Utc>>().ok()),
        to_filter.as_deref().and_then(|s| s.parse::<chrono::DateTime<chrono::Utc>>().ok()),
    )
    .fetch_all(&state.db)
    .await?;

    let mut csv = String::from(
        "Mã đơn,Khách hàng,Email,SĐT,Địa chỉ,Thanh toán,Trạng thái,Tiền hàng,Phí ship,Tổng cộng,Ngày đặt\n",
    );
    for r in rows {
        csv.push_str(&format!(
            "{},{},{},{},{},{},{},{},{},{},{}\n",
            r.order_code,
            r.customer_name,
            r.customer_email,
            r.customer_phone,
            r.address.replace(',', ";"),
            r.payment_method,
            r.status,
            r.subtotal,
            r.shipping_fee,
            r.total,
            r.created_at.format("%Y-%m-%d %H:%M"),
        ));
    }

    Ok(csv_response("orders.csv", csv))
}

/// GET /api/admin/products/export
pub async fn export_products(
    State(state): State<AppState>,
    Extension(_admin): Extension<AdminPublic>,
) -> Result<Response<Body>, AppError> {
    let rows = sqlx::query!(
        r#"
        SELECT p.name, p.slug, COALESCE(c.name, '') AS "category!", p.price, p.original_price,
               p.stock, p.badge, p.brand, p.rating::FLOAT8 AS "rating!", p.review_count, p.in_stock,
               p.created_at
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        ORDER BY p.created_at DESC
        "#,
    )
    .fetch_all(&state.db)
    .await?;

    let mut csv = String::from(
        "Tên sản phẩm,Slug,Danh mục,Giá,Giá gốc,Tồn kho,Badge,Thương hiệu,Đánh giá,Số review,Còn hàng,Ngày tạo\n",
    );
    for r in rows {
        csv.push_str(&format!(
            "{},{},{},{},{},{},{},{},{},{},{},{}\n",
            r.name.replace(',', ";"),
            r.slug,
            r.category,
            r.price,
            r.original_price.unwrap_or(0),
            r.stock,
            r.badge.unwrap_or_default(),
            r.brand.unwrap_or_default(),
            r.rating,
            r.review_count,
            if r.in_stock { "Có" } else { "Hết" },
            r.created_at.format("%Y-%m-%d"),
        ));
    }

    Ok(csv_response("products.csv", csv))
}
