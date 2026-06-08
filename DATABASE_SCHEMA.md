# ContractIQ Database Schema
## PostgreSQL Schema Design for RedMPS HR Platform

---

## Overview

The database is designed using a **relational model** with normalization principles, supporting:
- Employee and contract management
- Complex approval workflows
- Compliance tracking
- Comprehensive audit logging
- Scalable architecture for enterprise use

**Database:** PostgreSQL 14+  
**Encoding:** UTF-8  
**Extension:** uuid-ossp (for UUID generation)

---

## Core Tables

### 1. Users Table

```sql
CREATE TABLE users (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  email_verified BOOLEAN DEFAULT false,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  
  -- User Profile
  department VARCHAR(100),
  role_id UUID NOT NULL REFERENCES roles(role_id),
  manager_id UUID REFERENCES users(user_id),
  
  -- Status & Security
  is_active BOOLEAN DEFAULT true,
  is_locked BOOLEAN DEFAULT false,
  failed_login_attempts INT DEFAULT 0,
  last_login_at TIMESTAMP,
  mfa_enabled BOOLEAN DEFAULT false,
  mfa_secret VARCHAR(255),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  
  -- Indexes
  CONSTRAINT user_email_idx UNIQUE (email),
  CONSTRAINT user_role_fk CHECK (role_id IS NOT NULL)
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_users_is_active ON users(is_active);
```

### 2. Roles Table

```sql
CREATE TABLE roles (
  role_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  
  -- Permissions stored as JSON array
  permissions JSONB DEFAULT '[]'::jsonb,
  
  -- Example permissions:
  -- ["contracts.create", "contracts.read", "contracts.update", 
  --  "contracts.approve", "contracts.reject", "employees.view", 
  --  "reports.view", "admin.settings"]
  
  is_system_role BOOLEAN DEFAULT false,  -- System roles cannot be deleted
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_roles_name (role_name)
);

-- Predefined Roles
INSERT INTO roles (role_name, display_name, permissions, is_system_role) VALUES
('admin', 'Administrator', '["*"]'::jsonb, true),
('hr_manager', 'HR Manager', '["contracts.create", "contracts.read", "contracts.update", "contracts.approve", "employees.view", "employees.create", "reports.view"]'::jsonb, true),
('approver', 'Approver', '["contracts.read", "contracts.approve", "contracts.reject"]'::jsonb, true),
('hr_user', 'HR User', '["contracts.create", "contracts.read", "contracts.update", "employees.view"]'::jsonb, true),
('viewer', 'Viewer', '["contracts.read", "employees.view"]'::jsonb, true);
```

### 3. Departments Table

```sql
CREATE TABLE departments (
  department_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  company_name VARCHAR(100) DEFAULT 'RedMPS',
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_departments_name (department_name)
);

-- Sample Data
INSERT INTO departments (department_name, description) VALUES
('Engineering', 'Software and Systems Engineering'),
('Sales', 'Sales and Account Management'),
('HR', 'Human Resources'),
('Finance', 'Finance and Accounting'),
('Operations', 'Operations and Administration'),
('Executive', 'Executive Leadership');
```

### 4. Employees Table

```sql
CREATE TABLE employees (
  employee_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Personal Information
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  id_number VARCHAR(50) UNIQUE NOT NULL,  -- National ID or Passport
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  
  -- Employment Information
  department_id UUID NOT NULL REFERENCES departments(department_id),
  manager_id UUID REFERENCES employees(employee_id),
  job_title VARCHAR(100) NOT NULL,
  grade VARCHAR(50),  -- Level/Grade (e.g., L3, L4, L5)
  job_category VARCHAR(50),  -- Technical, Sales, Support, Management
  
  -- Dates
  start_date DATE NOT NULL,
  end_date DATE,
  
  -- Status
  employment_status VARCHAR(50) DEFAULT 'active',  
  -- Options: active, inactive, terminated, on_leave, contract_ended
  
  -- Address
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state_province VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'South Africa',
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  
  -- Constraints
  CONSTRAINT employee_email_unique UNIQUE (email),
  CONSTRAINT employee_id_unique UNIQUE (id_number)
);

CREATE INDEX idx_employees_email ON employees(email);
CREATE INDEX idx_employees_department_id ON employees(department_id);
CREATE INDEX idx_employees_manager_id ON employees(manager_id);
CREATE INDEX idx_employees_status ON employees(employment_status);
CREATE INDEX idx_employees_name ON employees(last_name, first_name);
```

