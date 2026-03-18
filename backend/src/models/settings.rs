use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// A single row in the `shop_settings` key-value table.
#[derive(Debug, Clone, sqlx::FromRow, Serialize)]
pub struct ShopSetting {
    pub key: String,
    pub value: String,
    pub updated_at: DateTime<Utc>,
}

/// Request body for bulk-updating settings.
#[derive(Debug, Deserialize)]
pub struct UpdateSettingsInput {
    pub settings: HashMap<String, String>,
}
