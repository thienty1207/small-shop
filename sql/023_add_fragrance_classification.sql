-- 023_add_fragrance_classification.sql
-- Add required perfume classification fields to products

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS fragrance_gender TEXT,
  ADD COLUMN IF NOT EXISTS fragrance_line   TEXT;

UPDATE products
SET
  fragrance_gender = CASE LOWER(TRIM(COALESCE(fragrance_gender, '')))
    WHEN 'male' THEN 'male'
    WHEN 'nam' THEN 'male'
    WHEN 'female' THEN 'female'
    WHEN 'nu' THEN 'female'
    WHEN 'nữ' THEN 'female'
    WHEN 'unisex' THEN 'unisex'
    ELSE 'unisex'
  END,
  fragrance_line = CASE LOWER(TRIM(COALESCE(fragrance_line, '')))
    WHEN 'designer' THEN 'designer'
    WHEN 'niche' THEN 'niche'
    WHEN 'clone' THEN 'clone'
    ELSE 'designer'
  END;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'products_fragrance_gender_check'
  ) THEN
    ALTER TABLE products
      ADD CONSTRAINT products_fragrance_gender_check
      CHECK (fragrance_gender IN ('male', 'female', 'unisex'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'products_fragrance_line_check'
  ) THEN
    ALTER TABLE products
      ADD CONSTRAINT products_fragrance_line_check
      CHECK (fragrance_line IN ('designer', 'niche', 'clone'));
  END IF;
END $$;

ALTER TABLE products
  ALTER COLUMN fragrance_gender SET NOT NULL,
  ALTER COLUMN fragrance_line SET NOT NULL;
