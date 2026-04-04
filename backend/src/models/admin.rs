use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ---------------------------------------------------------------------------
// Database model — mirrors the `admin_users` table exactly
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, sqlx::FromRow)]
/// Internal admin entity mapped directly from the `admin_users` table.
pub struct AdminUser {
    pub id: Uuid,
    pub username: String,
    pub password_hash: String,
    pub full_name: String,
    pub role: String, // "super_admin" | "manager" | "staff"
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
}

// ---------------------------------------------------------------------------
// Public-safe representation (no password_hash)
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize)]
/// API-safe admin representation (without `password_hash`).
pub struct AdminPublic {
    pub id: Uuid,
    pub username: String,
    pub full_name: String,
    pub role: String,
}

impl From<AdminUser> for AdminPublic {
    fn from(u: AdminUser) -> Self {
        Self {
            id: u.id,
            username: u.username,
            full_name: u.full_name,
            role: u.role,
        }
    }
}

// ---------------------------------------------------------------------------
// Request / response DTOs
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
/// Admin login payload from client.
pub struct AdminLoginInput {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
/// Admin login response containing JWT token and public user data.
pub struct AdminLoginResponse {
    pub token: String,
    pub user: AdminPublic,
}

// ---------------------------------------------------------------------------
// Staff management (B7)
// ---------------------------------------------------------------------------

/// Lightweight staff row for listing (no password hash)
#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct StaffListItem {
    pub id: Uuid,
    pub username: String,
    pub full_name: String,
    pub role: String,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
}

/// Customer row for admin customer list.
#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
pub struct CustomerListItem {
    pub id: Uuid,
    pub google_id: String,
    pub email: String,
    pub name: String,
    pub avatar_url: Option<String>,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub last_login_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub orders_count: i64,
    pub total_spent: i64,
}

/// Paginated admin customer list response.
#[derive(Debug, Serialize)]
pub struct PaginatedCustomerList {
    pub items: Vec<CustomerListItem>,
    pub total: i64,
    pub page: i64,
    pub limit: i64,
    pub total_pages: i64,
}

/// A single permission row in the admin permission matrix.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AdminPermissionItem {
    pub key: String,
    pub label: String,
    pub super_admin: bool,
    pub manager: bool,
    pub staff: bool,
}

/// A grouped set of permission rows.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AdminPermissionGroup {
    pub key: String,
    pub group: String,
    pub items: Vec<AdminPermissionItem>,
}

/// Response for GET /api/admin/permissions.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AdminPermissionsResponse {
    pub groups: Vec<AdminPermissionGroup>,
}

/// Payload for PATCH /api/admin/permissions.
#[derive(Debug, Clone, Deserialize)]
pub struct UpdateAdminPermissionsInput {
    pub groups: Vec<AdminPermissionGroup>,
}

/// Create a new staff member
#[derive(Debug, Deserialize)]
pub struct CreateStaffInput {
    pub username: String,
    pub full_name: String,
    pub password: String,
    pub role: String, // "manager" | "staff"
}

/// Update an existing staff member
#[derive(Debug, Deserialize)]
pub struct UpdateStaffInput {
    pub full_name: String,
    pub role: String,
    pub is_active: bool,
    /// If present and non-empty, reset password
    pub password: Option<String>,
}

// ---------------------------------------------------------------------------
// Dashboard aggregates (B4)
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize)]
/// Aggregated KPI fields for admin dashboard.
pub struct DashboardStats {
    pub revenue_today: i64,
    pub revenue_this_month: i64,
    pub orders_total: i64,
    pub orders_pending: i64,
    pub orders_confirmed: i64,
    pub orders_shipping: i64,
    pub orders_delivered: i64,
    pub orders_cancelled: i64,
    pub customers_total: i64,
    pub new_customers_this_month: i64,
    pub products_total: i64,
    pub products_out_of_stock: i64,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
/// A monthly revenue data point for charts.
pub struct RevenuePoint {
    pub month: String,
    pub revenue: i64,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
/// Monthly revenue point for year/month picker.
pub struct MonthlyRevenuePoint {
    pub year: i32,
    pub month: i32,
    pub revenue: Option<i64>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
/// Top-selling product row for dashboard view.
pub struct TopProduct {
    pub id: Uuid,
    pub name: String,
    pub image_url: String,
    pub units_sold: i64,
    pub revenue: i64,
}