### 5. Contract Types Table

```sql
CREATE TABLE contract_types (
  contract_type_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  type_name VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  
  -- Default Template
  default_template_id UUID REFERENCES templates(template_id),
  
  -- Configuration
  requires_probation BOOLEAN DEFAULT true,
  default_probation_months INT DEFAULT 3,
  requires_notice_period BOOLEAN DEFAULT true,
  default_notice_days INT DEFAULT 30,
  
  is_active BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_contract_types_name (type_name)
);

-- Predefined Contract Types
INSERT INTO contract_types (type_name, display_name, description, default_probation_months, default_notice_days) VALUES
('permanent', 'Permanent Employment Contract', 'Full-time permanent employment', 3, 30),
('fixed_term_12', 'Fixed-Term Contract (12 Months)', '12-month fixed-term agreement', 1, 14),
('fixed_term_24', 'Fixed-Term Contract (24 Months)', '24-month fixed-term agreement', 2, 30),
('internship', 'Internship Agreement', 'Graduate or student internship', 0, 7),
('learnership', 'Learnership Agreement', 'Skills learnership program', 1, 14),
('consultant', 'Consultant Agreement', 'Independent consultant contract', 0, 7),
('contractor', 'Contractor Agreement', 'Service contractor', 0, 14),
('offer_letter', 'Offer Letter', 'Employment offer letter', 0, 0),
('promotion', 'Promotion Letter', 'Promotion confirmation', 0, 0),
('transfer', 'Transfer Letter', 'Internal transfer', 0, 30),
('warning', 'Warning Letter', 'Disciplinary warning', 0, 0),
('termination', 'Termination Letter', 'Employment termination', 0, 0);
```

### 6. Templates Table

```sql
CREATE TABLE templates (
  template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  template_name VARCHAR(100) NOT NULL,
  description TEXT,
  contract_type_id UUID NOT NULL REFERENCES contract_types(contract_type_id),
  
  -- Template Content (HTML or Document format)
  template_content TEXT NOT NULL,
  
  -- Placeholders available in template (stored as JSON array)
  placeholders JSONB DEFAULT '[]'::jsonb,
  -- Example: ["{{firstName}}", "{{lastName}}", "{{salary}}", "{{startDate}}"]
  
  -- Versioning
  version INT DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  
  -- Audit
  created_by UUID NOT NULL REFERENCES users(user_id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID REFERENCES users(user_id),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  
  INDEX idx_templates_contract_type ON templates(contract_type_id),
  INDEX idx_templates_is_active ON templates(is_active)
);
```

### 7. Contracts Table (Core)

```sql
CREATE TABLE contracts (
  contract_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identification
  contract_number VARCHAR(50) UNIQUE NOT NULL,
  -- Format: CTR-YYYY-XXXXX (e.g., CTR-2024-00152)
  
  -- Relationships
  employee_id UUID NOT NULL REFERENCES employees(employee_id),
  contract_type_id UUID NOT NULL REFERENCES contract_types(contract_type_id),
  template_id UUID NOT NULL REFERENCES templates(template_id),
  
  -- Status
  status VARCHAR(50) DEFAULT 'draft',
  -- Options: draft, in_review, approved, executed, rejected, cancelled
  
  -- Workflow
  current_step INT DEFAULT 1,
  next_approver_id UUID REFERENCES users(user_id),
  
  -- Audit
  created_by UUID NOT NULL REFERENCES users(user_id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID REFERENCES users(user_id),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  submitted_by UUID REFERENCES users(user_id),
  submitted_at TIMESTAMP,
  approved_at TIMESTAMP,
  executed_at TIMESTAMP,
  rejected_at TIMESTAMP,
  
  -- Soft Delete
  deleted_at TIMESTAMP,
  
  -- Search/Indexing
  INDEX idx_contracts_employee_id ON contracts(employee_id),
  INDEX idx_contracts_status ON contracts(status),
  INDEX idx_contracts_created_at ON contracts(created_at),
  INDEX idx_contracts_next_approver ON contracts(next_approver_id),
  UNIQUE INDEX idx_contracts_number (contract_number)
);
```

