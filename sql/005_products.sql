-- 005_products.sql
-- Create products table and seed with real data

CREATE TABLE IF NOT EXISTS products (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id    UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    name           TEXT NOT NULL,
    slug           TEXT NOT NULL UNIQUE,
    price          BIGINT NOT NULL,       -- in VND (no decimals)
    original_price BIGINT,                -- NULL means no discount
    image_url      TEXT NOT NULL,
    images         TEXT[] NOT NULL DEFAULT '{}',
    badge          TEXT,                  -- e.g. "Mới", "Bán Chạy", "Giảm Giá"
    description    TEXT,
    material       TEXT,
    care           TEXT,
    rating         NUMERIC(2,1) NOT NULL DEFAULT 5.0,
    review_count   INT NOT NULL DEFAULT 0,
    in_stock       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed with 3 real products (IDs referenced later for variants)
INSERT INTO products (id, category_id, name, slug, price, original_price, image_url, images, badge, description, material, care, rating, review_count)
SELECT
    gen_random_uuid(),
    c.id,
    'Nến Thơm Lavender Handmade',
    'nen-thom-lavender-handmade',
    185000,
    220000,
    '/assets/products/nen-lavender.jpg',
    ARRAY['/assets/products/nen-lavender.jpg', '/assets/products/nen-lavender-2.jpg'],
    'Bán Chạy',
    'Nến thơm handmade từ sáp đậu nành tự nhiên, hương lavender nhẹ nhàng giúp thư giãn tinh thần. Thời gian cháy khoảng 40-50 tiếng.',
    'Sáp đậu nành 100% tự nhiên, bấc cotton không chứa chì',
    'Để xa tầm tay trẻ em. Không để gần vật dễ cháy. Cắt bấc 5mm trước khi thắp.',
    4.9,
    128
FROM categories c WHERE c.slug = 'nen-thom'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (id, category_id, name, slug, price, original_price, image_url, images, badge, description, material, care, rating, review_count)
SELECT
    gen_random_uuid(),
    c.id,
    'Túi Tote Canvas Thêu Tay',
    'tui-tote-canvas-theu-tay',
    320000,
    NULL,
    '/assets/products/tui-tote.jpg',
    ARRAY['/assets/products/tui-tote.jpg', '/assets/products/tui-tote-2.jpg'],
    'Mới',
    'Túi tote vải canvas dày dặn, được thêu tay theo yêu cầu. Có thể mang đi học, đi chợ hoặc đi chơi. Kích thước: 38×42cm.',
    'Vải canvas 12oz, chỉ thêu cotton cao cấp',
    'Giặt tay với nước lạnh. Không sấy khô máy. Phơi bóng mát.',
    4.8,
    73
FROM categories c WHERE c.slug = 'tui-vai'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (id, category_id, name, slug, price, original_price, image_url, images, badge, description, material, care, rating, review_count)
SELECT
    gen_random_uuid(),
    c.id,
    'Vòng Tay Đá Thạch Anh Hồng',
    'vong-tay-da-thach-anh-hong',
    250000,
    280000,
    '/assets/products/vong-thach-anh.jpg',
    ARRAY['/assets/products/vong-thach-anh.jpg', '/assets/products/vong-thach-anh-2.jpg'],
    'Giảm Giá',
    'Vòng tay đá thạch anh hồng tự nhiên, mang lại may mắn và bình an. Mỗi viên đá được chọn lọc kỹ càng, xâu bằng dây đàn hồi cao cấp.',
    'Đá thạch anh hồng tự nhiên, dây đàn hồi cao cấp, khóa bạc 925',
    'Tránh tiếp xúc với nước hoa, hóa chất. Bảo quản trong hộp riêng khi không đeo.',
    4.7,
    95
FROM categories c WHERE c.slug = 'trang-suc'
ON CONFLICT (slug) DO NOTHING;
