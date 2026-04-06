use sqlx::PgPool;
use std::collections::HashMap;
use uuid::Uuid;

use crate::{
    error::AppError,
    models::product::{
        AdminProduct, AdminProductQuery, Category, CategoryInput, CreateProductInput, InventoryRow,
        PaginatedResponse, Product, ProductFilterOption, ProductFiltersResponse, ProductPublic,
        ProductQuery, ProductSearchSuggestion, ProductVariant, UpdateProductInput,
        UpdateStockInput, VariantInput,
    },
};

fn parse_csv_strings(raw: Option<&str>) -> Option<Vec<String>> {
    let values: Vec<String> = raw
        .unwrap_or_default()
        .split(',')
        .map(|value| value.trim())
        .filter(|value| !value.is_empty())
        .map(|value| value.to_string())
        .collect();

    if values.is_empty() {
        None
    } else {
        Some(values)
    }
}

fn normalize_badge_filters(raw: Option<&str>) -> Option<Vec<String>> {
    parse_csv_strings(raw).map(|values| {
        values
            .into_iter()
            .flat_map(|value| {
                let normalized = value.to_lowercase();
                match normalized.as_str() {
                    "featured" | "noi-bat" | "noi bat" | "nổi bật" => {
                        vec!["nổi bật".to_string(), "featured".to_string()]
                    }
                    "new" | "moi" | "mới" => vec!["mới".to_string(), "new".to_string()],
                    _ => vec![normalized],
                }
            })
            .collect()
    })
}

fn normalize_fragrance_gender_filters(raw: Option<&str>) -> Option<Vec<String>> {
    parse_csv_strings(raw)
        .map(|values| {
            values
                .into_iter()
                .filter_map(|value| match value.to_lowercase().as_str() {
                    "male" | "nam" => Some("male".to_string()),
                    "female" | "nu" | "nữ" => Some("female".to_string()),
                    "unisex" => Some("unisex".to_string()),
                    _ => None,
                })
                .collect::<Vec<_>>()
        })
        .filter(|values| !values.is_empty())
}

fn normalize_homepage_section_filters(raw: Option<&str>) -> Option<Vec<String>> {
    normalize_fragrance_gender_filters(raw)
}

fn normalize_brand_filters(raw: Option<&str>) -> Option<Vec<String>> {
    parse_csv_strings(raw).map(|values| {
        values
            .into_iter()
            .map(|value| value.to_lowercase())
            .collect()
    })
}

fn normalize_volume_filters(raw: Option<&str>) -> Option<Vec<i32>> {
    parse_csv_strings(raw)
        .map(|values| {
            values
                .into_iter()
                .filter_map(|value| value.parse::<i32>().ok())
                .filter(|value| *value > 0)
                .collect::<Vec<_>>()
        })
        .filter(|values| !values.is_empty())
}

// ─── Public client queries ────────────────────────────────────────────────────

