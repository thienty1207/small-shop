-- Migration 011: Add stock column to products table
-- This column tracks inventory count for admin management.
ALTER TABLE products
    ADD COLUMN IF NOT EXISTS stock INTEGER NOT NULL DEFAULT 0;
