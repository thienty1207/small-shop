-- 036_normalize_brand_labels.sql
-- Normalize common brand label variants so client brand facet is not fragmented.

-- 1) Trim and collapse whitespace.
UPDATE products
SET brand = NULLIF(REGEXP_REPLACE(TRIM(COALESCE(brand, '')), '\\s+', ' ', 'g'), '')
WHERE brand IS NOT NULL;

-- 2) Canonicalize known variants.
UPDATE products
SET brand = CASE
  WHEN brand ~* '^gio\\s+armani$' THEN 'Giorgio Armani'
  WHEN brand ~* '^giorgio\\s+armani$' THEN 'Giorgio Armani'
  WHEN brand ~* '^parfums?\\s+de\\s+marly(\\s+paris)?$' THEN 'Parfums de Marly'
  WHEN brand ~* '^ysl$' THEN 'Yves Saint Laurent'
  ELSE brand
END
WHERE brand IS NOT NULL;
