/**
 * ContractIQ Authentication Hardening
 * Users are created manually by an active superuser. Public registration is not supported.
 */

BEGIN;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS is_superuser BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP,
    ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (lower(email));
CREATE INDEX IF NOT EXISTS idx_users_superuser_active ON users (is_superuser, is_active);

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
    'admin@redmps.com',
    'System',
    'Administrator',
    crypt('ChangeMe!2026', gen_salt('bf', 12)),
    r.id,
    true,
    true,
    true,
    CURRENT_TIMESTAMP
FROM roles r
WHERE r.name = 'Administrator'
  AND NOT EXISTS (
      SELECT 1 FROM users u WHERE lower(u.email) = lower('admin@redmps.com')
  );

CREATE OR REPLACE FUNCTION create_user_as_superuser(
    p_actor_user_id UUID,
    p_email TEXT,
    p_first_name TEXT,
    p_last_name TEXT,
    p_role_id UUID,
    p_department_id UUID,
    p_temp_password TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_user_id UUID;
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM users
        WHERE id = p_actor_user_id
          AND is_active = true
          AND is_superuser = true
    ) THEN
        RAISE EXCEPTION 'Only an active superuser can create users';
    END IF;

    IF p_temp_password IS NULL OR length(p_temp_password) < 12 THEN
        RAISE EXCEPTION 'Temporary password must be at least 12 characters';
    END IF;

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
        created_by,
        password_changed_at
    )
    VALUES (
        lower(trim(p_email)),
        trim(p_first_name),
        trim(p_last_name),
        crypt(p_temp_password, gen_salt('bf', 12)),
        p_role_id,
        p_department_id,
        true,
        false,
        true,
        p_actor_user_id,
        CURRENT_TIMESTAMP
    )
    RETURNING id INTO v_new_user_id;

    RETURN v_new_user_id;
END;
$$;

COMMENT ON FUNCTION create_user_as_superuser(UUID, TEXT, TEXT, TEXT, UUID, UUID, TEXT)
IS 'Creates application users. Call only from authenticated admin tooling/API; public registration is intentionally unsupported.';

COMMIT;
