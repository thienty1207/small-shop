use std::{sync::Arc, time::Duration};

use axum::http::HeaderName;
use axum::{http::Method, Router};
use sqlx::{postgres::PgPoolOptions, PgPool};
use tower_http::{
    cors::{Any, CorsLayer},
    request_id::{MakeRequestUuid, PropagateRequestIdLayer, SetRequestIdLayer},
    services::ServeDir,
    trace::TraceLayer,
};
use tracing::info;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

use crate::{
    config::{Config, MediaBackend},
    error::AppError,
    routes,
    services::{admin_auth_service, cloudinary::CloudinaryConfig, email_service},
    state::AppState,
};

pub fn load_env_files() {
    if std::path::Path::new(".env").exists() {
        dotenvy::dotenv().ok();
    } else {
        dotenvy::from_path("backend/.env").ok();
    }
}

pub fn init_tracing() {
    tracing_subscriber::registry()
        .with(EnvFilter::try_from_default_env().unwrap_or_else(|_| "backend=debug,info".into()))
        .with(tracing_subscriber::fmt::layer())
        .try_init()
        .ok();
}

pub fn format_bind_error(addr: &str, error: &std::io::Error) -> String {
    if error.kind() == std::io::ErrorKind::AddrInUse {
        return format!(
            "Failed to bind {addr}: another process is already using this port. \
stop the old backend process or change SERVER_PORT."
        );
    }

    format!("Failed to bind {addr}: {error}")
}

pub async fn connect_db(database_url: &str) -> Result<PgPool, sqlx::Error> {
    PgPoolOptions::new()
        .max_connections(10)
        .connect(database_url)
        .await
}

pub async fn run_migrations(db: &PgPool) -> Result<(), AppError> {
    sqlx::migrate!("../sql")
        .run(db)
        .await
        .map_err(|error| AppError::Internal(format!("Failed to run migrations: {error}")))?;
    Ok(())
}

pub async fn build_state(config: Arc<Config>, db: PgPool) -> Result<AppState, AppError> {
    admin_auth_service::seed_admin_user(&db, &config)
        .await
        .map_err(|error| AppError::Internal(format!("Failed to seed admin user: {error}")))?;

    let mailer = match email_service::build_mailer(&config) {
        Ok(mailer) => {
            info!(
                "SMTP mailer ready ({}:{})",
                config.smtp_host, config.smtp_port
            );
            Some(mailer)
        }
        Err(error) => {
            tracing::warn!("SMTP mailer failed to initialize, emails disabled: {error}");
            None
        }
    };

    let cloudinary = match config.upload_backend {
        MediaBackend::Cloudinary => {
            let url = config
                .cloudinary_url
                .as_deref()
                .ok_or_else(|| AppError::Internal("CLOUDINARY_URL is not configured".into()))?;

            let parsed = CloudinaryConfig::from_url(url)
                .map_err(|error| AppError::Internal(format!("Cloudinary config error: {error}")))?;
            info!("Cloudinary ready (cloud: {})", parsed.cloud_name);
            Some(parsed)
        }
        MediaBackend::Local => {
            info!("Using local media storage for development uploads");
            None
        }
    };

    let http_client = reqwest::Client::builder()
        .timeout(Duration::from_secs(15))
        .build()
        .map_err(|error| AppError::Internal(format!("Failed to build HTTP client: {error}")))?;

    Ok(AppState {
        db,
        config,
        http_client,
        mailer,
        cloudinary,
    })
}

pub async fn build_app(state: AppState) -> Result<Router, AppError> {
    let cors = CorsLayer::new()
        .allow_origin([state
            .config
            .frontend_url
            .parse::<axum::http::HeaderValue>()
            .map_err(|_| AppError::Internal("Invalid FRONTEND_URL for CORS".into()))?])
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::PUT,
            Method::PATCH,
            Method::DELETE,
            Method::OPTIONS,
        ])
        .allow_headers(Any);

    let request_id_header = HeaderName::from_static("x-request-id");
    let mut app = Router::new().merge(routes::create_router(state.clone()));

    if matches!(state.config.upload_backend, MediaBackend::Local) {
        tokio::fs::create_dir_all("uploads")
            .await
            .map_err(|error| {
                AppError::Internal(format!("Failed to create uploads directory: {error}"))
            })?;
        app = app.nest_service("/uploads", ServeDir::new("uploads"));
    }

    Ok(app
        .layer(PropagateRequestIdLayer::new(request_id_header.clone()))
        .layer(SetRequestIdLayer::new(request_id_header, MakeRequestUuid))
        .layer(TraceLayer::new_for_http())
        .layer(cors)
        .with_state(state))
}
