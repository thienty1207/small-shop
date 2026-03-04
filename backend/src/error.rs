use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use thiserror::Error;

/// Central error type for the entire application.
/// All handler functions return `Result<_, AppError>`.
#[derive(Debug, Error)]
pub enum AppError {
    #[error("Unauthorized: {0}")]
    Unauthorized(String),

    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Bad request: {0}")]
    BadRequest(String),

    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("HTTP client error: {0}")]
    HttpClient(#[from] reqwest::Error),

    #[error("Internal server error: {0}")]
    Internal(String),

    #[error("Email error: {0}")]
    Email(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match &self {
            AppError::Unauthorized(msg) => (StatusCode::UNAUTHORIZED, msg.clone()),
            AppError::NotFound(msg)     => (StatusCode::NOT_FOUND, msg.clone()),
            AppError::BadRequest(msg)   => (StatusCode::BAD_REQUEST, msg.clone()),
            AppError::Database(e)       => {
                tracing::error!("Database error: {e}");
                (StatusCode::INTERNAL_SERVER_ERROR, "Database error".into())
            }
            AppError::HttpClient(e) => {
                tracing::error!("HTTP client error: {e}");
                (StatusCode::BAD_GATEWAY, "Upstream service error".into())
            }
            AppError::Internal(msg) => {
                tracing::error!("Internal error: {msg}");
                (StatusCode::INTERNAL_SERVER_ERROR, "Internal server error".into())
            }
            AppError::Email(msg) => {
                tracing::error!("Email error: {msg}");
                (StatusCode::INTERNAL_SERVER_ERROR, "Failed to send email".into())
            }
        };

        (status, Json(json!({ "error": message }))).into_response()
    }
}
