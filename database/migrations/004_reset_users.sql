/**
 * ContractIQ User Reset
 * Removes all non-admin users and inserts the two production accounts.
 *
 * Tiara Ramouthar  — HR Manager  (all access except approvals)
 * Kogiela Reddy    — Director    (full access, superuser)
 *
 * Both accounts require a password change on first login.
 * Temp passwords: Tiara → RedMHR@2026!  |  Kogiela → RedMCEO@2026!
 */

BEGIN;

-- ── 1. Remove everyone except the admin account ──────────────────────────────
--    Clear FK references first so the delete doesn't violate constraints

UPDATE approval_workflows
SET approver_id = (SELECT id FROM users WHERE lower(email) = 'admin@redmps.com' LIMIT 1)
WHERE approver_id NOT IN (SELECT id FROM users WHERE lower(email) = 'admin@redmps.com');

UPDATE contracts
SET created_by = (SELECT id FROM users WHERE lower(email) = 'admin@redmps.com' LIMIT 1)
WHERE created_by NOT IN (SELECT id FROM users WHERE lower(email) = 'admin@redmps.com');

UPDATE audit_logs
SET changed_by = (SELECT id FROM users WHERE lower(email) = 'admin@redmps.com' LIMIT 1)
WHERE changed_by NOT IN (SELECT id FROM users WHERE lower(email) = 'admin@redmps.com');

DELETE FROM notifications
WHERE recipient_id NOT IN (SELECT id FROM users WHERE lower(email) = 'admin@redmps.com');

DELETE FROM users
WHERE lower(email) NOT IN ('admin@redmps.com');

-- ── 2. Ensure HR Manager role exists with correct permissions ────────────────
--    HR Manager: full contract + employee + template access, NO approvals scope

INSERT INTO roles (id, name, description, permissions, is_system_role, is_active)
VALUES (
    '11111111-1111-1111-1111-111111111114',
    'HR Manager',
    'Create and manage contracts, employees, and templates. Cannot action approval workflows.',
    '{
        "contracts.create": true,
        "contracts.view": true,
        "contracts.edit": true,
        "employees.create": true,
        "employees.view": true,
        "templates.view": true,
        "analytics.view": true,
        "audit.view": true,
        "approvals.approve": false
    }',
    true,
    true
)
ON CONFLICT (name) DO UPDATE
SET description  = EXCLUDED.description,
    permissions  = EXCLUDED.permissions,
    is_system_role = true,
    is_active    = true,
    updated_at   = CURRENT_TIMESTAMP;

-- ── 3. Ensure Director role exists with full permissions ─────────────────────

INSERT INTO roles (id, name, description, permissions, is_system_role, is_active)
VALUES (
    '11111111-1111-1111-1111-111111111117',
    'Director',
    'Full system access including contract approval and user management.',
    '{
        "contracts.create": true,
        "contracts.view": true,
        "contracts.edit": true,
        "employees.create": true,
        "employees.view": true,
        "templates.view": true,
        "analytics.view": true,
        "audit.view": true,
        "approvals.approve": true,
        "users.manage": true
    }',
    true,
    true
)
ON CONFLICT (name) DO UPDATE
SET description  = EXCLUDED.description,
    permissions  = EXCLUDED.permissions,
    is_system_role = true,
    is_active    = true,
    updated_at   = CURRENT_TIMESTAMP;

-- ── 4. Insert Tiara Ramouthar — HR Manager ───────────────────────────────────

INSERT INTO users (
    email,
    first_name,
    last_name,
    password_hash,
    role_id,
    department_id,
    is_active,
    is_superuser,
    force_password_change,
    password_changed_at
)
SELECT
    'tiara.ramouthar@redmps.com',
    'Tiara',
    'Ramouthar',
    crypt('RedMHR@2026!', gen_salt('bf', 12)),
    r.id,
    d.id,
    true,
    false,
    true,
    CURRENT_TIMESTAMP
FROM roles r
CROSS JOIN (SELECT id FROM departments WHERE code = 'hr' LIMIT 1) d
WHERE r.name = 'HR Manager'
  AND NOT EXISTS (
      SELECT 1 FROM users WHERE lower(email) = 'tiara.ramouthar@redmps.com'
  );

-- ── 5. Insert Kogiela Reddy — Director / CEO (superuser) ─────────────────────

INSERT INTO users (
    email,
    first_name,
    last_name,
    password_hash,
    role_id,
    department_id,
    is_active,
    is_superuser,
    force_password_change,
    password_changed_at
)
SELECT
    'kogiela.reddy@redmps.com',
    'Kogiela',
    'Reddy',
    crypt('RedMCEO@2026!', gen_salt('bf', 12)),
    r.id,
    d.id,
    true,
    true,
    true,
    CURRENT_TIMESTAMP
FROM roles r
CROSS JOIN (SELECT id FROM departments WHERE code = 'executive' LIMIT 1) d
WHERE r.name = 'Director'
  AND NOT EXISTS (
      SELECT 1 FROM users WHERE lower(email) = 'kogiela.reddy@redmps.com'
  );

-- ── 6. Verify ────────────────────────────────────────────────────────────────

DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count FROM users WHERE is_active = true;
    RAISE NOTICE 'Active users after migration: %', v_count;

    IF NOT EXISTS (SELECT 1 FROM users WHERE lower(email) = 'tiara.ramouthar@redmps.com') THEN
        RAISE EXCEPTION 'Tiara account was not created — check HR Manager role exists';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM users WHERE lower(email) = 'kogiela.reddy@redmps.com') THEN
        RAISE EXCEPTION 'Kogiela account was not created — check Director role exists';
    END IF;
    RAISE NOTICE 'All accounts verified OK.';
END;
$$;

COMMIT;