/// Fetch products with optional category/search filter, sort, and pagination.
pub async fn find_all(
    pool: &PgPool,
    query: &ProductQuery,
) -> Result<PaginatedResponse<ProductPublic>, AppError> {
    let offset = (query.page - 1) * query.limit;
    let badge_filters = normalize_badge_filters(query.badge.as_deref());
    let fragrance_gender_filters =
        normalize_fragrance_gender_filters(query.fragrance_gender.as_deref());
    let homepage_section_filters =
        normalize_homepage_section_filters(query.homepage_section.as_deref());
    let brand_filters = normalize_brand_filters(query.brand.as_deref());
    let volume_filters = normalize_volume_filters(query.volume.as_deref());

    let order_by = match query.sort.as_deref() {
        Some("price_asc") => {
            "COALESCE(display_variant.display_price, p.price) ASC,  p.created_at DESC"
        }
        Some("price_desc") => {
            "COALESCE(display_variant.display_price, p.price) DESC, p.created_at DESC"
        }
        Some("best_selling") => "COALESCE(sales.total_sold, 0) DESC, p.created_at DESC",
        _ => "p.created_at DESC",
    };

    let sql = format!(
        r#"
        WITH sales AS (
            SELECT product_id, SUM(quantity)::BIGINT AS total_sold
            FROM order_items GROUP BY product_id
        )
        SELECT
            p.id, p.category_id, p.name, p.slug, p.price, p.original_price,
            p.image_url, p.images, p.badge, p.description, p.top_note, p.mid_note, p.base_note, p.care,
            p.rating::float8 AS rating,
            p.review_count, p.in_stock, p.stock,
            p.brand, p.concentration, p.fragrance_gender, p.homepage_section, p.fragrance_line,
            p.created_at
        FROM products p
        JOIN categories c ON c.id = p.category_id
        LEFT JOIN sales ON sales.product_id = p.id
        LEFT JOIN LATERAL (
            SELECT pv.price AS display_price
            FROM product_variants pv
            WHERE pv.product_id = p.id
            ORDER BY
                CASE
                    WHEN pv.ml = 100 THEN 0
                    ELSE 1
                END,
                ABS(pv.ml - 100),
                pv.ml
            LIMIT 1
        ) AS display_variant ON TRUE
        WHERE
            ($1::TEXT IS NULL OR c.slug = $1)
            AND ($2::TEXT IS NULL OR p.name ILIKE '%' || $2 || '%')
            AND ($3::TEXT[] IS NULL OR LOWER(TRIM(COALESCE(p.badge, ''))) = ANY($3::TEXT[]))
            AND ($4::TEXT[] IS NULL OR LOWER(TRIM(p.fragrance_gender)) = ANY($4::TEXT[]))
            AND ($5::TEXT[] IS NULL OR LOWER(TRIM(COALESCE(p.homepage_section, ''))) = ANY($5::TEXT[]))
            AND ($6::TEXT[] IS NULL OR LOWER(TRIM(COALESCE(p.brand, ''))) = ANY($6::TEXT[]))
            AND (
                $7::INT[] IS NULL
                OR EXISTS (
                    SELECT 1
                    FROM product_variants pv_filter
                    WHERE pv_filter.product_id = p.id
                      AND pv_filter.ml = ANY($7::INT[])
                )
            )
        ORDER BY {order_by}
        LIMIT $8 OFFSET $9
        "#
    );

    let items = sqlx::query_as::<_, Product>(&sql)
        .bind(query.category.as_deref())
        .bind(query.search.as_deref())
        .bind(badge_filters.as_ref())
        .bind(fragrance_gender_filters.as_ref())
        .bind(homepage_section_filters.as_ref())
        .bind(brand_filters.as_ref())
        .bind(volume_filters.as_ref())
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
            AND ($3::TEXT[] IS NULL OR LOWER(TRIM(COALESCE(p.badge, ''))) = ANY($3::TEXT[]))
            AND ($4::TEXT[] IS NULL OR LOWER(TRIM(p.fragrance_gender)) = ANY($4::TEXT[]))
            AND ($5::TEXT[] IS NULL OR LOWER(TRIM(COALESCE(p.homepage_section, ''))) = ANY($5::TEXT[]))
            AND ($6::TEXT[] IS NULL OR LOWER(TRIM(COALESCE(p.brand, ''))) = ANY($6::TEXT[]))
            AND (
                $7::INT[] IS NULL
                OR EXISTS (
                    SELECT 1
                    FROM product_variants pv_filter
                    WHERE pv_filter.product_id = p.id
                      AND pv_filter.ml = ANY($7::INT[])
                )
            )
        "#,
    )
    .bind(query.category.as_deref())
    .bind(query.search.as_deref())
    .bind(badge_filters.as_ref())
    .bind(fragrance_gender_filters.as_ref())
    .bind(homepage_section_filters.as_ref())
    .bind(brand_filters.as_ref())
    .bind(volume_filters.as_ref())
    .fetch_one(pool)
    .await?;

    let product_ids: Vec<Uuid> = items.iter().map(|p| p.id).collect();

    // Batch fetch all variants for these products
    let all_variants = sqlx::query_as::<_, ProductVariant>(
        r#"
        SELECT id, product_id, ml, price, original_price, stock, is_default, created_at
        FROM product_variants
        WHERE product_id = ANY($1::uuid[])
        ORDER BY ml ASC
        "#,
    )
    .bind(&product_ids)
    .fetch_all(pool)
    .await?;

    // Group variants by product_id
    let mut variants_map: HashMap<Uuid, Vec<ProductVariant>> = HashMap::new();
    for v in all_variants {
        variants_map.entry(v.product_id).or_default().push(v);
    }

    let public: Vec<ProductPublic> = items
        .into_iter()
        .map(|p| {
            let id = p.id;
            let mut pub_prod = ProductPublic::from(p);
            pub_prod.variants = variants_map.remove(&id).unwrap_or_default();
            pub_prod
        })
        .collect();

    let total_pages = (total + query.limit - 1) / query.limit;
    Ok(PaginatedResponse {
        items: public,
        total,
        page: query.page,
        limit: query.limit,
        total_pages,
    })
}

