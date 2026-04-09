-- Add phone number and address fields to users table
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS phone   VARCHAR(20),
    ADD COLUMN IF NOT EXISTS address TEXT;
