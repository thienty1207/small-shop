-- 004_categories.sql
-- Create categories table and seed with real data

CREATE TABLE IF NOT EXISTS categories (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT NOT NULL,
    slug       TEXT NOT NULL UNIQUE,
    image_url  TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO categories (id, name, slug, image_url) VALUES
    (gen_random_uuid(), 'Nến Thơm',  'nen-thom',  '/assets/categories/nen-thom.jpg'),
    (gen_random_uuid(), 'Túi Vải',   'tui-vai',   '/assets/categories/tui-vai.jpg'),
    (gen_random_uuid(), 'Trang Sức', 'trang-suc', '/assets/categories/trang-suc.jpg')
ON CONFLICT (slug) DO NOTHING;
