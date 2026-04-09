-- Test: verify contact_messages table schema is correct
-- Run manually with psql or in CI/CD pipeline

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'contact_messages'
ORDER BY ordinal_position;

-- Expected columns:
-- id          | uuid                        | NO
-- name        | text                        | NO
-- email       | text                        | NO
-- phone       | text                        | YES
-- message     | text                        | NO
-- ip_address  | text                        | YES
-- created_at  | timestamp with time zone    | NO

-- Test insert + retrieval
INSERT INTO contact_messages (id, name, email, phone, message, ip_address)
VALUES (
    gen_random_uuid(),
    'Test User',
    'test@example.com',
    '0901234567',
    'This is a test message for schema validation.',
    '127.0.0.1'
)
RETURNING id, name, email, phone, message, ip_address, created_at;

-- Clean up test row
DELETE FROM contact_messages WHERE email = 'test@example.com';
