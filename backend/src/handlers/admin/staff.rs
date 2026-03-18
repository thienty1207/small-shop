use axum::{
    extract::{Path, State},
    Extension, Json,
};
use uuid::Uuid;

use crate::{
    error::AppError,
    models::admin::{AdminPublic, CreateStaffInput, StaffListItem, UpdateStaffInput},
    repositories::admin_repo,
    services::admin_auth_service,
    state::AppState,
};

/// Require the calling admin to be a super_admin; otherwise return 403.
fn require_super_admin(admin: &AdminPublic) -> Result<(), AppError> {
    if admin.role != "super_admin" {
        return Err(AppError::Forbidden(
            "Chỉ super_admin mới có quyền quản lý nhân viên".into(),
        ));
    }
    Ok(())
}

/// GET /api/admin/staff — list all staff members
pub async fn list_staff(
    State(state): State<AppState>,
    Extension(admin): Extension<AdminPublic>,
) -> Result<Json<Vec<StaffListItem>>, AppError> {
    require_super_admin(&admin)?;
    let staff = admin_repo::list_staff(&state.db).await?;
    Ok(Json(staff))
}

/// POST /api/admin/staff — create a new staff member
pub async fn create_staff(
    State(state): State<AppState>,
    Extension(admin): Extension<AdminPublic>,
    Json(input): Json<CreateStaffInput>,
) -> Result<Json<StaffListItem>, AppError> {
    require_super_admin(&admin)?;

    // Validate role — only manager/staff can be created via this endpoint
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
    let staff = admin_repo::create_staff(
        &state.db,
        &input.username,
        &hash,
        &input.full_name,
        &input.role,
    )
    .await?;

    Ok(Json(staff))
}

/// PUT /api/admin/staff/:id — update staff member
pub async fn update_staff(
    State(state): State<AppState>,
    Extension(admin): Extension<AdminPublic>,
    Path(id): Path<Uuid>,
    Json(input): Json<UpdateStaffInput>,
) -> Result<Json<StaffListItem>, AppError> {
    require_super_admin(&admin)?;

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

    let staff = admin_repo::update_staff(
        &state.db,
        id,
        &input.full_name,
        &input.role,
        input.is_active,
        password_hash.as_deref(),
    )
    .await?;

    Ok(Json(staff))
}

/// DELETE /api/admin/staff/:id — delete a staff member
pub async fn delete_staff(
    State(state): State<AppState>,
    Extension(admin): Extension<AdminPublic>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    require_super_admin(&admin)?;

    // Prevent self-deletion
    if id == admin.id {
        return Err(AppError::BadRequest(
            "Không thể tự xoá tài khoản của mình".into(),
        ));
    }

    admin_repo::delete_staff(&state.db, id).await?;
    Ok(Json(serde_json::json!({ "message": "Đã xoá nhân viên" })))
}
