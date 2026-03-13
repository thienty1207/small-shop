use std::sync::Arc;

use lettre::{AsyncSmtpTransport, Tokio1Executor};
use reqwest::Client;
use sqlx::PgPool;

use crate::config::Config;
use crate::services::cloudinary::CloudinaryConfig;

/// Shared application state injected into every Axum handler via `State<AppState>`.
#[derive(Clone)]
pub struct AppState {
    pub db:          PgPool,
    pub config:      Arc<Config>,
    /// Shared HTTP client — reused across all requests for connection pooling.
    pub http_client: Client,
    /// Pre-built SMTP transport — reused across requests (avoids per-request TLS handshake).
    pub mailer:      Option<AsyncSmtpTransport<Tokio1Executor>>,
    /// Cloudinary credentials — present when CLOUDINARY_URL is set in .env.
    pub cloudinary:  Option<CloudinaryConfig>,
}
