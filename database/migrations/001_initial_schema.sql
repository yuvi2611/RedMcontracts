/**
 * PostgreSQL Database Schema - Initial Migration
 * Version: 1.0
 * Date: 2026-06-05
 */

-- ============================================
-- EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    avatar_url TEXT,
    role_id UUID NOT NULL,
    department_id UUID,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    CONSTRAINT email_format CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

-- ============================================
-- ROLES TABLE
-- ============================================
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '{}',
    is_system_role BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_permissions CHECK (jsonb_typeof(permissions) = 'object')
);

-- ============================================
-- DEPARTMENTS TABLE
-- ============================================
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    manager_id UUID,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID
);

-- ============================================
-- EMPLOYEES TABLE
-- ============================================
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    date_of_birth DATE,
    id_number VARCHAR(50) UNIQUE,
    nationality VARCHAR(100),
    address VARCHAR(255),
    city VARCHAR(100),
    province VARCHAR(100),
    postal_code VARCHAR(10),
    country VARCHAR(100),
    department_id UUID,
    manager_id UUID,
    job_title VARCHAR(150),
    job_category VARCHAR(100),
    employment_status VARCHAR(50),
    hire_date DATE,
    employment_type VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    CONSTRAINT valid_status CHECK (employment_status IN ('Active', 'On Leave', 'Terminated', 'Inactive')),
    CONSTRAINT valid_type CHECK (employment_type IN ('Permanent', 'Fixed-Term', 'Contract', 'Internship', 'Consultant'))
);

-- ============================================
-- CONTRACT TYPES TABLE
-- ============================================
CREATE TABLE contract_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    code VARCHAR(50) UNIQUE NOT NULL,
    template_id UUID,
    default_duration_months INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID
);

-- ============================================
-- TEMPLATES TABLE
-- ============================================
CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    description TEXT,
    content TEXT NOT NULL,
    contract_type_id UUID NOT NULL,
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    FOREIGN KEY (contract_type_id) REFERENCES contract_types(id)
);

-- ============================================
-- CONTRACTS TABLE
-- ============================================
CREATE TABLE contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_number VARCHAR(50) UNIQUE NOT NULL,
    employee_id UUID NOT NULL,
    contract_type_id UUID NOT NULL,
    template_id UUID NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Draft',
    title VARCHAR(200),
    job_title VARCHAR(150),
    department VARCHAR(100),
    salary DECIMAL(12, 2),
    currency VARCHAR(3) DEFAULT 'ZAR',
    employment_type VARCHAR(50),
    start_date DATE NOT NULL,
    end_date DATE,
    probation_period_months INTEGER,
    notice_period_days INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMP,
    approved_at TIMESTAMP,
    signed_at TIMESTAMP,
    created_by UUID NOT NULL,
    updated_by UUID,
    CONSTRAINT valid_contract_status CHECK (status IN ('Draft', 'Review', 'Approved', 'Signed', 'Executed', 'Rejected', 'Archived')),
    CONSTRAINT valid_currency CHECK (currency ~ '^[A-Z]{3}$'),
    CONSTRAINT valid_employment_type CHECK (employment_type IN ('Permanent', 'Fixed-Term', 'Internship', 'Learnership', 'Consultant', 'Contractor')),
    CONSTRAINT salary_positive CHECK (salary > 0),
    FOREIGN KEY (employee_id) REFERENCES employees(id),
    FOREIGN KEY (contract_type_id) REFERENCES contract_types(id),
    FOREIGN KEY (template_id) REFERENCES templates(id)
);

-- ============================================
-- CONTRACT DETAILS (Key-Value Storage)
-- ============================================
CREATE TABLE contract_details (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id UUID NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    field_value TEXT,
    data_type VARCHAR(50) DEFAULT 'text',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(contract_id, field_name),
    FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE
);

-- ============================================
-- APPROVAL WORKFLOWS TABLE
-- ============================================
CREATE TABLE approval_workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id UUID NOT NULL,
    step_number INTEGER NOT NULL,
    approver_id UUID NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending',
    comment TEXT,
    decision_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_status CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Escalated')),
    FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE,
    FOREIGN KEY (approver_id) REFERENCES users(id)
);

-- ============================================
-- COMPLIANCE RULES TABLE
-- ============================================
CREATE TABLE compliance_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    description TEXT,
    rule_type VARCHAR(50),
    field_name VARCHAR(100),
    validation_rule JSONB NOT NULL,
    error_message TEXT,
    severity VARCHAR(50) DEFAULT 'Warning',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    CONSTRAINT valid_severity CHECK (severity IN ('Info', 'Warning', 'Error', 'Critical'))
);

-- ============================================
-- COMPLIANCE CHECK RESULTS TABLE
-- ============================================
CREATE TABLE compliance_check_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id UUID NOT NULL,
    compliance_rule_id UUID NOT NULL,
    status VARCHAR(50) NOT NULL,
    message TEXT,
    issue_type VARCHAR(50),
    is_resolved BOOLEAN DEFAULT false,
    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    CONSTRAINT valid_status CHECK (status IN ('Pass', 'Warning', 'Fail')),
    FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE,
    FOREIGN KEY (compliance_rule_id) REFERENCES compliance_rules(id)
);

-- ============================================
-- AUDIT LOGS TABLE (Immutable)
-- ============================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    changed_by UUID NOT NULL,
    change_reason TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_action CHECK (action IN ('Create', 'Update', 'Delete', 'Submit', 'Approve', 'Reject', 'Sign'))
);

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_id UUID NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    related_entity_type VARCHAR(100),
    related_entity_id UUID,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- SYSTEM CONFIGURATION TABLE
