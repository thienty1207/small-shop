use crate::{
    config::MediaBackend,
    error::AppError,
    services::{cloudinary, local_storage},
    state::AppState,
};

pub async fn upload_image(
    state: &AppState,
    data: Vec<u8>,
    content_type: &str,
) -> Result<String, AppError> {
    match state.config.upload_backend {
        MediaBackend::Cloudinary => {
            let cloudinary = state
                .cloudinary
                .as_ref()
                .ok_or_else(|| AppError::Internal("Cloudinary is not configured".into()))?;

            cloudinary::upload_image(
                cloudinary,
                &state.http_client,
                data,
                content_type,
                "shop/images",
            )
            .await
        }
        MediaBackend::Local => local_storage::store_image(&data, content_type).await,
    }
}

pub async fn upload_video(
    state: &AppState,
    data: Vec<u8>,
    content_type: &str,
) -> Result<String, AppError> {
    match state.config.upload_backend {
        MediaBackend::Cloudinary => {
            let cloudinary = state
                .cloudinary
                .as_ref()
                .ok_or_else(|| AppError::Internal("Cloudinary is not configured".into()))?;

            cloudinary::upload_video(
                cloudinary,
                &state.http_client,
                data,
                content_type,
                "shop/videos",
            )
            .await
        }
        MediaBackend::Local => local_storage::store_video(&data, content_type).await,
    }
}
