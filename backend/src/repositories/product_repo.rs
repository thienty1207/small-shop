use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::AppError,
    models::product::{Category, Product, ProductQuery},
};

/// Fetch all products, optionally filtered by category slug or search term.
pub async fn find_all(pool: &PgPool, query: &ProductQuery) -> Result<Vec<Product>, AppError> {
    let products = sqlx::query_as!(
        Product,
        r#"
        SELECT
            p.id, p.category_id, p.name, p.slug, p.price, p.original_price,
            p.image_url, p.images, p.badge, p.description, p.material, p.care,
            p.rating::float8 AS "rating!: f64",
            p.review_count, p.in_stock, p.created_at
        FROM products p
        JOIN categories c ON c.id = p.category_id
        WHERE
            ($1::TEXT IS NULL OR c.slug = $1)
            AND ($2::TEXT IS NULL OR p.name ILIKE '%' || $2 || '%')
        ORDER BY p.created_at DESC
        "#,
        query.category.as_deref(),
        query.search.as_deref(),
    )
    .fetch_all(pool)
    .await?;

    Ok(products)
}

/// Fetch a single product by its slug.
pub async fn find_by_slug(pool: &PgPool, slug: &str) -> Result<Option<Product>, AppError> {
    let product = sqlx::query_as!(
        Product,
        r#"
        SELECT id, category_id, name, slug, price, original_price,
               image_url, images, badge, description, material, care,
               rating::float8 AS "rating!: f64",
               review_count, in_stock, created_at
        FROM products
        WHERE slug = $1
        "#,
        slug,
    )
    .fetch_optional(pool)
    .await?;

    Ok(product)
}

/// Fetch all categories.
pub async fn find_all_categories(pool: &PgPool) -> Result<Vec<Category>, AppError> {
    let categories = sqlx::query_as!(
        Category,
        r#"SELECT id, name, slug, image_url, created_at FROM categories ORDER BY name ASC"#,
    )
    .fetch_all(pool)
    .await?;

    Ok(categories)
}

/// Fetch a product by its UUID (used during order creation).
pub async fn find_by_id(pool: &PgPool, id: Uuid) -> Result<Option<Product>, AppError> {
    let product = sqlx::query_as!(
        Product,
        r#"
        SELECT id, category_id, name, slug, price, original_price,
               image_url, images, badge, description, material, care,
               rating::float8 AS "rating!: f64",
               review_count, in_stock, created_at
        FROM products
        WHERE id = $1
        "#,
        id,
    )
    .fetch_optional(pool)
    .await?;

    Ok(product)
}
