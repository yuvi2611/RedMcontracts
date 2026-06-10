'use strict';

/**
 * Seed script — populates Neon with realistic RedMPS ContractIQ data.
 * Run: node database/seed.js
 */

const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

// Load .env
const env = {};
for (const line of fs.readFileSync(path.resolve(__dirname, '../.env'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
  if (m && !m[1].startsWith('#')) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
Object.assign(process.env, env);

const pool = new Pool({
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT || 5432),
  database: process.env.DATABASE_NAME,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  ssl: { rejectUnauthorized: false },
});

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── Get admin user id ─────────────────────────────────────────────
    const adminRes = await client.query(`SELECT id FROM users WHERE email = 'admin@redmps.com' LIMIT 1`);
    const adminId = adminRes.rows[0].id;

    // ── Get role IDs ──────────────────────────────────────────────────
    const rolesRes = await client.query(`SELECT id, name FROM roles`);
    const roles = Object.fromEntries(rolesRes.rows.map(r => [r.name, r.id]));

    // ── Departments ───────────────────────────────────────────────────
    console.log('Seeding departments...');
    const depts = await client.query(`
      INSERT INTO departments (name, code, description, created_by) VALUES
        ('Human Resources',        'HR',      'HR administration and people management', $1),
        ('Information Technology', 'IT',      'Technology and systems', $1),
        ('Finance',                'FIN',     'Financial management and reporting', $1),
        ('Operations',             'OPS',     'Business operations', $1),
        ('Sales & Marketing',      'SAL',     'Revenue and brand growth', $1),
        ('Legal & Compliance',     'LEG',     'Legal affairs and regulatory compliance', $1)
      ON CONFLICT (code) DO NOTHING
      RETURNING id, code
    `, [adminId]);
    const deptMap = Object.fromEntries(depts.rows.map(r => [r.code, r.id]));

    // If departments already existed, fetch them
    if (Object.keys(deptMap).length === 0) {
      const existing = await client.query(`SELECT id, code FROM departments`);
      existing.rows.forEach(r => { deptMap[r.code] = r.id; });
    } else {
      // Fetch any that were skipped due to conflict
      const existing = await client.query(`SELECT id, code FROM departments`);
      existing.rows.forEach(r => { deptMap[r.code] = r.id; });
    }

    // ── Additional HR users ───────────────────────────────────────────
    console.log('Seeding HR users...');
    const hrUsers = [
      { email: 'sarah.nkosi@redmps.com',    first: 'Sarah',    last: 'Nkosi',    role: 'HR Manager',  dept: 'HR',  phone: '0711234567' },
      { email: 'james.van.der.berg@redmps.com', first: 'James', last: 'Van Der Berg', role: 'HR Officer', dept: 'HR', phone: '0829876543' },
      { email: 'priya.pillay@redmps.com',   first: 'Priya',    last: 'Pillay',   role: 'Director',    dept: 'HR',  phone: '0731112222' },
      { email: 'thabo.dlamini@redmps.com',  first: 'Thabo',    last: 'Dlamini',  role: 'HR Officer',  dept: 'OPS', phone: '0763334444' },
    ];
    const userIds = {};
    for (const u of hrUsers) {
      const res = await client.query(`
        SELECT create_user_as_superuser($1::uuid,$2::text,$3::text,$4::text,$5::text,$6::uuid,$7::uuid,$8::text,$9::boolean,$10::boolean,$11::boolean) as id
      `, [
        adminId, u.email, u.first, u.last, u.phone,
        roles[u.role] || roles['HR Officer'],
        deptMap[u.dept] || null,
        'RedMPS@2026!', false, true, false
      ]);
      userIds[u.email] = res.rows[0].id;
    }

    // ── Employees ─────────────────────────────────────────────────────
    console.log('Seeding employees...');
    const employees = [
      { eid: 'EMP-001', first: 'Ayanda',   last: 'Zulu',         email: 'ayanda.zulu@redmps.com',         phone: '0711110001', dob: '1990-03-12', id_number: '9003120123081', dept: 'IT',  title: 'Senior Software Engineer',      type: 'Permanent',  status: 'Active',     hire: '2021-02-01' },
      { eid: 'EMP-002', first: 'Sipho',    last: 'Mokoena',      email: 'sipho.mokoena@redmps.com',       phone: '0722220002', dob: '1988-07-25', id_number: '8807250567082', dept: 'FIN', title: 'Financial Analyst',             type: 'Permanent',  status: 'Active',     hire: '2019-05-15' },
      { eid: 'EMP-003', first: 'Naledi',   last: 'Khumalo',      email: 'naledi.khumalo@redmps.com',      phone: '0733330003', dob: '1995-11-08', id_number: '9511080234083', dept: 'HR',  title: 'HR Coordinator',                type: 'Permanent',  status: 'Active',     hire: '2022-08-01' },
      { eid: 'EMP-004', first: 'Brendan',  last: 'Fourie',       email: 'brendan.fourie@redmps.com',      phone: '0744440004', dob: '1985-04-20', id_number: '8504200890084', dept: 'OPS', title: 'Operations Manager',            type: 'Permanent',  status: 'Active',     hire: '2018-01-10' },
      { eid: 'EMP-005', first: 'Zanele',   last: 'Sithole',      email: 'zanele.sithole@redmps.com',      phone: '0755550005', dob: '1993-09-30', id_number: '9309300678085', dept: 'SAL', title: 'Sales Executive',               type: 'Permanent',  status: 'Active',     hire: '2023-01-16' },
      { eid: 'EMP-006', first: 'Ruan',     last: 'Pretorius',    email: 'ruan.pretorius@redmps.com',      phone: '0766660006', dob: '1991-06-14', id_number: '9106140345086', dept: 'IT',  title: 'DevOps Engineer',               type: 'Fixed-Term', status: 'Active',     hire: '2025-01-06' },
      { eid: 'EMP-007', first: 'Fatima',   last: 'Cassim',       email: 'fatima.cassim@redmps.com',       phone: '0777770007', dob: '1987-12-03', id_number: '8712030567087', dept: 'LEG', title: 'Legal Counsel',                 type: 'Permanent',  status: 'Active',     hire: '2020-09-01' },
      { eid: 'EMP-008', first: 'Karabo',   last: 'Molefe',       email: 'karabo.molefe@redmps.com',       phone: '0788880008', dob: '1996-02-19', id_number: '9602190789088', dept: 'FIN', title: 'Junior Accountant',             type: 'Fixed-Term', status: 'Active',     hire: '2025-03-01' },
      { eid: 'EMP-009', first: 'Heidi',    last: 'Bosman',       email: 'heidi.bosman@redmps.com',        phone: '0799990009', dob: '1989-08-07', id_number: '8908070234089', dept: 'HR',  title: 'Talent Acquisition Specialist', type: 'Permanent',  status: 'Active',     hire: '2021-11-15' },
      { eid: 'EMP-010', first: 'Lungelo',  last: 'Ntuli',        email: 'lungelo.ntuli@redmps.com',       phone: '0711110010', dob: '1994-05-22', id_number: '9405220567090', dept: 'IT',  title: 'UI/UX Designer',                type: 'Permanent',  status: 'Active',     hire: '2022-04-04' },
      { eid: 'EMP-011', first: 'Melissa',  last: 'Jacobs',       email: 'melissa.jacobs@redmps.com',      phone: '0722220011', dob: '1992-10-16', id_number: '9210160890091', dept: 'SAL', title: 'Account Manager',               type: 'Permanent',  status: 'Active',     hire: '2020-06-01' },
      { eid: 'EMP-012', first: 'Tshepo',   last: 'Mahlangu',     email: 'tshepo.mahlangu@redmps.com',     phone: '0733330012', dob: '1997-01-28', id_number: '9701280345092', dept: 'OPS', title: 'Logistics Coordinator',         type: 'Internship', status: 'Active',     hire: '2026-02-01' },
      { eid: 'EMP-013', first: 'Chantelle',last: 'Du Plessis',   email: 'chantelle.duplessis@redmps.com', phone: '0744440013', dob: '1983-03-11', id_number: '8303110678093', dept: 'LEG', title: 'Compliance Officer',            type: 'Permanent',  status: 'Active',     hire: '2017-07-03' },
      { eid: 'EMP-014', first: 'Sibusiso', last: 'Ndlovu',       email: 'sibusiso.ndlovu@redmps.com',     phone: '0755550014', dob: '1990-11-05', id_number: '9011050789094', dept: 'IT',  title: 'Data Engineer',                 type: 'Permanent',  status: 'On Leave',   hire: '2021-09-13' },
      { eid: 'EMP-015', first: 'Andile',   last: 'Nxumalo',      email: 'andile.nxumalo@redmps.com',      phone: '0766660015', dob: '1998-06-17', id_number: '9806170123095', dept: 'SAL', title: 'Marketing Coordinator',         type: 'Fixed-Term', status: 'Active',     hire: '2025-06-01' },
      { eid: 'EMP-016', first: 'Yuvaan',   last: 'Pather',       email: 'yuvi.pather@gmail.com',          phone: '0831234567', dob: '2000-04-15', id_number: '0004150234096', dept: 'IT',  title: 'Junior Platform Engineer',      type: 'Permanent',  status: 'Active',     hire: '2024-01-15' },
    ];

    const empIds = {};
    for (const e of employees) {
      const res = await client.query(`
        INSERT INTO employees (employee_id, first_name, last_name, email, phone, date_of_birth, id_number,
          nationality, address, city, province, postal_code, country,
          department_id, job_title, employment_status, hire_date, employment_type, created_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,'South African','145 Western Service Road, Woodmead','Johannesburg','Gauteng','2191','South Africa',
          $8,$9,$10,$11,$12,$13)
        ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
        RETURNING id
      `, [e.eid, e.first, e.last, e.email, e.phone, e.dob, e.id_number,
          deptMap[e.dept] || null, e.title, e.status, e.hire, e.type, adminId]);
      empIds[e.eid] = res.rows[0].id;
    }

    // ── Contract types ────────────────────────────────────────────────
    console.log('Seeding contract types...');
    const ctRes = await client.query(`
      INSERT INTO contract_types (name, code, description, default_duration_months, created_by) VALUES
        ('Permanent Employment Contract', 'PERM', 'Indefinite employment contract', NULL, $1),
        ('Fixed-Term Employment Agreement', 'FTA', 'Time-limited contract', 12, $1),
        ('Internship Agreement', 'INTN', 'Internship / learnership agreement', 6, $1)
      ON CONFLICT (code) DO NOTHING
      RETURNING id, code
    `, [adminId]);
    let ctMap = Object.fromEntries(ctRes.rows.map(r => [r.code, r.id]));
    if (Object.keys(ctMap).length === 0) {
      const ex = await client.query(`SELECT id, code FROM contract_types`);
      ex.rows.forEach(r => { ctMap[r.code] = r.id; });
    } else {
      const ex = await client.query(`SELECT id, code FROM contract_types`);
      ex.rows.forEach(r => { ctMap[r.code] = r.id; });
    }

    // ── Templates ─────────────────────────────────────────────────────
    console.log('Seeding templates...');
    const tplRes = await client.query(`
      INSERT INTO templates (name, description, content, contract_type_id, version, created_by) VALUES
        ('RedMPS Permanent Employment Contract v2', 'Standard permanent contract with BCEA compliance', '{{employee_name}} permanent employment terms', $1, 2, $3),
        ('RedMPS Fixed-Term Employment Agreement v1', 'Fixed-term agreement with schedule and probation clauses', '{{employee_name}} fixed-term employment terms', $2, 1, $3),
        ('RedMPS Internship Agreement v1', 'Internship agreement with learning objectives', '{{employee_name}} internship terms', $4, 1, $3)
      ON CONFLICT DO NOTHING
      RETURNING id, name
    `, [ctMap['PERM'], ctMap['FTA'], adminId, ctMap['INTN']]);
    let tplMap = {};
    if (tplRes.rows.length > 0) {
      tplRes.rows.forEach(r => { tplMap[r.name] = r.id; });
    } else {
      const ex = await client.query(`SELECT id, name FROM templates`);
      ex.rows.forEach(r => { tplMap[r.name] = r.id; });
    }
    const tplIds = Object.values(tplMap);

    // ── Contracts ─────────────────────────────────────────────────────
    console.log('Seeding contracts...');
    const now = new Date();
    const contractData = [
      // Signed / executed
      { emp: 'EMP-001', ct: 'PERM', status: 'Signed',    title: 'Senior Software Engineer - Permanent',          salary: 75000, start: '2021-02-01', end: null,         days_ago: 1800 },
      { emp: 'EMP-002', ct: 'PERM', status: 'Executed',  title: 'Financial Analyst - Permanent',                 salary: 55000, start: '2019-05-15', end: null,         days_ago: 2500 },
      { emp: 'EMP-003', ct: 'PERM', status: 'Signed',    title: 'HR Coordinator - Permanent',                    salary: 38000, start: '2022-08-01', end: null,         days_ago: 1300 },
      { emp: 'EMP-004', ct: 'PERM', status: 'Executed',  title: 'Operations Manager - Permanent',                salary: 85000, start: '2018-01-10', end: null,         days_ago: 3000 },
      { emp: 'EMP-007', ct: 'PERM', status: 'Executed',  title: 'Legal Counsel - Permanent',                     salary: 90000, start: '2020-09-01', end: null,         days_ago: 2100 },
      { emp: 'EMP-009', ct: 'PERM', status: 'Signed',    title: 'Talent Acquisition Specialist - Permanent',     salary: 48000, start: '2021-11-15', end: null,         days_ago: 1650 },
      { emp: 'EMP-010', ct: 'PERM', status: 'Executed',  title: 'UI/UX Designer - Permanent',                    salary: 52000, start: '2022-04-04', end: null,         days_ago: 1500 },
      { emp: 'EMP-011', ct: 'PERM', status: 'Signed',    title: 'Account Manager - Permanent',                   salary: 60000, start: '2020-06-01', end: null,         days_ago: 2200 },
      { emp: 'EMP-013', ct: 'PERM', status: 'Executed',  title: 'Compliance Officer - Permanent',                salary: 68000, start: '2017-07-03', end: null,         days_ago: 3300 },
      { emp: 'EMP-014', ct: 'PERM', status: 'Signed',    title: 'Data Engineer - Permanent',                     salary: 70000, start: '2021-09-13', end: null,         days_ago: 1750 },
      { emp: 'EMP-016', ct: 'PERM', status: 'Signed',    title: 'Junior Platform Engineer - Permanent',          salary: 35000, start: '2024-01-15', end: null,         days_ago: 500  },
      // Fixed-term
      { emp: 'EMP-006', ct: 'FTA',  status: 'Signed',    title: 'DevOps Engineer - Fixed-Term',                  salary: 65000, start: '2025-01-06', end: '2026-01-05', days_ago: 155 },
      { emp: 'EMP-008', ct: 'FTA',  status: 'Review',    title: 'Junior Accountant - Fixed-Term Renewal',        salary: 28000, start: '2026-07-01', end: '2027-06-30', days_ago: 5   },
      { emp: 'EMP-015', ct: 'FTA',  status: 'Draft',     title: 'Marketing Coordinator - Fixed-Term',            salary: 32000, start: '2026-06-01', end: '2027-05-31', days_ago: 9   },
      // Internship
      { emp: 'EMP-012', ct: 'INTN', status: 'Approved',  title: 'Logistics Coordinator - Internship',            salary: 8500,  start: '2026-02-01', end: '2026-07-31', days_ago: 130 },
      { emp: 'EMP-005', ct: 'PERM', status: 'Review',    title: 'Sales Executive - Permanent',                   salary: 45000, start: '2023-01-16', end: null,         days_ago: 3   },
      // Rejected / archived
      { emp: 'EMP-002', ct: 'FTA',  status: 'Rejected',  title: 'Financial Analyst - Contract Extension',        salary: 58000, start: '2025-01-01', end: '2025-12-31', days_ago: 200 },
      { emp: 'EMP-014', ct: 'PERM', status: 'Archived',  title: 'Data Engineer - Legacy Contract',               salary: 65000, start: '2019-01-01', end: null,         days_ago: 2600 },
      // Draft
      { emp: 'EMP-001', ct: 'PERM', status: 'Draft',     title: 'Senior Software Engineer - Role Upgrade',       salary: 85000, start: '2026-07-01', end: null,         days_ago: 1   },
    ];

    const contractIds = {};
    let contractCounter = 1;
    for (const c of contractData) {
      const createdAt = new Date(now - c.days_ago * 86400000);
      const num = `RMP-${new Date(createdAt).getFullYear()}-${String(contractCounter++).padStart(3, '0')}`;
      const empId = empIds[c.emp];
      const ctId = ctMap[c.ct];
      const tplId = tplIds[c.ct === 'PERM' ? 0 : c.ct === 'FTA' ? 1 : 2] || tplIds[0];
      const empType = c.ct === 'PERM' ? 'Permanent' : c.ct === 'FTA' ? 'Fixed-Term' : 'Internship';

      const submitted = ['Review','Approved','Signed','Executed','Rejected'].includes(c.status)
        ? new Date(createdAt.getTime() + 86400000) : null;
      const approved = ['Approved','Signed','Executed'].includes(c.status)
        ? new Date(createdAt.getTime() + 3 * 86400000) : null;
      const signed = ['Signed','Executed'].includes(c.status)
        ? new Date(createdAt.getTime() + 5 * 86400000) : null;

      const res = await client.query(`
        INSERT INTO contracts (contract_number, employee_id, contract_type_id, template_id,
          status, title, salary, currency, employment_type,
          start_date, end_date, probation_period_months, notice_period_days,
          created_at, created_by, submitted_at, approved_at, signed_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,'ZAR',$8,$9,$10,3,30,$11,$12,$13,$14,$15)
        ON CONFLICT (contract_number) DO NOTHING
        RETURNING id
      `, [num, empId, ctId, tplId, c.status, c.title, c.salary, empType,
          c.start, c.end || null, createdAt, adminId, submitted, approved, signed]);

      if (res.rows[0]) contractIds[num] = res.rows[0].id;
    }

    // ── Approval workflows for Review/Approved contracts ──────────────
    console.log('Seeding approval workflows...');
    const allContracts = await client.query(`
      SELECT c.id, c.status, c.contract_number, c.created_by
      FROM contracts c
      WHERE c.status IN ('Review', 'Approved', 'Signed', 'Executed')
      LIMIT 30
    `);

    const hrManagerId = userIds['sarah.nkosi@redmps.com'] || adminId;
    const directorId = userIds['priya.pillay@redmps.com'] || adminId;

    for (const c of allContracts.rows) {
      // Step 1 - HR Manager
      const step1Status = ['Signed', 'Executed'].includes(c.status) ? 'Approved' : c.status === 'Approved' ? 'Approved' : 'Pending';
      await client.query(`
        INSERT INTO approval_workflows (contract_id, step_number, approver_id, status, comment, decision_date)
        VALUES ($1, 1, $2, $3, $4, $5)
        ON CONFLICT DO NOTHING
      `, [c.id, hrManagerId, step1Status,
          step1Status === 'Approved' ? 'Reviewed and approved at HR Manager level.' : null,
          step1Status === 'Approved' ? new Date(Date.now() - 2 * 86400000) : null]);

      // Step 2 - Director (only for approved/signed)
      if (['Approved', 'Signed', 'Executed'].includes(c.status)) {
        const step2Status = ['Signed', 'Executed'].includes(c.status) ? 'Approved' : 'Pending';
        await client.query(`
          INSERT INTO approval_workflows (contract_id, step_number, approver_id, status, comment, decision_date)
          VALUES ($1, 2, $2, $3, $4, $5)
          ON CONFLICT DO NOTHING
        `, [c.id, directorId, step2Status,
            step2Status === 'Approved' ? 'Director approval granted.' : null,
            step2Status === 'Approved' ? new Date(Date.now() - 1 * 86400000) : null]);
      }
    }

    // ── Audit logs ────────────────────────────────────────────────────
    console.log('Seeding audit logs...');
    const auditEntries = [
      { type: 'User', action: 'Create', msg: 'User sarah.nkosi@redmps.com created', actor: adminId },
      { type: 'User', action: 'Create', msg: 'User priya.pillay@redmps.com created', actor: adminId },
      { type: 'Contract', action: 'Create', msg: 'Contract RMP-2021-001 created', actor: adminId },
      { type: 'Contract', action: 'Submit', msg: 'Contract RMP-2021-001 submitted for approval', actor: adminId },
      { type: 'Contract', action: 'Approve', msg: 'Contract RMP-2021-001 approved by HR Manager', actor: hrManagerId },
      { type: 'Contract', action: 'Sign', msg: 'Contract RMP-2021-001 signed', actor: adminId },
      { type: 'Contract', action: 'Create', msg: 'Contract RMP-2019-002 created', actor: adminId },
      { type: 'Contract', action: 'Submit', msg: 'Contract RMP-2019-002 submitted', actor: adminId },
      { type: 'Contract', action: 'Approve', msg: 'RMP-2019-002 director approval', actor: directorId },
      { type: 'Contract', action: 'Update', msg: 'Contract salary updated for EMP-002', actor: adminId },
      { type: 'Contract', action: 'Reject', msg: 'Contract RMP-2025-xxx rejected — salary band exceeded', actor: directorId },
      { type: 'Contract', action: 'Create', msg: 'Fixed-term renewal draft created for EMP-008', actor: adminId },
      { type: 'Contract', action: 'Submit', msg: 'Fixed-term renewal submitted for review', actor: adminId },
      { type: 'User', action: 'Update', msg: 'User thabo.dlamini@redmps.com role updated', actor: adminId },
      { type: 'Contract', action: 'Create', msg: 'Internship agreement created for EMP-012', actor: adminId },
      { type: 'Contract', action: 'Approve', msg: 'Internship agreement approved', actor: hrManagerId },
    ];

    for (const e of auditEntries) {
      await client.query(`
        INSERT INTO audit_logs (entity_type, entity_id, action, new_values, changed_by, change_reason)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [e.type, adminId, e.action, JSON.stringify({ message: e.msg }), e.actor, e.msg]);
    }

    // ── System config ─────────────────────────────────────────────────
    console.log('Seeding system config...');
    await client.query(`
      INSERT INTO system_config (config_key, config_value, description) VALUES
        ('approval_policy', '{"stages":["hr_manager","director","signature"],"sla_hours":48}', 'Approval workflow policy'),
        ('salary_bands', '{"intern":[5000,12000],"junior":[20000,45000],"mid":[45000,80000],"senior":[80000,150000]}', 'Salary band ranges'),
        ('retention_days', '2555', 'Document retention period in days'),
        ('popia_enabled', 'true', 'POPIA compliance checks enabled')
      ON CONFLICT (config_key) DO NOTHING
    `);

    await client.query('COMMIT');
    console.log('\n✅ Seed complete.');
    console.log(`   Departments: ${Object.keys(deptMap).length}`);
    console.log(`   Employees:   ${employees.length}`);
    console.log(`   Contracts:   ${contractData.length}`);
    console.log(`   Audit logs:  ${auditEntries.length}`);

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
