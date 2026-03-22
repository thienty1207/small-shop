-- 025_add_homepage_section_to_products.sql
-- Add optional homepage section selector for curated homepage fragrance sections.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS homepage_section TEXT;

UPDATE products
SET homepage_section = CASE LOWER(TRIM(COALESCE(homepage_section, '')))
  WHEN 'male' THEN 'male'
  WHEN 'nam' THEN 'male'
  WHEN 'female' THEN 'female'
  WHEN 'nu' THEN 'female'
  WHEN 'nữ' THEN 'female'
  WHEN 'unisex' THEN 'unisex'
  ELSE NULL
END;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'products_homepage_section_check'
  ) THEN
    ALTER TABLE products
      ADD CONSTRAINT products_homepage_section_check
      CHECK (homepage_section IS NULL OR homepage_section IN ('male', 'female', 'unisex'));
  END IF;
END $$;
