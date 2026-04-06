use std::path::PathBuf;

use tokio::fs;
use uuid::Uuid;

use crate::error::AppError;

fn extension_for_content_type(content_type: &str, fallback: &str) -> String {
    match content_type {
        "image/png" => "png".to_string(),
        "image/webp" => "webp".to_string(),
        "image/gif" => "gif".to_string(),
        "video/webm" => "webm".to_string(),
        "video/quicktime" => "mov".to_string(),
        "video/x-m4v" => "m4v".to_string(),
        "video/ogg" => "ogv".to_string(),
        _ => fallback.to_string(),
    }
}

pub async fn store_image(data: &[u8], content_type: &str) -> Result<String, AppError> {
    store_file(data, content_type, "images", "jpg").await
}

pub async fn store_video(data: &[u8], content_type: &str) -> Result<String, AppError> {
    store_file(data, content_type, "videos", "mp4").await
}

async fn store_file(
    data: &[u8],
    content_type: &str,
    folder: &str,
    fallback_extension: &str,
) -> Result<String, AppError> {
    let extension = extension_for_content_type(content_type, fallback_extension);
    let directory = PathBuf::from("uploads").join(folder);

    fs::create_dir_all(&directory).await.map_err(|error| {
        AppError::Internal(format!("Failed to create upload directory: {error}"))
    })?;

    let filename = format!("{}.{}", Uuid::new_v4(), extension);
    let path = directory.join(&filename);

    fs::write(&path, data)
        .await
        .map_err(|error| AppError::Internal(format!("Failed to persist upload: {error}")))?;

    Ok(format!("/uploads/{folder}/{filename}"))
}
