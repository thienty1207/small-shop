-- Migration 012: Clean up invalid image_url values in categories
-- Removes URLs that are just bare filenames (not starting with http:// or /)
-- These were leftovers from the old local-upload implementation before Cloudinary

UPDATE categories
SET image_url = NULL
WHERE image_url IS NOT NULL
  AND image_url NOT LIKE 'http%'
  AND image_url NOT LIKE '/%';
