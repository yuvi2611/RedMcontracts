/**
 * ContractIQ — Add Yuvaan Pather as Administrator
 *
 * yuvi.pather@gmail.com  |  Administrator (superuser)
 * Temp password: ChangeMe!2026
 * force_password_change: false  (can log in immediately without reset)
 */

BEGIN;

-- Ensure Administrator role exists
INSERT INTO roles (name, description, permissions, is_system_role, is_active)
VALUES (
    'Administrator',
    'Full system access including user management and settings.',
    '{
        "contracts.create": true,
        "contracts.view": true,
        "contracts.edit": true,
        "employees.create": true,
        "employees.view": true,
        "templates.view": true,
        "templates.edit": true,
        "analytics.view": true,
        "audit.view": true,
        "approvals.approve": true,
        "users.manage": true,
        "settings.manage": true
    }',
    true,
    true
)
ON CONFLICT (name) DO UPDATE
SET is_active  = true,
    updated_at = CURRENT_TIMESTAMP;

-- Insert Yuvaan Pather — only if not already present
INSERT INTO users (
    email,
    first_name,
    last_name,
    password_hash,
    role_id,
    is_active,
    is_superuser,
    force_password_change,
    password_changed_at
)
SELECT
    'yuvi.pather@gmail.com',
    'Yuvaan',
    'Pather',
    crypt('ChangeMe!2026', gen_salt('bf', 12)),
    r.id,
    true,
    true,
    false,
    CURRENT_TIMESTAMP
FROM roles r
WHERE r.name = 'Administrator'
  AND NOT EXISTS (
      SELECT 1 FROM users WHERE lower(email) = 'yuvi.pather@gmail.com'
  );

-- Verify
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE lower(email) = 'yuvi.pather@gmail.com' AND is_active = true) THEN
        RAISE EXCEPTION 'Yuvaan Pather account was not created — check Administrator role exists';
    END IF;
    RAISE NOTICE 'yuvi.pather@gmail.com created OK (superuser=true, force_password_change=false)';
END;
$$;

COMMIT;
