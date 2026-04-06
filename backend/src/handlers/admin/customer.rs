use axum::{
    extract::{Query, State},
    Extension, Json,
};
use serde::Deserialize;

use crate::{
    error::AppError,
    models::admin::{AdminPublic, PaginatedCustomerList},
    repositories::user_repo,
    services::permissions_service,
    state::AppState,
};

#[derive(Debug, Deserialize)]
pub struct CustomerListQuery {
    #[serde(default = "default_page")]
    page: i64,
    #[serde(default = "default_limit")]
    limit: i64,
    search: Option<String>,
}

fn default_page() -> i64 {
    1
}

fn default_limit() -> i64 {
    20
}

/// GET /api/admin/customers
///
/// Returns paginated customers with search on name/email/phone.
pub async fn list_customers(
    State(state): State<AppState>,
    Extension(admin): Extension<AdminPublic>,
    Query(query): Query<CustomerListQuery>,
) -> Result<Json<PaginatedCustomerList>, AppError> {
    permissions_service::require_permission(&state, &admin, "customers.view").await?;
    let page = query.page.max(1);
    let limit = query.limit.clamp(1, 100);

    let (items, total) =
        user_repo::find_customers_paginated(&state.db, query.search.as_deref(), page, limit)
            .await?;

    let total_pages = ((total + limit - 1) / limit).max(1);

    Ok(Json(PaginatedCustomerList {
        items,
        total,
        page,
        limit,
        total_pages,
    }))
}
