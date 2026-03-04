use std::sync::Arc;

use lettre::{AsyncSmtpTransport, Tokio1Executor};
use sqlx::PgPool;

use crate::config::Config;

/// Shared application state injected into every Axum handler via `State<AppState>`.
#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub config: Arc<Config>,
    /// Pre-built SMTP transport — reused across requests (avoids per-request TLS handshake).
    pub mailer: Option<AsyncSmtpTransport<Tokio1Executor>>,
}
