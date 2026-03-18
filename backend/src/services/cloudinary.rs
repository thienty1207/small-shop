use reqwest::multipart;
use serde::Deserialize;
use sha1::{Digest, Sha1};
use std::time::{SystemTime, UNIX_EPOCH};
use uuid::Uuid;

/// Parsed Cloudinary credentials from `CLOUDINARY_URL`.
///
/// URL format: `cloudinary://api_key:api_secret@cloud_name`
#[derive(Debug, Clone)]
pub struct CloudinaryConfig {
    pub cloud_name: String,
    pub api_key: String,
    pub api_secret: String,
}

impl CloudinaryConfig {
    /// Parse from `cloudinary://api_key:api_secret@cloud_name`.
    pub fn from_url(url: &str) -> Result<Self, String> {
        let rest = url.trim_start_matches("cloudinary://");
        let (creds, cloud_name) = rest
            .split_once('@')
            .ok_or("Invalid CLOUDINARY_URL: missing '@'")?;
        let (api_key, api_secret) = creds
            .split_once(':')
            .ok_or("Invalid CLOUDINARY_URL: missing ':' in credentials")?;
        Ok(Self {
            cloud_name: cloud_name.to_string(),
            api_key: api_key.to_string(),
            api_secret: api_secret.to_string(),
        })
    }
}

#[derive(Deserialize)]
struct UploadResponse {
    secure_url: String,
}

/// Upload raw image bytes to Cloudinary and return the `secure_url`.
///
/// `folder` — Cloudinary folder path, e.g. `"shop/products"`, `"shop/avatars"`.
pub async fn upload_image(
    config: &CloudinaryConfig,
    client: &reqwest::Client,
    data: Vec<u8>,
    content_type: &str,
    folder: &str,
) -> Result<String, crate::error::AppError> {
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();

    // Cloudinary signature: SHA1("folder={f}&timestamp={t}{api_secret}")
    // Parameters must be sorted alphabetically; api_key / file / resource_type excluded.
    let params_str = format!("folder={folder}&timestamp={timestamp}");
    let to_sign = format!("{params_str}{}", config.api_secret);

    let mut hasher = Sha1::new();
    hasher.update(to_sign.as_bytes());
    let digest = hasher.finalize();
    let signature: String = digest.iter().map(|b| format!("{b:02x}")).collect();

    let ext = match content_type {
        "image/png" => "png",
        "image/webp" => "webp",
        "image/gif" => "gif",
        _ => "jpg",
    };
    let filename = format!("{}.{}", Uuid::new_v4(), ext);

    let part = multipart::Part::bytes(data)
        .file_name(filename)
        .mime_str(content_type)
        .map_err(|e| crate::error::AppError::Internal(format!("MIME type error: {e}")))?;

    let form = multipart::Form::new()
        .part("file", part)
        .text("api_key", config.api_key.clone())
        .text("timestamp", timestamp.to_string())
        .text("folder", folder.to_string())
        .text("signature", signature);

    let url = format!(
        "https://api.cloudinary.com/v1_1/{}/image/upload",
        config.cloud_name
    );

    let resp = client
        .post(&url)
        .multipart(form)
        .send()
        .await
        .map_err(|e| crate::error::AppError::Internal(format!("Cloudinary request error: {e}")))?;

    if !resp.status().is_success() {
        let msg = resp.text().await.unwrap_or_default();
        return Err(crate::error::AppError::Internal(format!(
            "Cloudinary upload failed: {msg}"
        )));
    }

    let body: UploadResponse = resp
        .json()
        .await
        .map_err(|e| crate::error::AppError::Internal(format!("Cloudinary parse error: {e}")))?;

    Ok(body.secure_url)
}
