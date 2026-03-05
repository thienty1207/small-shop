use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::AppError,
    models::product::{
        AdminProduct, AdminProductQuery, Category, CategoryInput, CreateProductInput,
        PaginatedResponse, Product, ProductPublic, ProductQuery, UpdateProductInput,
    },
};

/// Fetch products with optional category/search filter, sort, and pagination.
/// Returns a paginated response.
pub async fn find_all(
    pool: &PgPool,
    query: &ProductQuery,
) -> Result<PaginatedResponse<ProductPublic>, AppError> {
    let offset = (query.page - 1) * query.limit;

    // Build ORDER BY clause (safe: values are controlled, not raw user input)
    let order_by = match query.sort.as_deref() {
        Some("price_asc")     => "p.price ASC, p.created_at DESC",
        Some("price_desc")    => "p.price DESC, p.created_at DESC",
        Some("best_selling")  => "COALESCE(sales.total_sold, 0) DESC, p.created_at DESC",
        _                     => "p.created_at DESC", // newest (default)
    };

    let sql = format!(
        r#"
        WITH sales AS (
            SELECT product_id, SUM(quantity)::BIGINT AS total_sold
            FROM order_items GROUP BY product_id
        )
        SELECT
            p.id, p.category_id, p.name, p.slug, p.price, p.original_price,
            p.image_url, p.images, p.badge, p.description, p.material, p.care,
            p.rating::float8 AS rating,
            p.review_count, p.in_stock, p.stock, p.created_at
        FROM products p
        JOIN categories c ON c.id = p.category_id
        LEFT JOIN sales ON sales.product_id = p.id
        WHERE
            ($1::TEXT IS NULL OR c.slug = $1)
            AND ($2::TEXT IS NULL OR p.name ILIKE '%' || $2 || '%')
        ORDER BY {order_by}
        LIMIT $3 OFFSET $4
        "#
    );

    let items = sqlx::query_as::<_, Product>(&sql)
        .bind(query.category.as_deref())
        .bind(query.search.as_deref())
        .bind(query.limit)
        .bind(offset)
        .fetch_all(pool)
        .await?;

    let total: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*) FROM products p
        JOIN categories c ON c.id = p.category_id
        WHERE
            ($1::TEXT IS NULL OR c.slug = $1)
            AND ($2::TEXT IS NULL OR p.name ILIKE '%' || $2 || '%')
        "#,
    )
    .bind(query.category.as_deref())
    .bind(query.search.as_deref())
    .fetch_one(pool)
    .await?;

    let public: Vec<ProductPublic> = items.into_iter().map(ProductPublic::from).collect();
    let total_pages = (total + query.limit - 1) / query.limit;

    Ok(PaginatedResponse { items: public, total, page: query.page, limit: query.limit, total_pages })
}

/// Fetch a single product by its slug.
pub async fn find_by_slug(pool: &PgPool, slug: &str) -> Result<Option<Product>, AppError> {
    let product = sqlx::query_as!(
        Product,
        r#"
        SELECT id, category_id, name, slug, price, original_price,
               image_url, images, badge, description, material, care,
               rating::float8 AS "rating!: f64",
               review_count, in_stock, stock, created_at
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
               review_count, in_stock, stock, created_at
        FROM products
        WHERE id = $1
        "#,
        id,
    )
    .fetch_optional(pool)
    .await?;

    Ok(product)
}

// ─── Admin CRUD ──────────────────────────────────────────────────────────────

