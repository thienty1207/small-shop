use std::collections::HashMap;

use crate::{
    error::AppError,
    models::admin::{AdminPermissionGroup, AdminPermissionItem, AdminPublic},
    repositories::settings_repo,
    state::AppState,
};

pub const PERMISSIONS_SETTINGS_KEY: &str = "admin.permissions.matrix";

pub fn default_permissions() -> Vec<AdminPermissionGroup> {
    vec![
        AdminPermissionGroup {
            key: "dashboard".into(),
            group: "Dashboard".into(),
            items: vec![AdminPermissionItem {
                key: "dashboard.view".into(),
                label: "Xem dashboard".into(),
                super_admin: true,
                manager: true,
                staff: true,
            }],
        },
        AdminPermissionGroup {
            key: "products".into(),
            group: "Sản phẩm".into(),
            items: vec![
                AdminPermissionItem {
                    key: "products.view".into(),
                    label: "Xem danh sách sản phẩm".into(),
                    super_admin: true,
                    manager: true,
                    staff: true,
                },
                AdminPermissionItem {
                    key: "products.edit".into(),
                    label: "Thêm / sửa sản phẩm".into(),
                    super_admin: true,
                    manager: true,
                    staff: false,
                },
                AdminPermissionItem {
                    key: "products.delete".into(),
                    label: "Xoá sản phẩm".into(),
                    super_admin: true,
                    manager: false,
                    staff: false,
                },
            ],
        },
        AdminPermissionGroup {
            key: "categories".into(),
            group: "Danh mục".into(),
            items: vec![
                AdminPermissionItem {
                    key: "categories.view".into(),
                    label: "Xem danh mục".into(),
                    super_admin: true,
                    manager: true,
                    staff: true,
                },
                AdminPermissionItem {
                    key: "categories.edit".into(),
                    label: "Thêm / sửa danh mục".into(),
                    super_admin: true,
                    manager: true,
                    staff: false,
                },
                AdminPermissionItem {
                    key: "categories.delete".into(),
                    label: "Xoá danh mục".into(),
                    super_admin: true,
                    manager: false,
                    staff: false,
                },
            ],
        },
        AdminPermissionGroup {
            key: "orders".into(),
            group: "Đơn hàng".into(),
            items: vec![
                AdminPermissionItem {
                    key: "orders.view".into(),
                    label: "Xem danh sách đơn hàng".into(),
                    super_admin: true,
                    manager: true,
                    staff: true,
                },
                AdminPermissionItem {
                    key: "orders.update_status".into(),
                    label: "Cập nhật trạng thái đơn".into(),
                    super_admin: true,
                    manager: true,
                    staff: true,
                },
                AdminPermissionItem {
                    key: "orders.delete".into(),
                    label: "Huỷ / xoá đơn hàng".into(),
                    super_admin: true,
                    manager: false,
                    staff: false,
                },
            ],
        },
        AdminPermissionGroup {
            key: "customers".into(),
            group: "Khách hàng".into(),
            items: vec![
                AdminPermissionItem {
                    key: "customers.view".into(),
                    label: "Xem danh sách khách hàng".into(),
                    super_admin: true,
                    manager: true,
                    staff: false,
                },
                AdminPermissionItem {
                    key: "customers.export".into(),
                    label: "Xuất dữ liệu khách hàng".into(),
                    super_admin: true,
                    manager: false,
                    staff: false,
                },
            ],
        },
        AdminPermissionGroup {
            key: "staff".into(),
            group: "Nhân viên".into(),
            items: vec![
                AdminPermissionItem {
                    key: "staff.view".into(),
                    label: "Xem danh sách nhân viên".into(),
                    super_admin: true,
                    manager: true,
                    staff: false,
                },
                AdminPermissionItem {
                    key: "staff.edit".into(),
                    label: "Thêm / sửa nhân viên".into(),
                    super_admin: true,
                    manager: false,
                    staff: false,
                },
                AdminPermissionItem {
                    key: "staff.delete".into(),
                    label: "Xoá nhân viên".into(),
                    super_admin: true,
                    manager: false,
                    staff: false,
                },
            ],
        },
        AdminPermissionGroup {
            key: "coupons".into(),
            group: "Khuyến mãi".into(),
            items: vec![
                AdminPermissionItem {
                    key: "coupons.view".into(),
                    label: "Xem danh sách mã giảm giá".into(),
                    super_admin: true,
                    manager: true,
                    staff: false,
                },
                AdminPermissionItem {
                    key: "coupons.edit".into(),
                    label: "Thêm / sửa mã giảm giá".into(),
                    super_admin: true,
                    manager: true,
                    staff: false,
                },
                AdminPermissionItem {
                    key: "coupons.delete".into(),
                    label: "Xoá mã giảm giá".into(),
                    super_admin: true,
                    manager: false,
                    staff: false,
                },
            ],
        },
        AdminPermissionGroup {
            key: "reviews".into(),
            group: "Đánh giá".into(),
            items: vec![
                AdminPermissionItem {
                    key: "reviews.view".into(),
                    label: "Xem đánh giá".into(),
                    super_admin: true,
                    manager: true,
                    staff: true,
                },
                AdminPermissionItem {
                    key: "reviews.delete".into(),
                    label: "Xoá đánh giá".into(),
                    super_admin: true,
                    manager: true,
                    staff: false,
                },
            ],
        },
        AdminPermissionGroup {
            key: "exports".into(),
            group: "Xuất dữ liệu".into(),
            items: vec![
                AdminPermissionItem {
                    key: "exports.orders".into(),
                    label: "Xuất đơn hàng".into(),
                    super_admin: true,
                    manager: true,
                    staff: false,
                },
                AdminPermissionItem {
                    key: "exports.products".into(),
                    label: "Xuất sản phẩm".into(),
                    super_admin: true,
                    manager: true,
                    staff: false,
                },
            ],
        },
        AdminPermissionGroup {
            key: "notifications".into(),
            group: "Thông báo".into(),
            items: vec![AdminPermissionItem {
                key: "notifications.view".into(),
                label: "Xem thông báo realtime".into(),
                super_admin: true,
                manager: true,
                staff: true,
            }],
        },
        AdminPermissionGroup {
            key: "settings".into(),
            group: "Cài đặt".into(),
            items: vec![
                AdminPermissionItem {
                    key: "settings.view".into(),
                    label: "Xem cài đặt hệ thống".into(),
                    super_admin: true,
                    manager: false,
                    staff: false,
                },
                AdminPermissionItem {
                    key: "settings.edit".into(),
                    label: "Thay đổi cài đặt".into(),
                    super_admin: true,
                    manager: false,
                    staff: false,
                },
                AdminPermissionItem {
                    key: "permissions.edit".into(),
                    label: "Phân quyền".into(),
                    super_admin: true,
                    manager: false,
                    staff: false,
                },
            ],
        },
    ]
}