pub async fn find_filters(
    pool: &PgPool,
    query: &ProductQuery,
) -> Result<ProductFiltersResponse, AppError> {
    let brands = sqlx::query_as::<_, ProductFilterOption>(
        r#"
        SELECT
            TRIM(p.brand) AS value,
            COUNT(*)::BIGINT AS count
        FROM products p
        JOIN categories c ON c.id = p.category_id
        WHERE
            NULLIF(TRIM(COALESCE(p.brand, '')), '') IS NOT NULL
            AND ($1::TEXT IS NULL OR c.slug = $1)
            AND ($2::TEXT IS NULL OR p.name ILIKE '%' || $2 || '%')
        GROUP BY TRIM(p.brand)
        ORDER BY COUNT(*) DESC, TRIM(p.brand) ASC
        "#,
    )
    .bind(query.category.as_deref())
    .bind(query.search.as_deref())
    .fetch_all(pool)
    .await?;

    let volumes = sqlx::query_as::<_, ProductFilterOption>(
        r#"
        SELECT
            pv.ml::TEXT AS value,
            COUNT(DISTINCT pv.product_id)::BIGINT AS count
        FROM product_variants pv
        JOIN products p ON p.id = pv.product_id
        JOIN categories c ON c.id = p.category_id
        WHERE
            ($1::TEXT IS NULL OR c.slug = $1)
            AND ($2::TEXT IS NULL OR p.name ILIKE '%' || $2 || '%')
        GROUP BY pv.ml
        ORDER BY pv.ml ASC
        "#,
    )
    .bind(query.category.as_deref())
    .bind(query.search.as_deref())
    .fetch_all(pool)
    .await?;

    let genders = sqlx::query_as::<_, ProductFilterOption>(
        r#"
        SELECT
            LOWER(TRIM(p.fragrance_gender)) AS value,
            COUNT(*)::BIGINT AS count
        FROM products p
        JOIN categories c ON c.id = p.category_id
        WHERE
            ($1::TEXT IS NULL OR c.slug = $1)
            AND ($2::TEXT IS NULL OR p.name ILIKE '%' || $2 || '%')
        GROUP BY LOWER(TRIM(p.fragrance_gender))
        ORDER BY
            CASE LOWER(TRIM(p.fragrance_gender))
                WHEN 'male' THEN 0
                WHEN 'female' THEN 1
                WHEN 'unisex' THEN 2
                ELSE 3
            END,
            LOWER(TRIM(p.fragrance_gender))
        "#,
    )
    .bind(query.category.as_deref())
    .bind(query.search.as_deref())
    .fetch_all(pool)
    .await?;

    Ok(ProductFiltersResponse {
        brands,
        volumes,
        genders,
    })
}

pub async fn find_search_suggestions(
    pool: &PgPool,
    search: &str,
    limit: i64,
) -> Result<Vec<ProductSearchSuggestion>, AppError> {
    let keyword = search.trim();
    if keyword.is_empty() {
        return Ok(vec![]);
    }

    let safe_limit = limit.clamp(1, 12);

    let suggestions = sqlx::query_as::<_, ProductSearchSuggestion>(
        r#"
        SELECT
            p.id,
            p.slug,
            p.name,
            p.image_url,
            p.brand,
            COALESCE(display_variant.display_price, p.price) AS price
        FROM products p
        LEFT JOIN LATERAL (
            SELECT pv.price AS display_price
            FROM product_variants pv
            WHERE pv.product_id = p.id
            ORDER BY
                CASE
                    WHEN pv.ml = 100 THEN 0
                    ELSE 1
                END,
                ABS(pv.ml - 100),
                pv.ml
            LIMIT 1
        ) AS display_variant ON TRUE
        WHERE
            p.name ILIKE '%' || $1 || '%'
            OR COALESCE(p.brand, '') ILIKE '%' || $1 || '%'
        ORDER BY
            CASE
                WHEN LOWER(TRIM(p.name)) = LOWER(TRIM($1)) THEN 0
                WHEN LOWER(TRIM(p.name)) LIKE LOWER(TRIM($1)) || '%' THEN 1
                ELSE 2
            END,
            p.created_at DESC
        LIMIT $2
        "#,
    )
    .bind(keyword)
    .bind(safe_limit)
    .fetch_all(pool)
    .await?;

    Ok(suggestions)
}

