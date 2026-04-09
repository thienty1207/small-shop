-- 015_hero_slides_settings.sql
-- Add hero slide settings (up to 3 slides) and ensure store contact info keys exist.

-- Store contact info (idempotent — won't overwrite existing values)
INSERT INTO shop_settings (key, value) VALUES ('store_email',   'hello@handmadehaven.vn')          ON CONFLICT (key) DO NOTHING;
INSERT INTO shop_settings (key, value) VALUES ('store_address', '123 Đường Lê Lợi, Quận 1, TP.HCM') ON CONFLICT (key) DO NOTHING;
INSERT INTO shop_settings (key, value) VALUES ('social_facebook',  '') ON CONFLICT (key) DO NOTHING;
INSERT INTO shop_settings (key, value) VALUES ('social_instagram', '') ON CONFLICT (key) DO NOTHING;
INSERT INTO shop_settings (key, value) VALUES ('social_tiktok',    '') ON CONFLICT (key) DO NOTHING;

-- Hero slide 1
INSERT INTO shop_settings (key, value) VALUES ('hero_slide_1_img',      '') ON CONFLICT (key) DO NOTHING;
INSERT INTO shop_settings (key, value) VALUES ('hero_slide_1_title',    '') ON CONFLICT (key) DO NOTHING;
INSERT INTO shop_settings (key, value) VALUES ('hero_slide_1_subtitle', '') ON CONFLICT (key) DO NOTHING;
INSERT INTO shop_settings (key, value) VALUES ('hero_slide_1_cta',      '') ON CONFLICT (key) DO NOTHING;
INSERT INTO shop_settings (key, value) VALUES ('hero_slide_1_href',     '') ON CONFLICT (key) DO NOTHING;

-- Hero slide 2
INSERT INTO shop_settings (key, value) VALUES ('hero_slide_2_img',      '') ON CONFLICT (key) DO NOTHING;
INSERT INTO shop_settings (key, value) VALUES ('hero_slide_2_title',    '') ON CONFLICT (key) DO NOTHING;
INSERT INTO shop_settings (key, value) VALUES ('hero_slide_2_subtitle', '') ON CONFLICT (key) DO NOTHING;
INSERT INTO shop_settings (key, value) VALUES ('hero_slide_2_cta',      '') ON CONFLICT (key) DO NOTHING;
INSERT INTO shop_settings (key, value) VALUES ('hero_slide_2_href',     '') ON CONFLICT (key) DO NOTHING;

-- Hero slide 3
INSERT INTO shop_settings (key, value) VALUES ('hero_slide_3_img',      '') ON CONFLICT (key) DO NOTHING;
INSERT INTO shop_settings (key, value) VALUES ('hero_slide_3_title',    '') ON CONFLICT (key) DO NOTHING;
INSERT INTO shop_settings (key, value) VALUES ('hero_slide_3_subtitle', '') ON CONFLICT (key) DO NOTHING;
INSERT INTO shop_settings (key, value) VALUES ('hero_slide_3_cta',      '') ON CONFLICT (key) DO NOTHING;
INSERT INTO shop_settings (key, value) VALUES ('hero_slide_3_href',     '') ON CONFLICT (key) DO NOTHING;
