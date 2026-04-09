-- Migration 014: Shop settings key-value store
CREATE TABLE IF NOT EXISTS shop_settings (
    key        VARCHAR(100) PRIMARY KEY,
    value      TEXT         NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

INSERT INTO shop_settings (key, value) VALUES
    ('store_name',            'Handmade Haven'),
    ('store_email',           ''),
    ('store_phone',           ''),
    ('store_address',         ''),
    ('store_facebook',        ''),
    ('store_instagram',       ''),
    ('store_tiktok',          ''),
    ('shipping_fee_default',  '30000'),
    ('free_shipping_from',    '500000'),
    ('hero_title',            'Quà Handmade Tuyệt Vời'),
    ('hero_subtitle',         'Được làm với tình yêu thương'),
    ('hero_image_url',        ''),
    ('banner_image_url',      ''),
    ('banner_link',           '/products'),
    ('email_footer',          'Cảm ơn bạn đã ủng hộ cửa hàng của chúng tôi!')
ON CONFLICT (key) DO NOTHING;
