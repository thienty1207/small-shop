use axum::{
    extract::{Path, State},
    Extension, Json,
};
use uuid::Uuid;

use crate::{
    error::AppError,
    models::admin::{AdminPublic, CreateStaffInput, StaffListItem, UpdateStaffInput},
    services::{permissions_service, staff_service},
    state::AppState,
};

/// GET /api/admin/staff — list all staff members
pub async fn list_staff(
    State(state): State<AppState>,
    Extension(admin): Extension<AdminPublic>,
) -> Result<Json<Vec<StaffListItem>>, AppError> {
    permissions_service::require_permission(&state, &admin, "staff.view").await?;
    let staff = staff_service::list_staff(&state).await?;
    Ok(Json(staff))
}

/// POST /api/admin/staff — create a new staff member
pub async fn create_staff(
    State(state): State<AppState>,
    Extension(admin): Extension<AdminPublic>,
    Json(input): Json<CreateStaffInput>,
) -> Result<Json<StaffListItem>, AppError> {
    permissions_service::require_permission(&state, &admin, "staff.edit").await?;
    let staff = staff_service::create_staff(&state, &input).await?;

    Ok(Json(staff))
}

/// PUT /api/admin/staff/:id — update staff member
pub async fn update_staff(
    State(state): State<AppState>,
    Extension(admin): Extension<AdminPublic>,
    Path(id): Path<Uuid>,
    Json(input): Json<UpdateStaffInput>,
) -> Result<Json<StaffListItem>, AppError> {
    permissions_service::require_permission(&state, &admin, "staff.edit").await?;
    let staff = staff_service::update_staff(&state, id, &input).await?;

    Ok(Json(staff))
}

/// DELETE /api/admin/staff/:id — delete a staff member
pub async fn delete_staff(
    State(state): State<AppState>,
    Extension(admin): Extension<AdminPublic>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    permissions_service::require_permission(&state, &admin, "staff.delete").await?;

    // Prevent self-deletion
    if id == admin.id {
        return Err(AppError::BadRequest(
            "Không thể tự xoá tài khoản của mình".into(),
        ));
    }

    staff_service::delete_staff(&state, id).await?;
    Ok(Json(serde_json::json!({ "message": "Đã xoá nhân viên" })))
}