-- ============================================
CREATE TABLE system_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    description TEXT,
    is_sensitive BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_users_department_id ON users(department_id);
CREATE INDEX idx_users_is_active ON users(is_active);

-- Employees indexes
CREATE INDEX idx_employees_email ON employees(email);
CREATE INDEX idx_employees_department_id ON employees(department_id);
CREATE INDEX idx_employees_employment_status ON employees(employment_status);
CREATE INDEX idx_employees_hire_date ON employees(hire_date);

-- Contracts indexes
CREATE INDEX idx_contracts_employee_id ON contracts(employee_id);
CREATE INDEX idx_contracts_contract_type_id ON contracts(contract_type_id);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_contracts_created_at ON contracts(created_at);
CREATE INDEX idx_contracts_start_date ON contracts(start_date);

-- Contract details indexes
CREATE INDEX idx_contract_details_contract_id ON contract_details(contract_id);

-- Approvals indexes
CREATE INDEX idx_approval_workflows_contract_id ON approval_workflows(contract_id);
CREATE INDEX idx_approval_workflows_approver_id ON approval_workflows(approver_id);
CREATE INDEX idx_approval_workflows_status ON approval_workflows(status);

-- Compliance indexes
CREATE INDEX idx_compliance_check_results_contract_id ON compliance_check_results(contract_id);
CREATE INDEX idx_compliance_check_results_status ON compliance_check_results(status);

-- Audit logs indexes
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_changed_by ON audit_logs(changed_by);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Notifications indexes
CREATE INDEX idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- ============================================
-- VIEWS
-- ============================================

-- Pending Contracts View
CREATE VIEW v_pending_contracts AS
SELECT c.id, c.contract_number, e.first_name, e.last_name, 
       ct.name as contract_type, c.status, c.created_at
FROM contracts c
JOIN employees e ON c.employee_id = e.id
JOIN contract_types ct ON c.contract_type_id = ct.id
WHERE c.status IN ('Review', 'Approved')
ORDER BY c.created_at DESC;

-- Contract Summary View
CREATE VIEW v_contract_summary AS
SELECT 
    COUNT(*) as total_contracts,
    SUM(CASE WHEN status = 'Draft' THEN 1 ELSE 0 END) as draft_count,
    SUM(CASE WHEN status = 'Review' THEN 1 ELSE 0 END) as review_count,
    SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) as approved_count,
    SUM(CASE WHEN status = 'Signed' THEN 1 ELSE 0 END) as signed_count,
    AVG(EXTRACT(DAY FROM updated_at - created_at)) as avg_processing_days
FROM contracts;

-- Employee Contracts View
CREATE VIEW v_employee_contracts AS
SELECT e.id, e.first_name, e.last_name, e.employee_id,
       COUNT(c.id) as contract_count,
       MAX(c.created_at) as latest_contract_date
FROM employees e
LEFT JOIN contracts c ON e.id = c.employee_id
GROUP BY e.id, e.first_name, e.last_name, e.employee_id;

-- ============================================
-- FOREIGN KEY CONSTRAINTS
-- ============================================
ALTER TABLE users ADD CONSTRAINT fk_users_role_id 
    FOREIGN KEY (role_id) REFERENCES roles(id);

ALTER TABLE users ADD CONSTRAINT fk_users_department_id 
    FOREIGN KEY (department_id) REFERENCES departments(id);

ALTER TABLE departments ADD CONSTRAINT fk_departments_manager_id 
    FOREIGN KEY (manager_id) REFERENCES users(id);

ALTER TABLE employees ADD CONSTRAINT fk_employees_department_id 
    FOREIGN KEY (department_id) REFERENCES departments(id);

ALTER TABLE employees ADD CONSTRAINT fk_employees_manager_id 
    FOREIGN KEY (manager_id) REFERENCES employees(id);

-- ============================================
-- TRIGGER FOR updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_users_updated_at BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_employees_updated_at BEFORE UPDATE ON employees 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_contracts_updated_at BEFORE UPDATE ON contracts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_roles_updated_at BEFORE UPDATE ON roles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- INITIAL ROLES
-- ============================================
INSERT INTO roles (id, name, description, permissions, is_system_role) VALUES
('11111111-1111-1111-1111-111111111111', 'Administrator', 'Full system access', '{"*": true}', true),
('11111111-1111-1111-1111-111111111112', 'HR Manager', 'Manage contracts and approvals', '{"contracts.*": true, "employees.view": true, "approvals.manage": true}', true),
('11111111-1111-1111-1111-111111111113', 'HR User', 'Create and view contracts', '{"contracts.create": true, "contracts.view": true, "employees.view": true}', true),
('11111111-1111-1111-1111-111111111114', 'Approver', 'Review and approve contracts', '{"contracts.read": true, "approvals.approve": true}', true),
('11111111-1111-1111-1111-111111111115', 'Viewer', 'View-only access', '{"contracts.view": true, "employees.view": true}', true);

-- ============================================
-- INITIAL COMPLIANCE RULES
-- ============================================
INSERT INTO compliance_rules (id, name, description, field_name, validation_rule, error_message, severity, is_active) VALUES
('22222222-2222-2222-2222-222222222221', 'Salary Required', 'Salary must be provided for permanent contracts', 'salary', '{"required": true, "minValue": 0}', 'Salary is required', 'Error', true),
('22222222-2222-2222-2222-222222222222', 'Start Date Validation', 'Start date must be in future', 'start_date', '{"afterToday": true}', 'Start date must be in the future', 'Warning', true),
('22222222-2222-2222-2222-222222222223', 'Notice Period Required', 'Notice period must be specified', 'notice_period_days', '{"required": true, "minValue": 1}', 'Notice period is required', 'Error', true);

COMMIT;