/// Helper: transliterate a string into an ASCII slug.
fn slugify(s: &str) -> String {
    let map: &[(&str, &str)] = &[
        ("à|á|ả|ã|ạ|ă|ắ|ặ|ằ|ẳ|ẵ|â|ấ|ầ|ẩ|ẫ|ậ", "a"),
        ("è|é|ẹ|ẻ|ẽ|ê|ế|ề|ệ|ể|ễ", "e"),
        ("ì|í|ị|ỉ|ĩ", "i"),
        ("ò|ó|ọ|ỏ|õ|ô|ố|ồ|ộ|ổ|ỗ|ơ|ớ|ờ|ợ|ở|ỡ", "o"),
        ("ù|ú|ụ|ủ|ũ|ư|ứ|ừ|ự|ử|ữ", "u"),
        ("ỳ|ý|ỵ|ỷ|ỹ", "y"),
        ("đ", "d"),
    ];
    let mut result = s.to_lowercase();
    for (chars, replacement) in map {
        for ch in chars.split('|') {
            result = result.replace(ch, replacement);
        }
    }
    result
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() { c } else { '-' })
        .collect::<String>()
        .split('-')
        .filter(|s| !s.is_empty())
        .collect::<Vec<_>>()
        .join("-")
}

/// Fetch a single AdminProduct by id (used after create/update).
pub async fn find_admin_by_id(pool: &PgPool, id: Uuid) -> Result<Option<AdminProduct>, AppError> {
    let product = sqlx::query_as::<_, AdminProduct>(
        r#"
        SELECT p.id, p.category_id, c.name AS category_name, p.name, p.slug,
               p.price, p.original_price, p.image_url, p.badge, p.description,
               p.in_stock, p.stock, p.created_at
        FROM products p
        JOIN categories c ON c.id = p.category_id
        WHERE p.id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(pool)
    .await?;
    Ok(product)
}

/// Paginated product list for the admin panel.
pub async fn find_all_admin(
    pool: &PgPool,
    query: &AdminProductQuery,
) -> Result<PaginatedResponse<AdminProduct>, AppError> {
    let offset = (query.page - 1) * query.limit;

    let items = sqlx::query_as::<_, AdminProduct>(
        r#"
        SELECT p.id, p.category_id, c.name AS category_name, p.name, p.slug,
               p.price, p.original_price, p.image_url, p.badge, p.description,
               p.in_stock, p.stock, p.created_at
        FROM products p
        JOIN categories c ON c.id = p.category_id
        WHERE ($1::TEXT  IS NULL OR p.name ILIKE '%' || $1 || '%')
          AND ($2::UUID  IS NULL OR p.category_id = $2)
          AND ($3::BOOL  IS NULL OR p.in_stock = $3)
        ORDER BY p.created_at DESC
        LIMIT $4 OFFSET $5
        "#,
    )
    .bind(query.search.as_deref())
    .bind(query.category_id)
    .bind(query.in_stock)
    .bind(query.limit)
    .bind(offset)
    .fetch_all(pool)
    .await?;

    let total: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*) FROM products p
        WHERE ($1::TEXT IS NULL OR p.name ILIKE '%' || $1 || '%')
          AND ($2::UUID IS NULL OR p.category_id = $2)
          AND ($3::BOOL IS NULL OR p.in_stock = $3)
        "#,
    )
    .bind(query.search.as_deref())
    .bind(query.category_id)
    .bind(query.in_stock)
    .fetch_one(pool)
    .await?;

    let total_pages = (total + query.limit - 1) / query.limit;
    Ok(PaginatedResponse { items, total, page: query.page, limit: query.limit, total_pages })
}

/// Create a new product and return the full AdminProduct.
pub async fn create_product(
    pool: &PgPool,
    input: &CreateProductInput,
) -> Result<AdminProduct, AppError> {
    let slug = input
        .slug
        .clone()
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| slugify(&input.name));
    let in_stock = input.in_stock.unwrap_or(true);
    let stock    = input.stock.unwrap_or(0);
    let images   = input.images.clone().unwrap_or_default();

    let id = sqlx::query_scalar::<_, Uuid>(
        r#"
        INSERT INTO products
            (category_id, name, slug, price, original_price, image_url, images,
             badge, description, material, care, in_stock, stock)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id
        "#,
    )
    .bind(input.category_id)
    .bind(&input.name)
    .bind(&slug)
    .bind(input.price)
    .bind(input.original_price)
    .bind(&input.image_url)
    .bind(&images)
    .bind(&input.badge)
    .bind(&input.description)
    .bind(&input.material)
    .bind(&input.care)
    .bind(in_stock)
    .bind(stock)
    .fetch_one(pool)
    .await?;

    find_admin_by_id(pool, id)
        .await?
        .ok_or_else(|| AppError::Internal("Failed to fetch created product".into()))
}

