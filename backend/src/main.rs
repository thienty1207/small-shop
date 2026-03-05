use std::sync::Arc;

use axum::Router;
use sqlx::postgres::PgPoolOptions;
use tower_http::{cors::{Any, CorsLayer}, services::ServeDir};
use tracing::info;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

use backend::{config::Config, routes, services::{admin_auth_service, email_service}, state::AppState};

#[tokio::main]
async fn main() {
    // Load .env FIRST — works whether running from backend/ or workspace root
    if std::path::Path::new(".env").exists() {
        dotenvy::dotenv().ok();
    } else {
        dotenvy::from_path("backend/.env").ok();
    }

    // Initialize structured logging (after env is loaded so RUST_LOG is available)
    tracing_subscriber::registry()
        .with(EnvFilter::try_from_default_env().unwrap_or_else(|_| "backend=debug,info".into()))
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load and validate configuration
    let config = Arc::new(Config::from_env().expect("Failed to load configuration"));

    // Connect to PostgreSQL
    let db = PgPoolOptions::new()
        .max_connections(10)
        .connect(&config.database_url)
        .await
        .expect("Failed to connect to database");

    info!("Connected to database");

    // Run SQL migrations automatically on every startup
    sqlx::migrate!("../sql")
        .run(&db)
        .await
        .expect("Failed to run database migrations");

    info!("Database migrations applied");

    // Seed bootstrap admin account (idempotent — skips if already exists)
    admin_auth_service::seed_admin_user(&db, &config)
        .await
        .expect("Failed to seed admin user");

    // Build the SMTP mailer once — reused across all requests (avoids per-request TLS handshake)
    let mailer = match email_service::build_mailer(&config) {
        Ok(m) => {
            info!("SMTP mailer ready ({}:{})", config.smtp_host, config.smtp_port);
            Some(m)
        }
        Err(e) => {
            tracing::warn!("SMTP mailer failed to initialize — emails disabled: {e}");
            None
        }
    };

    // Build application state
    let state = AppState { db, config: config.clone(), mailer };

    // Ensure uploads directory exists for product image uploads
    tokio::fs::create_dir_all("uploads")
        .await
        .expect("Failed to create uploads directory");

    // CORS — allow frontend origin to call the API
    // In production, replace Any with the exact frontend domain.
    let cors = CorsLayer::new()
        .allow_origin([
            config.frontend_url
                .parse::<axum::http::HeaderValue>()
                .expect("Invalid FRONTEND_URL for CORS"),
        ])
        .allow_methods(Any)
        .allow_headers(Any);

    // Build router — static /uploads served directly without CORS wrapping
    let app = Router::new()
        .merge(routes::create_router(state.clone()))
        .nest_service("/uploads", ServeDir::new("uploads"))
        .layer(cors)
        .with_state(state);

    let addr = format!("0.0.0.0:{}", config.server_port);
    info!("Server listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(&addr)
        .await
        .expect("Failed to bind address");

    axum::serve(listener, app)
        .await
        .expect("Server error");
}
