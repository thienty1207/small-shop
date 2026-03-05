-- Migration 013: Extend admin_users with role, full_name, is_active for staff management
ALTER TABLE admin_users
    ADD COLUMN IF NOT EXISTS full_name VARCHAR(255) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS role      VARCHAR(50)  NOT NULL DEFAULT 'super_admin',
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN      NOT NULL DEFAULT TRUE;