/// Fetch a single product by its slug.
pub async fn find_by_slug(pool: &PgPool, slug: &str) -> Result<Option<Product>, AppError> {
    let product = sqlx::query_as::<_, Product>(
        r#"
        SELECT id, category_id, name, slug, price, original_price,
               image_url, images, badge, description, top_note, mid_note, base_note, care,
               rating::float8 AS rating,
               review_count, in_stock, stock,
               brand, concentration, fragrance_gender, homepage_section, fragrance_line,
               created_at
        FROM products
        WHERE slug = $1
        "#,
    )
    .bind(slug)
    .fetch_optional(pool)
    .await?;

    Ok(product)
}

/// Fetch variants for a product, sorted by ml ascending.
pub async fn find_variants_by_product(
    pool: &PgPool,
    product_id: Uuid,
) -> Result<Vec<ProductVariant>, AppError> {
    let variants = sqlx::query_as::<_, ProductVariant>(
        r#"
        SELECT id, product_id, ml, price, original_price, stock, is_default, created_at
        FROM product_variants
        WHERE product_id = $1
        ORDER BY ml ASC
        "#,
    )
    .bind(product_id)
    .fetch_all(pool)
    .await?;
    Ok(variants)
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
    let product = sqlx::query_as::<_, Product>(
        r#"
        SELECT id, category_id, name, slug, price, original_price,
               image_url, images, badge, description, top_note, mid_note, base_note, care,
               rating::float8 AS rating,
               review_count, in_stock, stock,
               brand, concentration, fragrance_gender, homepage_section, fragrance_line,
               created_at
        FROM products
        WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(pool)
    .await?;
    Ok(product)
}

/// Fetch a single variant by id (used during order creation).
pub async fn find_variant_by_id(
    pool: &PgPool,
    variant_id: Uuid,
) -> Result<Option<ProductVariant>, AppError> {
    let v = sqlx::query_as::<_, ProductVariant>(
        r#"
        SELECT id, product_id, ml, price, original_price, stock, is_default, created_at
        FROM product_variants WHERE id = $1
        "#,
    )
    .bind(variant_id)
    .fetch_optional(pool)
    .await?;
    Ok(v)
}

// ─── Admin CRUD ───────────────────────────────────────────────────────────────

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

async fn sync_product_images(
    pool: &PgPool,
    product_id: Uuid,
    images: &[String],
) -> Result<(), AppError> {
    sqlx::query("DELETE FROM product_images WHERE product_id = $1")
        .bind(product_id)
        .execute(pool)
        .await?;

    for (idx, url) in images.iter().enumerate() {
        sqlx::query(
            r#"
            INSERT INTO product_images (product_id, image_url, position)
            VALUES ($1, $2, $3)
            "#,
        )
        .bind(product_id)
        .bind(url)
        .bind(idx as i32)
        .execute(pool)
        .await?;
    }

    Ok(())
}

/// Upsert variants for a product (delete removed, insert/update kept).
/// Also updates products.price / in_stock / stock to reflect the cheapest variant.
pub async fn upsert_variants(
    pool: &PgPool,
    product_id: Uuid,
    variants: &[VariantInput],
) -> Result<Vec<ProductVariant>, AppError> {
    if variants.is_empty() {
        return find_variants_by_product(pool, product_id).await;
    }

    // Ensure exactly one default
    let has_default = variants.iter().any(|v| v.is_default);
    let mut variants_owned: Vec<VariantInput> = variants.to_vec();
    if !has_default {
        if let Some(first) = variants_owned.first_mut() {
            first.is_default = true;
        }
    }

    // Collect the ml sizes being submitted — delete any that are not in the list.
    let submitted_mls: Vec<i32> = variants_owned.iter().map(|v| v.ml).collect();
    sqlx::query("DELETE FROM product_variants WHERE product_id = $1 AND ml != ALL($2)")
        .bind(product_id)
        .bind(&submitted_mls)
        .execute(pool)
        .await?;

    // Reset all existing defaults first to avoid partial unique index conflict
    sqlx::query("UPDATE product_variants SET is_default = FALSE WHERE product_id = $1")
        .bind(product_id)
        .execute(pool)
        .await?;

    // UPSERT each variant
    for v in &variants_owned {
        sqlx::query(
            r#"
            INSERT INTO product_variants (product_id, ml, price, original_price, stock, is_default)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (product_id, ml) DO UPDATE SET
                price          = EXCLUDED.price,
                original_price = EXCLUDED.original_price,
                stock          = EXCLUDED.stock,
                is_default     = EXCLUDED.is_default
            "#,
        )
        .bind(product_id)
        .bind(v.ml)
        .bind(v.price)
        .bind(v.original_price)
        .bind(v.stock)
        .bind(v.is_default)
        .execute(pool)
        .await?;
    }

    // Keep products.price = cheapest variant price and update stock/in_stock aggregate
    sqlx::query(
        r#"
        UPDATE products SET
            price    = (SELECT MIN(price) FROM product_variants WHERE product_id = $1),
            stock    = (SELECT COALESCE(SUM(stock), 0) FROM product_variants WHERE product_id = $1),
            in_stock = (SELECT COALESCE(SUM(stock), 0) > 0 FROM product_variants WHERE product_id = $1)
        WHERE id = $1
        "#,
    )
    .bind(product_id)
    .execute(pool)
    .await?;

    find_variants_by_product(pool, product_id).await
}

/// Patch a single variant's stock level.
pub async fn update_variant_stock(
    pool: &PgPool,
    variant_id: Uuid,
    input: &UpdateStockInput,
) -> Result<ProductVariant, AppError> {
    let rows = sqlx::query("UPDATE product_variants SET stock = $2 WHERE id = $1")
        .bind(variant_id)
        .bind(input.stock)
        .execute(pool)
        .await?;

    if rows.rows_affected() == 0 {
        return Err(AppError::NotFound(format!(
            "Variant {variant_id} not found"
        )));
    }

    // Re-sync products.stock / in_stock
    sqlx::query(
        r#"
        UPDATE products SET
            stock    = (SELECT COALESCE(SUM(stock), 0) FROM product_variants WHERE product_id = (SELECT product_id FROM product_variants WHERE id = $1)),
            in_stock = (SELECT COALESCE(SUM(stock), 0) > 0 FROM product_variants WHERE product_id = (SELECT product_id FROM product_variants WHERE id = $1))
        WHERE id = (SELECT product_id FROM product_variants WHERE id = $1)
        "#,
    )
    .bind(variant_id)
    .execute(pool)
    .await?;

    find_variant_by_id(pool, variant_id)
        .await?
        .ok_or_else(|| AppError::Internal("Variant disappeared after update".into()))
}

/// Admin inventory list — all variants with product name.
pub async fn get_inventory_list(pool: &PgPool) -> Result<Vec<InventoryRow>, AppError> {
    #[derive(sqlx::FromRow)]
    struct Row {
        variant_id: Uuid,
        product_id: Uuid,
        product_name: String,
        brand: Option<String>,
        ml: i32,
        price: i64,
        original_price: Option<i64>,
        stock: i32,
    }

    let rows = sqlx::query_as::<_, Row>(
        r#"
        SELECT
            pv.id      AS variant_id,
            p.id       AS product_id,
            p.name     AS product_name,
            p.brand,
            pv.ml,
            pv.price,
            pv.original_price,
            pv.stock
        FROM product_variants pv
        JOIN products p ON p.id = pv.product_id
        ORDER BY p.name ASC, pv.ml ASC
        "#,
    )
    .fetch_all(pool)
    .await?;

    Ok(rows
        .into_iter()
        .map(|r| InventoryRow {
            variant_id: r.variant_id,
            product_id: r.product_id,
            product_name: r.product_name,
            brand: r.brand,
            ml: r.ml,
            price: r.price,
            original_price: r.original_price,
            stock: r.stock,
        })
        .collect())
}

/// Fetch a single AdminProduct by id (used after create/update).
pub async fn find_admin_by_id(pool: &PgPool, id: Uuid) -> Result<Option<AdminProduct>, AppError> {
    let product = sqlx::query_as::<_, AdminProduct>(
        r#"
        SELECT p.id, p.category_id, c.name AS category_name, p.name, p.slug,
               p.price, p.original_price, p.image_url, p.images, p.badge, p.description,
               p.top_note, p.mid_note, p.base_note, p.care,
               p.in_stock, p.stock,
               p.brand, p.concentration, p.fragrance_gender, p.homepage_section, p.fragrance_line,
               p.created_at
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
               p.price, p.original_price, p.image_url, p.images, p.badge, p.description,
               p.top_note, p.mid_note, p.base_note, p.care,
               p.in_stock, p.stock,
               p.brand, p.concentration, p.fragrance_gender, p.homepage_section, p.fragrance_line,
               p.created_at
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
    Ok(PaginatedResponse {
        items,
        total,
        page: query.page,
        limit: query.limit,
        total_pages,
    })
}

/// Create a new product (and optional variants) and return the full AdminProduct.
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
    let stock = input.stock.unwrap_or(0);
    let images = input.images.clone().unwrap_or_default();

    // If variants provided, derive price from the cheapest variant.
    let price = if !input.variants.is_empty() {
        input
            .variants
            .iter()
            .map(|v| v.price)
            .min()
            .unwrap_or(input.price.unwrap_or(0))
    } else {
        input.price.unwrap_or(0)
    };

    let id = sqlx::query_scalar::<_, Uuid>(
        r#"
        INSERT INTO products
            (category_id, name, slug, price, original_price, image_url, images,
             badge, description, top_note, mid_note, base_note, care, in_stock, stock,
             brand, concentration, fragrance_gender, homepage_section, fragrance_line)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        RETURNING id
        "#,
    )
    .bind(input.category_id)
    .bind(&input.name)
    .bind(&slug)
    .bind(price)
    .bind(input.original_price)
    .bind(&input.image_url)
    .bind(&images)
    .bind(&input.badge)
    .bind(&input.description)
    .bind(&input.top_note)
    .bind(&input.mid_note)
    .bind(&input.base_note)
    .bind(&input.care)
    .bind(in_stock)
    .bind(stock)
    .bind(&input.brand)
    .bind(&input.concentration)
    .bind(&input.fragrance_gender)
    .bind(&input.homepage_section)
    .bind(&input.fragrance_line)
    .fetch_one(pool)
    .await?;

    if !input.variants.is_empty() {
        upsert_variants(pool, id, &input.variants).await?;
    }

    sync_product_images(pool, id, &images).await?;

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
    // Derive price if variants are being submitted
    let price = if !input.variants.is_empty() {
        input
            .variants
            .iter()
            .map(|v| v.price)
            .min()
            .unwrap_or(input.price)
    } else {
        input.price
    };

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
            top_note       = $11,
            mid_note       = $12,
            base_note      = $13,
            care           = $14,
            in_stock       = $15,
            stock          = $16,
            brand          = $17,
            concentration  = $18,
            fragrance_gender = $19,
            homepage_section = $20,
            fragrance_line   = $21
        WHERE id = $1
        "#,
    )
    .bind(id)
    .bind(input.category_id)
    .bind(&input.name)
    .bind(&input.slug)
    .bind(price)
    .bind(input.original_price)
    .bind(&input.image_url)
    .bind(&input.images)
    .bind(&input.badge)
    .bind(&input.description)
    .bind(&input.top_note)
    .bind(&input.mid_note)
    .bind(&input.base_note)
    .bind(&input.care)
    .bind(input.in_stock)
    .bind(input.stock)
    .bind(&input.brand)
    .bind(&input.concentration)
    .bind(&input.fragrance_gender)
    .bind(&input.homepage_section)
    .bind(&input.fragrance_line)
    .execute(pool)
    .await?;

    if rows.rows_affected() == 0 {
        return Err(AppError::NotFound(format!("Product {id} not found")));
    }

    if !input.variants.is_empty() {
        upsert_variants(pool, id, &input.variants).await?;
    }

    sync_product_images(pool, id, &input.images).await?;

    find_admin_by_id(pool, id)
        .await?
        .ok_or_else(|| AppError::Internal("Failed to fetch updated product".into()))
}