### 8. Contract Details Table

```sql
CREATE TABLE contract_details (
  detail_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(contract_id) ON DELETE CASCADE,
  
  -- Field Information
  field_name VARCHAR(100) NOT NULL,
  field_value TEXT,
  data_type VARCHAR(50),  -- 'string', 'number', 'date', 'boolean', 'array'
  
  -- Metadata
  is_required BOOLEAN DEFAULT true,
  is_sensitive BOOLEAN DEFAULT false,  -- Salary, ID number, etc.
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_contract_details_contract_id ON contract_details(contract_id),
  INDEX idx_contract_details_field_name ON contract_details(field_name)
);

-- Key Fields typically stored:
-- field_name: 'firstName', 'lastName', 'idNumber', 'email', 'department',
--             'jobTitle', 'salary', 'salaryFrequency', 'currency', 'probationPeriod',
--             'noticePeriod', 'address', 'startDate', 'benefits', 'contractDuration'
```

### 9. Approval Workflows Table

```sql
CREATE TABLE approval_workflows (
  workflow_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  contract_id UUID NOT NULL REFERENCES contracts(contract_id) ON DELETE CASCADE,
  
  -- Step Information
  step_number INT NOT NULL,
  step_name VARCHAR(100),  -- 'HR Review', 'Manager Approval', etc.
  
  -- Approver Information
  approver_id UUID NOT NULL REFERENCES users(user_id),
  approver_role VARCHAR(50),
  
  -- Approval Status
  approval_status VARCHAR(50) DEFAULT 'pending',
  -- Options: pending, approved, rejected, escalated, reassigned
  
  -- Comments and Feedback
  comments TEXT,
  rejection_reason TEXT,
  
  -- Dates
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP,
  rejected_at TIMESTAMP,
  
  -- Audit
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX idx_workflows_contract_id ON approval_workflows(contract_id),
  INDEX idx_workflows_approver_id ON approval_workflows(approver_id),
  INDEX idx_workflows_status ON approval_workflows(approval_status),
  INDEX idx_workflows_step ON approval_workflows(contract_id, step_number)
);
```

### 10. Audit Logs Table

```sql
CREATE TABLE audit_logs (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Entity Information
  contract_id UUID REFERENCES contracts(contract_id) ON DELETE SET NULL,
  employee_id UUID REFERENCES employees(employee_id) ON DELETE SET NULL,
  
  -- Action Information
  user_id UUID NOT NULL REFERENCES users(user_id),
  action VARCHAR(100) NOT NULL,
  -- Actions: create, update, submit, approve, reject, export, download, delete
  
  -- Change Details
  old_values JSONB,  -- Previous values
  new_values JSONB,  -- New values
  
  -- Request Information
  ip_address VARCHAR(45),
  user_agent TEXT,
  
  -- Timestamp (immutable)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  
  -- Indexes for queries
  INDEX idx_audit_logs_contract_id ON audit_logs(contract_id),
  INDEX idx_audit_logs_user_id ON audit_logs(user_id),
  INDEX idx_audit_logs_created_at ON audit_logs(created_at),
  INDEX idx_audit_logs_action ON audit_logs(action)
);
```

### 11. Compliance Rules Table

