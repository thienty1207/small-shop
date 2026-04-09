use axum::{extract::State, Extension, Json};

use crate::{
    error::AppError,
    models::admin::{AdminPermissionsResponse, AdminPublic, UpdateAdminPermissionsInput},
    services::permissions_service,
    state::AppState,
};

/// GET /api/admin/permissions
pub async fn get_permissions(
    State(state): State<AppState>,
    Extension(admin): Extension<AdminPublic>,
) -> Result<Json<AdminPermissionsResponse>, AppError> {
    permissions_service::require_permission(&state, &admin, "permissions.edit").await?;
    let groups = permissions_service::get_permissions_matrix(&state).await?;

    Ok(Json(AdminPermissionsResponse { groups }))
}

/// PATCH /api/admin/permissions
pub async fn update_permissions(
    State(state): State<AppState>,
    Extension(admin): Extension<AdminPublic>,
    Json(input): Json<UpdateAdminPermissionsInput>,
) -> Result<Json<AdminPermissionsResponse>, AppError> {
    permissions_service::require_permission(&state, &admin, "permissions.edit").await?;

    if input.groups.is_empty() {
        return Err(AppError::BadRequest(
            "Danh sách phân quyền không được để trống".into(),
        ));
    }
    permissions_service::save_permissions_matrix(&state, &input.groups).await?;

    Ok(Json(AdminPermissionsResponse {
        groups: input.groups,
    }))
}