/// Reorder gallery images (`products.images`) by replacing with the provided order.
pub async fn reorder_product_images(
    pool: &PgPool,
    id: Uuid,
    images: &[String],
) -> Result<AdminProduct, AppError> {
    let rows = sqlx::query(
        r#"
        UPDATE products
        SET images = $2
        WHERE id = $1
        "#,
    )
    .bind(id)
    .bind(images)
    .execute(pool)
    .await?;

    if rows.rows_affected() == 0 {
        return Err(AppError::NotFound(format!("Product {id} not found")));
    }

    sync_product_images(pool, id, images).await?;

    find_admin_by_id(pool, id)
        .await?
        .ok_or_else(|| AppError::Internal("Failed to fetch reordered product".into()))
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
///
/// If `slug` is missing or empty, it is auto-generated from `name` via `slugify`.
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

/// Update category fields by `id` and return the updated row.
///
/// Returns `NotFound` when the category does not exist.
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

    let rows =
        sqlx::query("UPDATE categories SET name = $2, slug = $3, image_url = $4 WHERE id = $1")
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

/// Return up to `limit` related products for a given product slug.
/// Strategy: same brand (if product has a brand) → fallback same category.
/// Excludes the product itself. Sorted by best-selling then newest.
pub async fn find_related(
    pool: &PgPool,
    slug: &str,
    limit: i64,
) -> Result<Vec<ProductPublic>, AppError> {
    // First fetch the product so we know its id, category_id, brand
    let product = match find_by_slug(pool, slug).await? {
        Some(p) => p,
        None => return Ok(vec![]),
    };

    let sql = r#"
        WITH sales AS (
            SELECT product_id, SUM(quantity)::BIGINT AS total_sold
            FROM order_items GROUP BY product_id
        )
        SELECT
            p.id, p.category_id, p.name, p.slug, p.price, p.original_price,
            p.image_url, p.images, p.badge, p.description,
            p.top_note, p.mid_note, p.base_note, p.care,
            p.rating::float8 AS rating,
            p.review_count, p.in_stock, p.stock,
            p.brand, p.concentration, p.fragrance_gender, p.homepage_section, p.fragrance_line, p.created_at
        FROM products p
        LEFT JOIN sales ON sales.product_id = p.id
        WHERE p.id <> $1
          AND (
              -- Prefer same brand when brand is not null
              ($2::TEXT IS NOT NULL AND p.brand = $2)
              -- Fallback: same category
              OR p.category_id = $3
          )
        ORDER BY
            -- Same-brand rows first
            CASE WHEN $2::TEXT IS NOT NULL AND p.brand = $2 THEN 0 ELSE 1 END ASC,
            COALESCE(sales.total_sold, 0) DESC,
            p.created_at DESC
        LIMIT $4
    "#;

    let items = sqlx::query_as::<_, Product>(sql)
        .bind(product.id)
        .bind(product.brand.as_deref())
        .bind(product.category_id)
        .bind(limit)
        .fetch_all(pool)
        .await?;

    let product_ids: Vec<Uuid> = items.iter().map(|p| p.id).collect();
    let all_variants = sqlx::query_as::<_, ProductVariant>(
        "SELECT id, product_id, ml, price, original_price, stock, is_default, created_at
         FROM product_variants WHERE product_id = ANY($1::uuid[]) ORDER BY ml ASC",
    )
    .bind(&product_ids)
    .fetch_all(pool)
    .await?;

    let mut variants_map: std::collections::HashMap<Uuid, Vec<ProductVariant>> =
        std::collections::HashMap::new();
    for v in all_variants {
        variants_map.entry(v.product_id).or_default().push(v);
    }

    let result = items
        .into_iter()
        .map(|p| {
            let id = p.id;
            let mut pub_prod = ProductPublic::from(p);
            pub_prod.variants = variants_map.remove(&id).unwrap_or_default();
            pub_prod
        })
        .collect();

    Ok(result)
}

/// Delete a category by `id`.
///
/// Deletion is blocked while products still belong to this category.
pub async fn delete_category(pool: &PgPool, id: Uuid) -> Result<(), AppError> {
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM products WHERE category_id = $1")
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