pub async fn get_permissions_matrix(state: &AppState) -> Result<Vec<AdminPermissionGroup>, AppError> {
    let settings = settings_repo::get_by_keys(&state.db, &[PERMISSIONS_SETTINGS_KEY]).await?;

    let groups = settings
        .get(PERMISSIONS_SETTINGS_KEY)
        .and_then(|raw| serde_json::from_str::<Vec<AdminPermissionGroup>>(raw).ok())
        .unwrap_or_else(default_permissions);

    Ok(groups)
}

pub async fn save_permissions_matrix(
    state: &AppState,
    groups: &[AdminPermissionGroup],
) -> Result<(), AppError> {
    let payload = serde_json::to_string(groups)
        .map_err(|e| AppError::Internal(format!("Serialize permissions failed: {e}")))?;

    let mut updates = HashMap::new();
    updates.insert(PERMISSIONS_SETTINGS_KEY.to_string(), payload);
    settings_repo::upsert_bulk(&state.db, &updates).await?;

    Ok(())
}

pub async fn require_permission(
    state: &AppState,
    admin: &AdminPublic,
    permission_key: &str,
) -> Result<(), AppError> {
    if admin.role == "super_admin" {
        return Ok(());
    }

    let groups = get_permissions_matrix(state).await?;

    let allowed = groups
        .iter()
        .flat_map(|group| group.items.iter())
        .find(|item| item.key == permission_key)
        .map(|item| match admin.role.as_str() {
            "manager" => item.manager,
            "staff" => item.staff,
            _ => false,
        })
        .unwrap_or(false);

    if allowed {
        Ok(())
    } else {
        tracing::warn!(
            admin_id = %admin.id,
            role = %admin.role,
            permission = %permission_key,
            "Admin permission denied"
        );
        Err(AppError::Forbidden(format!(
            "Bạn không có quyền thực hiện thao tác này ({permission_key})"
        )))
    }
}
