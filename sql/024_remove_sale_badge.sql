-- 024_remove_sale_badge.sql
-- Remove legacy sale/deal badges from products so the storefront no longer
-- exposes a dedicated "deal" section or backend filter for them.

UPDATE products
SET badge = NULL
WHERE LOWER(TRIM(COALESCE(badge, ''))) IN ('sale', 'giảm giá', 'giam gia', 'giam-gia');
