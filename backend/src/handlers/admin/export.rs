use axum::body::Body;
use axum::{
    extract::{Query, State},
    http::header,
    response::Response,
    Extension,
};
use std::collections::HashMap;

use crate::{
    error::AppError,
    models::admin::AdminPublic,
    services::export_service,
    state::AppState,
};

fn csv_response(filename: &str, body: String) -> Response<Body> {
    Response::builder()
        .header(header::CONTENT_TYPE, "text/csv; charset=utf-8")
        .header(
            header::CONTENT_DISPOSITION,
            format!("attachment; filename=\"{}\"", filename),
        )
        .body(Body::from(with_utf8_bom(body)))
        .unwrap()
}

fn with_utf8_bom(body: String) -> String {
    format!("\u{FEFF}{body}")
}

fn csv_escape(value: impl ToString) -> String {
    let s = value.to_string();
    if s.contains(',') || s.contains('"') || s.contains('\n') || s.contains('\r') {
        format!("\"{}\"", s.replace('"', "\"\""))
    } else {
        s
    }
}

/// Prefix with tab so spreadsheet apps keep it as text (avoid scientific notation / trimming).
fn as_text_cell(value: &str) -> String {
    format!("\t{value}")
}

fn excel_response(filename: &str, body: String) -> Response<Body> {
    Response::builder()
        .header(
            header::CONTENT_TYPE,
            "application/vnd.ms-excel; charset=utf-8",
        )
        .header(
            header::CONTENT_DISPOSITION,
            format!("attachment; filename=\"{}\"", filename),
        )
        .body(Body::from(with_utf8_bom(body)))
        .unwrap()
}

/// GET /api/admin/orders/export?from=&to=&status=
pub async fn export_orders(
    State(state): State<AppState>,
    Extension(_admin): Extension<AdminPublic>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Response<Body>, AppError> {
    let format = params
        .get("format")
        .map(|s| s.to_lowercase())
        .unwrap_or_else(|| "csv".into());
    let status_filter = params.get("status").cloned();
    let from_filter = params.get("from").cloned();
    let to_filter = params.get("to").cloned();

    let rows = export_service::fetch_orders(
        &state,
        status_filter.as_deref(),
        from_filter.as_deref(),
        to_filter.as_deref(),
    )
    .await?;

    match format.as_str() {
        "excel" | "xls" | "xlsx" => {
            let mut tsv = String::from(
                "Mã đơn\tKhách hàng\tEmail\tSĐT\tĐịa chỉ\tThanh toán\tTrạng thái\tTiền hàng\tPhí ship\tTổng cộng\tNgày đặt\n",
            );
            for r in rows {
                tsv.push_str(&format!(
                    "{}\t{}\t{}\t{}\t{}\t{}\t{}\t{}\t{}\t{}\t{}\n",
                    as_text_cell(&r.order_code),
                    r.customer_name,
                    r.customer_email,
                    as_text_cell(&r.customer_phone),
                    r.address.replace('\t', " ").replace('\n', " "),
                    r.payment_method,
                    r.status,
                    r.subtotal,
                    r.shipping_fee,
                    r.total,
                    r.created_at.format("%Y-%m-%d %H:%M"),
                ));
            }
            Ok(excel_response("orders.xls", tsv))
        }
        _ => {
            let mut csv = String::from(
                "Mã đơn,Khách hàng,Email,SĐT,Địa chỉ,Thanh toán,Trạng thái,Tiền hàng,Phí ship,Tổng cộng,Ngày đặt\n",
            );
            for r in rows {
                csv.push_str(&format!(
                    "{},{},{},{},{},{},{},{},{},{},{}\n",
                    csv_escape(as_text_cell(&r.order_code)),
                    csv_escape(r.customer_name),
                    csv_escape(r.customer_email),
                    csv_escape(as_text_cell(&r.customer_phone)),
                    csv_escape(r.address),
                    csv_escape(r.payment_method),
                    csv_escape(r.status),
                    csv_escape(r.subtotal),
                    csv_escape(r.shipping_fee),
                    csv_escape(r.total),
                    csv_escape(r.created_at.format("%Y-%m-%d %H:%M")),
                ));
            }
            Ok(csv_response("orders.csv", csv))
        }
    }
}

/// GET /api/admin/products/export?format=csv|excel&from=&to=
pub async fn export_products(
    State(state): State<AppState>,
    Extension(_admin): Extension<AdminPublic>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Response<Body>, AppError> {
    let format = params
        .get("format")
        .map(|s| s.to_lowercase())
        .unwrap_or_else(|| "csv".into());
    let from_filter = params.get("from").cloned();
    let to_filter = params.get("to").cloned();

    let rows = export_service::fetch_products(&state, from_filter.as_deref(), to_filter.as_deref()).await?;

    match format.as_str() {
        "excel" | "xls" | "xlsx" => {
            let mut tsv = String::from(
                "Tên sản phẩm\tSlug\tDanh mục\tGiá\tGiá gốc\tTồn kho\tBadge\tThương hiệu\tĐánh giá\tSố review\tCòn hàng\tNgày tạo\n",
            );
            for r in rows {
                tsv.push_str(&format!(
                    "{}\t{}\t{}\t{}\t{}\t{}\t{}\t{}\t{}\t{}\t{}\t{}\n",
                    r.name.replace('\t', " ").replace('\n', " "),
                    as_text_cell(&r.slug),
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
            Ok(excel_response("products.xls", tsv))
        }
        _ => {
            let mut csv = String::from(
                "Tên sản phẩm,Slug,Danh mục,Giá,Giá gốc,Tồn kho,Badge,Thương hiệu,Đánh giá,Số review,Còn hàng,Ngày tạo\n",
            );
            for r in rows {
                csv.push_str(&format!(
                    "{},{},{},{},{},{},{},{},{},{},{},{}\n",
                    csv_escape(r.name),
                    csv_escape(as_text_cell(&r.slug)),
                    csv_escape(r.category),
                    csv_escape(r.price),
                    csv_escape(r.original_price.unwrap_or(0)),
                    csv_escape(r.stock),
                    csv_escape(r.badge.unwrap_or_default()),
                    csv_escape(r.brand.unwrap_or_default()),
                    csv_escape(r.rating),
                    csv_escape(r.review_count),
                    csv_escape(if r.in_stock { "Có" } else { "Hết" }),
                    csv_escape(r.created_at.format("%Y-%m-%d")),
                ));
            }
            Ok(csv_response("products.csv", csv))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{as_text_cell, csv_escape, with_utf8_bom};

    #[test]
    fn adds_utf8_bom() {
        let s = with_utf8_bom("Tên".to_string());
        assert!(s.starts_with('\u{FEFF}'));
    }

    #[test]
    fn escapes_csv_quotes_and_commas() {
        let escaped = csv_escape("a,\"b\"");
        assert_eq!(escaped, "\"a,\"\"b\"\"\"");
    }

    #[test]
    fn text_cell_has_tab_prefix() {
        assert_eq!(as_text_cell("012345"), "\t012345");
    }
}
