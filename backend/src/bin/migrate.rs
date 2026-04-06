use backend::{config::Config, startup};

#[tokio::main]
async fn main() {
    startup::load_env_files();
    startup::init_tracing();

    let config = Config::from_env().expect("Failed to load configuration");
    let db = startup::connect_db(&config.database_url)
        .await
        .expect("Failed to connect to database");

    startup::run_migrations(&db)
        .await
        .expect("Failed to run database migrations");
}