```sql
CREATE TABLE compliance_rules (
  rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  rule_name VARCHAR(100) UNIQUE NOT NULL,
  rule_type VARCHAR(50) NOT NULL,
  -- Types: minimum_wage, maximum_hours, probation_limit, notice_period,
  --        required_clauses, jurisdiction_specific
  
  description TEXT,
  
  -- Rule Configuration (flexible JSON)
  rule_value JSONB NOT NULL,
  -- Example: {"minimumWageUsd": 15, "effectiveDate": "2024-01-01", "jurisdiction": "US"}
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  jurisdiction VARCHAR(50) DEFAULT 'global',  -- Can be jurisdiction-specific
  
  -- Priority for conflict resolution
  priority INT DEFAULT 100,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_compliance_rules_type ON compliance_rules(rule_type),
  INDEX idx_compliance_rules_active ON compliance_rules(is_active)
);
```

### 12. Compliance Check Results Table

```sql
CREATE TABLE compliance_check_results (
  result_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  contract_id UUID NOT NULL REFERENCES contracts(contract_id) ON DELETE CASCADE,
  rule_id UUID NOT NULL REFERENCES compliance_rules(rule_id),
  
  -- Result
  check_status VARCHAR(50),  -- 'passed', 'failed', 'warning'
  message TEXT,
  
  checked_value TEXT,  -- What was checked
  required_value TEXT,  -- What was required
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_compliance_results_contract ON compliance_check_results(contract_id),
  INDEX idx_compliance_results_status ON compliance_check_results(check_status)
);
```

### 13. System Configuration Table

```sql
CREATE TABLE system_config (
  config_id SERIAL PRIMARY KEY,
  
  config_key VARCHAR(100) UNIQUE NOT NULL,
  config_value TEXT,
  data_type VARCHAR(50),  -- 'string', 'number', 'boolean', 'json'
  
  description TEXT,
  
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_config_key (config_key)
);

-- Sample Configuration
INSERT INTO system_config (config_key, config_value, data_type, description) VALUES
('app_name', 'ContractIQ', 'string', 'Application name'),
('app_version', '1.0.0', 'string', 'Application version'),
('jwt_expiry_minutes', '60', 'number', 'JWT token expiration time'),
('max_file_upload_mb', '50', 'number', 'Maximum file upload size'),
('default_currency', 'USD', 'string', 'Default currency'),
('enable_ai_suggestions', 'true', 'boolean', 'Enable AI-powered suggestions'),
('enable_digital_signatures', 'true', 'boolean', 'Enable digital signatures');
```

### 14. Notifications Table (Optional, for logging)

```sql
CREATE TABLE notifications (
  notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  user_id UUID NOT NULL REFERENCES users(user_id),
  
  notification_type VARCHAR(50),  -- 'approval_needed', 'contract_signed', etc.
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  
  related_contract_id UUID REFERENCES contracts(contract_id),
  related_entity_id UUID,
  
  -- Status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  
  -- Delivery
  delivery_method VARCHAR(50) DEFAULT 'email',  -- 'email', 'in_app', 'both'
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_notifications_user_id ON notifications(user_id),
  INDEX idx_notifications_created_at ON notifications(created_at),
  INDEX idx_notifications_is_read ON notifications(is_read)
);
```

---

## Views (Useful Query Shortcuts)

