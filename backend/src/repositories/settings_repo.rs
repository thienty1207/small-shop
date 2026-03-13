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

/// Fetch only the specified keys from settings. More efficient than get_all() for public API.
pub async fn get_by_keys(pool: &PgPool, keys: &[&str]) -> Result<HashMap<String, String>, AppError> {
    let rows = sqlx::query_as::<_, ShopSetting>(
        "SELECT key, value, updated_at FROM shop_settings WHERE key = ANY($1)",
    )
    .bind(keys)
    .fetch_all(pool)
    .await?;

    Ok(rows.into_iter().map(|r| (r.key, r.value)).collect())
}

/// Upsert multiple settings in a single batch query using UNNEST — O(1) round-trips.
pub async fn upsert_bulk(
    pool: &PgPool,
    settings: &HashMap<String, String>,
) -> Result<(), AppError> {
    if settings.is_empty() {
        return Ok(());
    }

    let (keys, values): (Vec<String>, Vec<String>) = settings
        .iter()
        .map(|(k, v)| (k.clone(), v.clone()))
        .unzip();

    sqlx::query(
        r#"
        INSERT INTO shop_settings (key, value, updated_at)
        SELECT unnest($1::text[]), unnest($2::text[]), NOW()
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
        "#,
    )
    .bind(&keys)
    .bind(&values)
    .execute(pool)
    .await?;

    Ok(())
}