/// Update an existing product (full PUT semantics).
pub async fn update_product(
    pool: &PgPool,
    id: Uuid,
    input: &UpdateProductInput,
) -> Result<AdminProduct, AppError> {
    let rows = sqlx::query(
        r#"
        UPDATE products
        SET category_id    = $2,
            name           = $3,
            slug           = $4,
            price          = $5,
            original_price = $6,
            image_url      = $7,
            images         = $8,
            badge          = $9,
            description    = $10,
            material       = $11,
            care           = $12,
            in_stock       = $13,
            stock          = $14
        WHERE id = $1
        "#,
    )
    .bind(id)
    .bind(input.category_id)
    .bind(&input.name)
    .bind(&input.slug)
    .bind(input.price)
    .bind(input.original_price)
    .bind(&input.image_url)
    .bind(&input.images)
    .bind(&input.badge)
    .bind(&input.description)
    .bind(&input.material)
    .bind(&input.care)
    .bind(input.in_stock)
    .bind(input.stock)
    .execute(pool)
    .await?;

    if rows.rows_affected() == 0 {
        return Err(AppError::NotFound(format!("Product {id} not found")));
    }

    find_admin_by_id(pool, id)
        .await?
        .ok_or_else(|| AppError::Internal("Failed to fetch updated product".into()))
}

/// Hard-delete a product.
pub async fn delete_product(pool: &PgPool, id: Uuid) -> Result<(), AppError> {
    let rows = sqlx::query("DELETE FROM products WHERE id = $1")
        .bind(id)
        .execute(pool)
        .await?;
    if rows.rows_affected() == 0 {
        return Err(AppError::NotFound(format!("Product {id} not found")));
    }
    Ok(())
}

// ─── Category admin CRUD ─────────────────────────────────────────────────────

/// Create a new category.
pub async fn create_category(pool: &PgPool, input: &CategoryInput) -> Result<Category, AppError> {
    let slug = input
        .slug
        .clone()
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| slugify(&input.name));

    let cat = sqlx::query_as!(
        Category,
        r#"
        INSERT INTO categories (name, slug, image_url)
        VALUES ($1, $2, $3)
        RETURNING id, name, slug, image_url, created_at
        "#,
        &input.name,
        &slug,
        input.image_url.as_deref(),
    )
    .fetch_one(pool)
    .await?;

    Ok(cat)
}

/// Update a category.
pub async fn update_category(
    pool: &PgPool,
    id: Uuid,
    input: &CategoryInput,
) -> Result<Category, AppError> {
    let slug = input
        .slug
        .clone()
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| slugify(&input.name));

    let rows = sqlx::query(
        "UPDATE categories SET name = $2, slug = $3, image_url = $4 WHERE id = $1",
    )
    .bind(id)
    .bind(&input.name)
    .bind(&slug)
    .bind(input.image_url.as_deref())
    .execute(pool)
    .await?;

    if rows.rows_affected() == 0 {
        return Err(AppError::NotFound(format!("Category {id} not found")));
    }

    let cat = sqlx::query_as!(
        Category,
        "SELECT id, name, slug, image_url, created_at FROM categories WHERE id = $1",
        id,
    )
    .fetch_one(pool)
    .await?;

    Ok(cat)
}

/// Delete a category (fails if products are still linked).
pub async fn delete_category(pool: &PgPool, id: Uuid) -> Result<(), AppError> {
    let count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM products WHERE category_id = $1",
    )
    .bind(id)
    .fetch_one(pool)
    .await?;

    if count > 0 {
        return Err(AppError::BadRequest(format!(
            "Cannot delete: {count} product(s) still belong to this category"
        )));
    }

    let rows = sqlx::query("DELETE FROM categories WHERE id = $1")
        .bind(id)
        .execute(pool)
        .await?;

    if rows.rows_affected() == 0 {
        return Err(AppError::NotFound(format!("Category {id} not found")));
    }
    Ok(())
}