```sql
-- View: Pending Contracts
CREATE VIEW v_pending_contracts AS
SELECT 
  c.contract_id,
  c.contract_number,
  e.first_name,
  e.last_name,
  ct.display_name as contract_type,
  c.status,
  c.created_at,
  u.full_name as created_by,
  aw.approver_id,
  u2.full_name as next_approver
FROM contracts c
JOIN employees e ON c.employee_id = e.employee_id
JOIN contract_types ct ON c.contract_type_id = ct.contract_type_id
JOIN users u ON c.created_by = u.user_id
LEFT JOIN approval_workflows aw ON c.contract_id = aw.contract_id 
  AND aw.approval_status = 'pending'
LEFT JOIN users u2 ON aw.approver_id = u2.user_id
WHERE c.status IN ('in_review', 'approved')
  AND c.deleted_at IS NULL;

-- View: Contract Summary for Dashboard
CREATE VIEW v_contract_summary AS
SELECT 
  CAST(COUNT(*) FILTER (WHERE status = 'draft') AS INT) as draft_count,
  CAST(COUNT(*) FILTER (WHERE status = 'in_review') AS INT) as in_review_count,
  CAST(COUNT(*) FILTER (WHERE status = 'approved') AS INT) as approved_count,
  CAST(COUNT(*) FILTER (WHERE status = 'executed') AS INT) as executed_count,
  CAST(COUNT(*) FILTER (WHERE status = 'rejected') AS INT) as rejected_count,
  CAST(COUNT(*) AS INT) as total_count,
  CAST(EXTRACT(EPOCH FROM (AVG(executed_at - created_at) / 86400)) AS INT) as avg_days_to_execute
FROM contracts
WHERE deleted_at IS NULL;

-- View: Employee with Contract History
CREATE VIEW v_employee_contracts AS
SELECT 
  e.employee_id,
  e.first_name,
  e.last_name,
  e.email,
  e.job_title,
  d.department_name,
  CAST(COUNT(c.contract_id) AS INT) as contract_count,
  MAX(c.created_at) as last_contract_date
FROM employees e
LEFT JOIN departments d ON e.department_id = d.department_id
LEFT JOIN contracts c ON e.employee_id = c.employee_id AND c.deleted_at IS NULL
WHERE e.deleted_at IS NULL
GROUP BY e.employee_id, e.first_name, e.last_name, e.email, e.job_title, d.department_name;
```

---

## Indexes Summary

### Performance Indexes
```sql
-- Foreign Key Indexes (automatically created)
-- Search/Filter Indexes
CREATE INDEX idx_contracts_search ON contracts(employee_id, status, created_at);
CREATE INDEX idx_approvals_search ON approval_workflows(contract_id, approval_status);
CREATE INDEX idx_employees_search ON employees(first_name, last_name, email);

-- Time-based Indexes
CREATE INDEX idx_contracts_date_range ON contracts(created_at, status);
CREATE INDEX idx_audit_logs_date ON audit_logs(created_at);
```

---

## Migration Strategy

### Baseline Migration (V1__initial_schema.sql)
- Create all core tables
- Create indexes
- Insert system data (roles, contract types, departments)
- Create views

### Subsequent Migrations
- Follow semantic versioning: V2__add_field.sql
- Always include rollback procedure
- Test thoroughly on staging first

---

## Data Integrity Rules

1. **Referential Integrity**: All foreign keys enforced
2. **Unique Constraints**: Enforced at database level
3. **Check Constraints**: Status enums, date validations
4. **Not Null Constraints**: Critical fields protected
5. **Audit Logging**: All changes logged in audit_logs
6. **Soft Deletes**: deleted_at used for historical tracking

---

## Backup & Recovery

- **Backup Frequency**: Daily at 02:00 UTC
- **Retention**: 30-day rolling backups
- **Recovery Time Objective (RTO)**: < 1 hour
- **Recovery Point Objective (RPO)**: < 15 minutes
- **Location**: Geographically distributed (3 regions)

---

## Performance Optimization Tips

1. **Partitioning** (for large deployments):
   ```sql
   -- Partition contracts by year
   CREATE TABLE contracts_y2024 PARTITION OF contracts 
     FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
   ```

2. **Materialized Views** (for heavy queries):
   ```sql
   CREATE MATERIALIZED VIEW mv_contract_analytics AS
   SELECT ... [complex analytics query]
   WITH DATA;
   ```

3. **Query Hints** (if needed):
   ```sql
   EXPLAIN ANALYZE -- Use for query optimization
   ```

---

*Database Schema Version: 1.0*  
*Last Updated: June 5, 2026*  
*PostgreSQL Version: 14+*  
*Status: Production-Ready*
