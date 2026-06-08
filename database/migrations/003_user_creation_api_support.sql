/**
 * ContractIQ User Creation API Support
 * Adds reference data expected by the create-user UI and expands the DB function
 * so new accounts are written to public.users with audit coverage.
 */

BEGIN;

INSERT INTO roles (id, name, description, permissions, is_system_role, is_active)
VALUES
('11111111-1111-1111-1111-111111111116', 'HR Officer', 'Generate contracts and view templates', '{"contracts.create": true, "contracts.view": true, "templates.view": true}', true, true),
('11111111-1111-1111-1111-111111111117', 'Director', 'Review and approve director-stage contract workflows', '{"contracts.view": true, "approvals.approve": true}', true, true)
ON CONFLICT (name) DO UPDATE
SET description = EXCLUDED.description,
    permissions = EXCLUDED.permissions,
    is_active = true,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO departments (id, name, code, description, is_active)
VALUES
('22222222-2222-2222-2222-222222222301', 'Human Resources', 'hr', 'People operations and contract administration', true),
('22222222-2222-2222-2222-222222222302', 'Finance', 'finance', 'Finance and payroll operations', true),
('22222222-2222-2222-2222-222222222303', 'Operations', 'operations', 'Business operations', true),
('22222222-2222-2222-2222-222222222304', 'Information Technology', 'it', 'Internal systems and technology', true),
('22222222-2222-2222-2222-222222222305', 'Legal & Compliance', 'legal', 'Legal, governance, and compliance', true),
('22222222-2222-2222-2222-222222222306', 'Executive', 'executive', 'Executive leadership', true)
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_active = true,
    updated_at = CURRENT_TIMESTAMP;

CREATE OR REPLACE FUNCTION create_user_as_superuser(
    p_actor_user_id UUID,
    p_email TEXT,
    p_first_name TEXT,
    p_last_name TEXT,
    p_phone TEXT,
    p_role_id UUID,
    p_department_id UUID,
    p_temp_password TEXT,
    p_force_password_change BOOLEAN DEFAULT true,
    p_is_active BOOLEAN DEFAULT true,
    p_is_superuser BOOLEAN DEFAULT false
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
        phone,
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
        nullif(trim(p_phone), ''),
        crypt(p_temp_password, gen_salt('bf', 12)),
        p_role_id,
        p_department_id,
        coalesce(p_is_active, true),
        coalesce(p_is_superuser, false),
        coalesce(p_force_password_change, true),
        p_actor_user_id,
        CURRENT_TIMESTAMP
    )
    RETURNING id INTO v_new_user_id;

    INSERT INTO audit_logs (
        entity_type,
        entity_id,
        action,
        new_values,
        changed_by,
        change_reason
    )
    VALUES (
        'User',
        v_new_user_id,
        'Create',
        jsonb_build_object(
            'email', lower(trim(p_email)),
            'first_name', trim(p_first_name),
            'last_name', trim(p_last_name),
            'role_id', p_role_id,
            'department_id', p_department_id,
            'is_active', coalesce(p_is_active, true),
            'is_superuser', coalesce(p_is_superuser, false),
            'force_password_change', coalesce(p_force_password_change, true)
        ),
        p_actor_user_id,
        'Created by superuser'
    );

    RETURN v_new_user_id;
END;
$$;

COMMENT ON FUNCTION create_user_as_superuser(UUID, TEXT, TEXT, TEXT, TEXT, UUID, UUID, TEXT, BOOLEAN, BOOLEAN, BOOLEAN)
IS 'Creates application users from authenticated admin tooling/API; public registration is intentionally unsupported.';

COMMIT;
