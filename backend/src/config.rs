use std::env;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AppEnv {
    Development,
    Production,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MediaBackend {
    Local,
    Cloudinary,
}

pub fn parse_app_env(raw: Option<&str>) -> Result<AppEnv, String> {
    match raw.unwrap_or("development").trim().to_lowercase().as_str() {
        "development" | "dev" | "local" => Ok(AppEnv::Development),
        "production" | "prod" => Ok(AppEnv::Production),
        other => Err(format!(
            "APP_ENV must be 'development' or 'production', got '{other}'"
        )),
    }
}

pub fn resolve_auto_run_migrations(app_env: AppEnv, raw: Option<&str>) -> Result<bool, String> {
    match raw.map(|value| value.trim().to_lowercase()) {
        Some(value) if matches!(value.as_str(), "1" | "true" | "yes" | "on") => Ok(true),
        Some(value) if matches!(value.as_str(), "0" | "false" | "no" | "off") => Ok(false),
        Some(value) => Err(format!(
            "AUTO_RUN_MIGRATIONS must be a boolean, got '{value}'"
        )),
        None => Ok(matches!(app_env, AppEnv::Development)),
    }
}

pub fn resolve_media_backend(
    app_env: AppEnv,
    raw: Option<&str>,
    has_cloudinary_config: bool,
) -> Result<MediaBackend, String> {
    match raw.map(|value| value.trim().to_lowercase()) {
        Some(value) if value == "local" => {
            if matches!(app_env, AppEnv::Production) {
                return Err(
                    "UPLOAD_BACKEND=local is only allowed in development environments".into(),
                );
            }
            Ok(MediaBackend::Local)
        }
        Some(value) if value == "cloudinary" => {
            if !has_cloudinary_config {
                return Err(
                    "UPLOAD_BACKEND=cloudinary requires CLOUDINARY_URL to be configured".into(),
                );
            }
            Ok(MediaBackend::Cloudinary)
        }
        Some(value) => Err(format!(
            "UPLOAD_BACKEND must be 'local' or 'cloudinary', got '{value}'"
        )),
        None if has_cloudinary_config => Ok(MediaBackend::Cloudinary),
        None if matches!(app_env, AppEnv::Development) => Ok(MediaBackend::Local),
        None => Err(
            "Production requires a remote upload backend. Configure CLOUDINARY_URL or set UPLOAD_BACKEND=cloudinary"
                .into(),
        ),
    }
}

/// Application configuration loaded from environment variables.
#[derive(Debug, Clone)]
pub struct Config {
    pub app_env: AppEnv,
    pub upload_backend: MediaBackend,
    pub auto_run_migrations: bool,
    pub cloudinary_url: Option<String>,
    pub server_port: u16,
    pub database_url: String,

    // Google OAuth 2.0
    pub google_client_id: String,
    pub google_client_secret: String,
    pub google_redirect_uri: String,

    // JWT
    pub jwt_secret: String,
    pub jwt_expiration_hours: i64,

    // OAuth CSRF protection
    pub csrf_cookie_key: String,

    // Frontend (for OAuth redirect after callback)
    pub frontend_url: String,

    // SMTP / Email
    pub smtp_host: String,
    pub smtp_port: u16,
    pub smtp_username: String,
    pub smtp_password: String,
    pub contact_from_name: String,
    pub contact_from_email: String,
    pub contact_admin_email: String,
    pub reply_logo_url: String,

    // Cloudflare Turnstile (server-side secret key)
    pub cloudflare_secret_key: String,

    // Admin panel credentials (seeded into admin_users table on first startup)
    pub admin_username: String,
    pub admin_password: String,
}

impl Config {
    /// Load configuration from environment variables.
    /// Panics early with a clear message if a required variable is missing.
    pub fn from_env() -> Result<Self, String> {
        let jwt_secret = env_var("JWT_SECRET")?;
        if jwt_secret.trim().len() < 32 {
            return Err("JWT_SECRET must be at least 32 characters".into());
        }

        let csrf_cookie_key = env::var("CSRF_COOKIE_KEY").unwrap_or_else(|_| jwt_secret.clone());
        if csrf_cookie_key.trim().len() < 32 {
            return Err("CSRF_COOKIE_KEY must be at least 32 characters".into());
        }

        let app_env = parse_app_env(env::var("APP_ENV").ok().as_deref())?;
        let cloudinary_url = env::var("CLOUDINARY_URL")
            .ok()
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty());
        let upload_backend = resolve_media_backend(
            app_env,
            env::var("UPLOAD_BACKEND").ok().as_deref(),
            cloudinary_url.is_some(),
        )?;
        let auto_run_migrations =
            resolve_auto_run_migrations(app_env, env::var("AUTO_RUN_MIGRATIONS").ok().as_deref())?;

        Ok(Self {
            app_env,
            upload_backend,
            auto_run_migrations,
            cloudinary_url,
            server_port: env_var("SERVER_PORT")
                .unwrap_or_else(|_| "3000".into())
                .parse::<u16>()
                .map_err(|_| "SERVER_PORT must be a valid port number")?,

            database_url: env_var("DATABASE_URL")?,

            google_client_id: env_var("GOOGLE_CLIENT_ID")?,
            google_client_secret: env_var("GOOGLE_CLIENT_SECRET")?,
            google_redirect_uri: env_var("GOOGLE_REDIRECT_URI")?,

            jwt_secret,
            jwt_expiration_hours: env_var("JWT_EXPIRATION_HOURS")
                .unwrap_or_else(|_| "24".into())
                .parse::<i64>()
                .map_err(|_| "JWT_EXPIRATION_HOURS must be a valid integer")?,
            csrf_cookie_key,

            frontend_url: env_var("FRONTEND_URL")?,

            smtp_host: env_var("SMTP_HOST").unwrap_or_else(|_| "smtp.gmail.com".into()),
            smtp_port: env_var("SMTP_PORT")
                .unwrap_or_else(|_| "587".into())
                .parse::<u16>()
                .map_err(|_| "SMTP_PORT must be a valid port number")?,
            smtp_username: env_var("SMTP_USERNAME")?,
            smtp_password: env_var("SMTP_PASSWORD")?,
            contact_from_name: env_var("CONTACT_FROM_NAME")
                .unwrap_or_else(|_| "Handmade Haven".into()),
            contact_from_email: env_var("CONTACT_FROM_EMAIL")?,
            contact_admin_email: env_var("CONTACT_ADMIN_EMAIL")?,
            reply_logo_url: env_var("REPLY_LOGO_URL").unwrap_or_default(),

            cloudflare_secret_key: env_var("CLOUDFLARE_SECRET_KEY")?,

            admin_username: env_var("ADMIN_USERNAME")?,
            admin_password: env_var("ADMIN_PASSWORD")?,
        })
    }
}

fn env_var(key: &str) -> Result<String, String> {
    env::var(key).map_err(|_| format!("Missing required environment variable: {key}"))
}
