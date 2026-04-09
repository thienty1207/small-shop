-- 035_backfill_product_brand_from_category.sql
-- Backfill missing product brand values from category so storefront brand filter works correctly.

-- 1) Normalize blank/whitespace brand to NULL for consistent processing.
UPDATE products
SET brand = NULLIF(TRIM(brand), '')
WHERE brand IS NOT NULL;

-- 2) Backfill brand only for rows that are still missing it.
WITH inferred AS (
  SELECT
    p.id,
    NULLIF(
      TRIM(
        REGEXP_REPLACE(
          REGEXP_REPLACE(
            COALESCE(NULLIF(TRIM(c.name), ''), INITCAP(REPLACE(c.slug, '-', ' '))),
            '^(danh\s*muc|danhmuc|category)\s*[:\-]?\s*',
            '',
            'i'
          ),
          '^(thuong\s*hieu|thương\s*hiệu|brand)\s*[:\-]?\s*',
          '',
          'i'
        )
      ),
      ''
    ) AS inferred_brand
  FROM products p
  JOIN categories c ON c.id = p.category_id
  WHERE COALESCE(TRIM(p.brand), '') = ''
)
UPDATE products p
SET brand = inferred.inferred_brand
FROM inferred
WHERE p.id = inferred.id
  AND inferred.inferred_brand IS NOT NULL;
