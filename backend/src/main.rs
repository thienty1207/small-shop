use std::sync::Arc;

use tracing::info;

use backend::{config::Config, startup};

#[tokio::main]
async fn main() {
    startup::load_env_files();
    startup::init_tracing();

    let config = Arc::new(Config::from_env().expect("Failed to load configuration"));
    let db = startup::connect_db(&config.database_url)
        .await
        .expect("Failed to connect to database");

    info!("Connected to database");

    if config.auto_run_migrations {
        startup::run_migrations(&db)
            .await
            .expect("Failed to run database migrations");
        info!("Database migrations applied");
    } else {
        info!("Database auto migrations disabled for this environment");
    }

    let state = startup::build_state(config.clone(), db)
        .await
        .expect("Failed to build application state");
    let app = startup::build_app(state)
        .await
        .expect("Failed to build router");

    let addr = format!("0.0.0.0:{}", config.server_port);
    let listener = tokio::net::TcpListener::bind(&addr)
        .await
        .unwrap_or_else(|error| panic!("{}", startup::format_bind_error(&addr, &error)));

    info!("Server listening on {}", addr);

    axum::serve(listener, app).await.expect("Server error");
}
