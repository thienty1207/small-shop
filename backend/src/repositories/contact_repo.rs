use sqlx::PgPool;
use uuid::Uuid;

use crate::{error::AppError, models::contact::ContactMessage};

/// Persist an incoming contact form submission to the database.
pub async fn save_contact_message(
    pool: &PgPool,
    name: &str,
    email: &str,
    phone: Option<&str>,
    message: &str,
    ip_address: Option<&str>,
) -> Result<ContactMessage, AppError> {
    let record = sqlx::query_as!(
        ContactMessage,
        r#"
        INSERT INTO contact_messages (id, name, email, phone, message, ip_address)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, name, email, phone, message, ip_address, created_at
        "#,
        Uuid::new_v4(),
        name,
        email,
        phone,
        message,
        ip_address,
    )
    .fetch_one(pool)
    .await?;

    Ok(record)
}
