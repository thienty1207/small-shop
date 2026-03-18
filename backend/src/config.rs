use std::env;

/// Application configuration loaded from environment variables.
#[derive(Debug, Clone)]
pub struct Config {
    pub server_port: u16,
    pub database_url: String,

    // Google OAuth 2.0
    pub google_client_id: String,
    pub google_client_secret: String,
    pub google_redirect_uri: String,

    // JWT
    pub jwt_secret: String,
    pub jwt_expiration_hours: i64,

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
        Ok(Self {
            server_port: env_var("SERVER_PORT")
                .unwrap_or_else(|_| "3000".into())
                .parse::<u16>()
                .map_err(|_| "SERVER_PORT must be a valid port number")?,

            database_url: env_var("DATABASE_URL")?,

            google_client_id: env_var("GOOGLE_CLIENT_ID")?,
            google_client_secret: env_var("GOOGLE_CLIENT_SECRET")?,
            google_redirect_uri: env_var("GOOGLE_REDIRECT_URI")?,

            jwt_secret: env_var("JWT_SECRET")?,
            jwt_expiration_hours: env_var("JWT_EXPIRATION_HOURS")
                .unwrap_or_else(|_| "24".into())
                .parse::<i64>()
                .map_err(|_| "JWT_EXPIRATION_HOURS must be a valid integer")?,

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

            admin_username: env_var("ADMIN_USERNAME").unwrap_or_else(|_| "hothienty".into()),
            admin_password: env_var("ADMIN_PASSWORD").unwrap_or_else(|_| "tohkaty01".into()),
        })
    }
}

fn env_var(key: &str) -> Result<String, String> {
    env::var(key).map_err(|_| format!("Missing required environment variable: {key}"))
}
