use std::collections::HashMap;

use sqlx::PgPool;

use crate::{error::AppError, models::settings::ShopSetting};

/// Fetch all settings as a map of key → value.
pub async fn get_all(pool: &PgPool) -> Result<HashMap<String, String>, AppError> {
    let rows = sqlx::query_as::<_, ShopSetting>(
        "SELECT key, value, updated_at FROM shop_settings ORDER BY key",
    )
    .fetch_all(pool)
    .await?;

    let map = rows.into_iter().map(|r| (r.key, r.value)).collect();
    Ok(map)
}

/// Upsert multiple settings in a single transaction.
pub async fn upsert_bulk(
    pool: &PgPool,
    settings: &HashMap<String, String>,
) -> Result<(), AppError> {
    if settings.is_empty() {
        return Ok(());
    }

    let mut tx = pool.begin().await?;

    for (key, value) in settings {
        sqlx::query(
            r#"
            INSERT INTO shop_settings (key, value, updated_at)
            VALUES ($1, $2, NOW())
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
            "#,
        )
        .bind(key)
        .bind(value)
        .execute(&mut *tx)
        .await?;
    }

    tx.commit().await?;
    Ok(())
}
