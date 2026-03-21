use uuid::Uuid;

use crate::{
    error::AppError,
    models::admin::{AdminPublic, CreateStaffInput, StaffListItem, UpdateStaffInput},
    repositories::admin_repo,
    services::admin_auth_service,
    state::AppState,
};

/// Ensure the current account has `super_admin` role before staff operations.
pub fn require_super_admin(admin: &AdminPublic) -> Result<(), AppError> {
    if admin.role != "super_admin" {
        return Err(AppError::Forbidden(
            "Chỉ super_admin mới có quyền quản lý nhân viên".into(),
        ));
    }
    Ok(())
}

/// List all admin/staff accounts.
pub async fn list_staff(state: &AppState) -> Result<Vec<StaffListItem>, AppError> {
    admin_repo::list_staff(&state.db).await
}

/// Create a new staff account after role/username/password validation.
pub async fn create_staff(
    state: &AppState,
    input: &CreateStaffInput,
) -> Result<StaffListItem, AppError> {
    if !["manager", "staff"].contains(&input.role.as_str()) {
        return Err(AppError::BadRequest(
            "Role phải là 'manager' hoặc 'staff'".into(),
        ));
    }

    if input.username.trim().is_empty() {
        return Err(AppError::BadRequest("Username không được trống".into()));
    }

    if input.password.len() < 6 {
        return Err(AppError::BadRequest(
            "Mật khẩu phải có ít nhất 6 ký tự".into(),
        ));
    }

    let hash = admin_auth_service::hash_password(&input.password)?;
    admin_repo::create_staff(
        &state.db,
        &input.username,
        &hash,
        &input.full_name,
        &input.role,
    )
    .await
}

/// Update staff profile and optionally reset password.
pub async fn update_staff(
    state: &AppState,
    id: Uuid,
    input: &UpdateStaffInput,
) -> Result<StaffListItem, AppError> {
    if !["super_admin", "manager", "staff"].contains(&input.role.as_str()) {
        return Err(AppError::BadRequest("Role không hợp lệ".into()));
    }

    let password_hash = match &input.password {
        Some(p) if !p.is_empty() => {
            if p.len() < 6 {
                return Err(AppError::BadRequest(
                    "Mật khẩu phải có ít nhất 6 ký tự".into(),
                ));
            }
            Some(admin_auth_service::hash_password(p)?)
        }
        _ => None,
    };

    admin_repo::update_staff(
        &state.db,
        id,
        &input.full_name,
        &input.role,
        input.is_active,
        password_hash.as_deref(),
    )
    .await
}

/// Delete a staff account by `id`.
pub async fn delete_staff(state: &AppState, id: Uuid) -> Result<(), AppError> {
    admin_repo::delete_staff(&state.db, id).await
}
