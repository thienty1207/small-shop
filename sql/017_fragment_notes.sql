-- 017_fragment_notes.sql
-- Split the single `material` (hương liệu) column into 3 separate note columns
-- for perfume-specific fragrance pyramid: top / middle / base notes.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS top_note TEXT,
  ADD COLUMN IF NOT EXISTS mid_note TEXT,
  ADD COLUMN IF NOT EXISTS base_note TEXT;

-- Migrate existing data: copy old material value into top_note as-is
-- (admin can redistribute to mid/base via the form)
UPDATE products
  SET top_note = material
  WHERE material IS NOT NULL AND material <> '';
