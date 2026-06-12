const http = require('http');
const crypto = require('crypto');
const { URL } = require('url');
const { Pool } = require('pg');
const notifications = require('./services/notificationService');

const env = loadEnv();
// Push .env values into process.env so all services (emailService, etc.) can read them
Object.entries(env).forEach(([k, v]) => { if (!(k in process.env)) process.env[k] = v; });
const PORT = Number(env.API_PORT || 5000);
const ROLE_MAP = {
  hr_officer: 'HR Officer',
  hr_manager: 'HR Manager',
  director: 'Director',
  administrator: 'Administrator',
};

const pool = new Pool({
  host: env.DATABASE_HOST || 'localhost',
  port: Number(env.DATABASE_PORT || 5432),
  database: unquote(env.DATABASE_NAME || 'RedMPS Contracts'),
  user: env.DATABASE_USER || 'postgres',
  password: env.DATABASE_PASSWORD || 'pass',
  max: Number(env.DATABASE_CONNECTION_POOL_SIZE || 10),
  ssl: String(env.DATABASE_SSL_MODE || 'disable').toLowerCase() === 'require'
    ? { rejectUnauthorized: false }
    : false,
});

// token → { userId, email, firstName, expiresAt }
const resetTokens = new Map();

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'OPTIONS') return send(res, 204);

  try {
    const p = url.pathname;
    const m = req.method;

    // ── Auth ────────────────────────────────────────────────────────
    if (m === 'GET'  && p === '/health')                              return await health(res);
    if (m === 'POST' && p === '/api/auth/login')                      return await login(req, res);
    if (m === 'POST' && p === '/api/auth/password-reset/request')     return await requestPasswordReset(req, res);
    if (m === 'POST' && p === '/api/auth/password-reset/confirm')     return await confirmPasswordReset(req, res);

    // ── Users ───────────────────────────────────────────────────────
    if (m === 'POST' && p === '/api/users')                           return await createUser(req, res);

    // ── Dashboard ───────────────────────────────────────────────────
    if (m === 'GET'  && p === '/api/dashboard')                       return await getDashboard(res);

    // ── Employees ───────────────────────────────────────────────────
    if (m === 'GET'  && p === '/api/employees')                       return await listEmployees(req, res);
    if (m === 'POST' && p === '/api/employees')                       return await createEmployee(req, res);
    if (m === 'GET'  && p.match(/^\/api\/employees\/[^/]+$/))         return await getEmployee(req, res, p.split('/')[3]);

    // ── Contracts ───────────────────────────────────────────────────
    if (m === 'GET'  && p === '/api/contracts')                       return await listContracts(req, res);
    if (m === 'POST' && p === '/api/contracts')                       return await createContract(req, res);
    if (m === 'GET'  && p.match(/^\/api\/contracts\/[^/]+$/))         return await getContract(req, res, p.split('/')[3]);
    if (m === 'PUT'  && p.match(/^\/api\/contracts\/[^/]+\/submit$/)) return await submitContract(req, res, p.split('/')[3]);
    if (m === 'PUT'  && p.match(/^\/api\/contracts\/[^/]+\/status$/)) return await updateContractStatus(req, res, p.split('/')[3]);
    if (m === 'POST' && p.match(/^\/api\/contracts\/[^/]+\/send-to-employee$/)) return await sendContractToEmployee(req, res, p.split('/')[3]);

    // ── Approvals ───────────────────────────────────────────────────
    if (m === 'GET'  && p === '/api/approvals')                       return await listApprovals(req, res);
    if (m === 'POST' && p.match(/^\/api\/approvals\/[^/]+\/approve$/)) return await approveWorkflow(req, res, p.split('/')[3]);
    if (m === 'POST' && p.match(/^\/api\/approvals\/[^/]+\/reject$/))  return await rejectWorkflow(req, res, p.split('/')[3]);

    // ── Templates ───────────────────────────────────────────────────
    if (m === 'GET'  && p === '/api/templates')                       return await listTemplates(res);

    // ── Analytics ───────────────────────────────────────────────────
    if (m === 'GET'  && p === '/api/analytics')                       return await getAnalytics(res);

    // ── Audit ───────────────────────────────────────────────────────
    if (m === 'GET'  && p === '/api/audit-logs')                      return await listAuditLogs(req, res);
    if (m === 'POST' && p === '/api/audit')                           return await audit(req, res);

    // ── Notifications ───────────────────────────────────────────────
    if (m === 'GET'  && p === '/api/notifications')                   return await listNotifications(req, res);
    if (m === 'PUT'  && p === '/api/notifications/read')              return await markNotificationsRead(req, res);
    if (m === 'POST' && p === '/api/notify')                          return await sendDirectNotification(req, res);

    // ── Departments ─────────────────────────────────────────────────
    if (m === 'GET'  && p === '/api/departments')                     return await listDepartments(res);

    return send(res, 404, { message: 'Not found' });
  } catch (error) {
    const mapped = mapPgError(error);
    const status = mapped.statusCode || 500;
    send(res, status, { message: status === 500 ? 'Unexpected API error.' : mapped.message });
    if (status === 500) console.error(error);
  }
});

server.listen(PORT, () => {
  console.log(`ContractIQ API listening on http://localhost:${PORT}`);
});

async function health(res) {
  const result = await pool.query('select now() as database_time');
  send(res, 200, {
    status: 'healthy',
    database: 'online',
    databaseTime: result.rows[0].database_time,
  });
}

async function login(req, res) {
  const body = await readJson(req);
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (!email || !password) throw httpError(400, 'Email and password are required.');

  const result = await pool.query(
    `select
       u.id,
       u.email,
       u.first_name,
       u.last_name,
       u.phone,
       u.is_active,
       u.is_superuser,
       u.force_password_change,
       r.name as role
     from users u
     join roles r on r.id = u.role_id
     where lower(u.email) = lower($1)
       and u.is_active = true
       and u.password_hash = crypt($2, u.password_hash)
     limit 1`,
    [email, password]
  );

  const user = result.rows[0];
  if (!user) throw httpError(401, 'Invalid credentials. Accounts must exist in PostgreSQL.');

  await pool.query(
    `update users
     set last_login = current_timestamp, failed_login_attempts = 0
     where id = $1`,
    [user.id]
  );

  send(res, 200, {
    accessToken: `dev-${user.id}`,
    refreshToken: `dev-refresh-${user.id}`,
    user: toClientUser(user),
  });
}

async function requestPasswordReset(req, res) {
  const body = await readJson(req);
  const emailAddr = String(body.email || '').trim().toLowerCase();
  if (!emailAddr || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddr)) {
    throw httpError(400, 'A valid email address is required.');
  }

  const result = await pool.query(
    `select id, email, first_name from users where lower(email) = lower($1) and is_active = true limit 1`,
    [emailAddr]
  );
  if (!result.rows[0]) throw httpError(404, 'No active account found for that email address.');

  const user = result.rows[0];
  const token = crypto.randomBytes(32).toString('hex');
  resetTokens.set(token, {
    userId: user.id,
    email: user.email,
    firstName: user.first_name,
    expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour
  });

  await notifications.notifyPasswordReset(pool, {
    userId: user.id,
    userEmail: user.email,
    firstName: user.first_name,
    resetToken: token,
  });

  send(res, 200, { status: 'reset_email_sent', message: 'Password reset email sent.' });
}

async function confirmPasswordReset(req, res) {
  const body = await readJson(req);
  const token = String(body.token || '').trim();
  const password = String(body.password || '');

  if (!token) throw httpError(400, 'Reset token is required.');
  if (password.length < 12) throw httpError(400, 'New password must be at least 12 characters.');

  const entry = resetTokens.get(token);
  if (!entry || Date.now() > entry.expiresAt) {
    resetTokens.delete(token);
    throw httpError(400, 'Reset token is invalid or has expired.');
  }

  const result = await pool.query(
    `update users
     set password_hash = crypt($2, gen_salt('bf', 12)),
         force_password_change = false,
         failed_login_attempts = 0,
         locked_until = null,
         password_changed_at = current_timestamp,
         updated_at = current_timestamp
     where id = $1
       and is_active = true
     returning id, email`,
    [entry.userId, password]
  );
  if (!result.rows[0]) throw httpError(404, 'No active account found.');

  resetTokens.delete(token);
  send(res, 200, { status: 'password_updated' });
}

async function createUser(req, res) {
  const body = await readJson(req);
  const actorEmail = String(body.created_by || body.actor_email || '').trim().toLowerCase();
  const roleName = ROLE_MAP[body.role_id] || body.role_name || body.role_id;
  const departmentCode = body.department_id || null;

  validateCreateUser(body, actorEmail, roleName);

  const actorResult = await pool.query(
    `select id
     from users
     where lower(email) = lower($1)
       and is_active = true
       and is_superuser = true
     limit 1`,
    [actorEmail]
  );
  const actor = actorResult.rows[0];
  if (!actor) throw httpError(403, 'Only an active superuser can create users.');

  const roleResult = await pool.query(
    `select id from roles where lower(name) = lower($1) and is_active = true limit 1`,
    [roleName]
  );
  const role = roleResult.rows[0];
  if (!role) throw httpError(400, `Role not found: ${roleName}`);

  const departmentId = departmentCode
    ? await resolveDepartmentId(departmentCode)
    : null;

  const result = await pool.query(
    `select create_user_as_superuser(
      $1::uuid,
      $2::text,
      $3::text,
      $4::text,
      $5::text,
      $6::uuid,
      $7::uuid,
      $8::text,
      $9::boolean,
      $10::boolean,
      $11::boolean
    ) as id`,
    [
      actor.id,
      body.email,
      body.first_name,
      body.last_name,
      body.phone || null,
      role.id,
      departmentId,
      body.temp_password,
      body.force_password_change !== false,
      body.is_active !== false,
      body.is_superuser === true,
    ]
  );

  const created = await pool.query(
    `select u.id, u.email, u.first_name, u.last_name, u.phone, u.is_active,
            u.is_superuser, u.force_password_change, r.name as role
     from users u
     join roles r on r.id = u.role_id
     where u.id = $1`,
    [result.rows[0].id]
  );

  const newUser = toClientUser(created.rows[0]);

  await notifications.notifyWelcome(pool, {
    user: { id: newUser.id, email: newUser.email, firstName: newUser.firstName, first_name: newUser.firstName },
    tempPassword: body.temp_password,
  });

  send(res, 201, newUser);
}

// ── Dashboard ────────────────────────────────────────────────────────────────

async function getDashboard(res) {
  const [summary, pending, recent, employees] = await Promise.all([
    pool.query(`SELECT * FROM v_contract_summary`),
    pool.query(`SELECT COUNT(*) as count FROM approval_workflows WHERE status = 'Pending'`),
    pool.query(`
      SELECT c.contract_number, c.title, c.status, c.created_at, c.salary,
             e.first_name, e.last_name
      FROM contracts c
      JOIN employees e ON e.id = c.employee_id
      ORDER BY c.created_at DESC LIMIT 5
    `),
    pool.query(`SELECT COUNT(*) as count FROM employees WHERE is_active = true AND employment_status = 'Active'`),
  ]);
  const s = summary.rows[0] || {};
  send(res, 200, {
    totalContracts: Number(s.total_contracts || 0),
    draftCount: Number(s.draft_count || 0),
    reviewCount: Number(s.review_count || 0),
    approvedCount: Number(s.approved_count || 0),
    signedCount: Number(s.signed_count || 0),
    avgProcessingDays: parseFloat(s.avg_processing_days || 0).toFixed(1),
    pendingApprovals: Number(pending.rows[0].count),
    activeEmployees: Number(employees.rows[0].count),
    recentContracts: recent.rows.map(toClientContract),
  });
}

// ── Employees ────────────────────────────────────────────────────────────────

async function listEmployees(req, res) {
  const url = new URL(req.url, `http://localhost`);
  const search = url.searchParams.get('search') || '';
  const status = url.searchParams.get('status') || '';
  const dept   = url.searchParams.get('department') || '';
  const page   = Math.max(1, Number(url.searchParams.get('page') || 1));
  const limit  = Math.min(100, Number(url.searchParams.get('limit') || 50));
  const offset = (page - 1) * limit;

  const conditions = ['e.is_active = true'];
  const params = [];
  if (search) { params.push(`%${search}%`); conditions.push(`(e.first_name ILIKE $${params.length} OR e.last_name ILIKE $${params.length} OR e.email ILIKE $${params.length} OR e.employee_id ILIKE $${params.length})`); }
  if (status) { params.push(status); conditions.push(`e.employment_status = $${params.length}`); }
  if (dept)   { params.push(dept);   conditions.push(`d.name ILIKE $${params.length}`); }

  const where = conditions.join(' AND ');
  params.push(limit, offset);

  const [rows, total] = await Promise.all([
    pool.query(`
      SELECT e.id, e.employee_id, e.first_name, e.last_name, e.email, e.phone,
             e.job_title, e.employment_type, e.employment_status, e.hire_date,
             d.name as department,
             (SELECT COUNT(*) FROM contracts c WHERE c.employee_id = e.id) as contract_count
      FROM employees e
      LEFT JOIN departments d ON d.id = e.department_id
      WHERE ${where}
      ORDER BY e.first_name, e.last_name
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params),
    pool.query(`SELECT COUNT(*) as count FROM employees e LEFT JOIN departments d ON d.id = e.department_id WHERE ${where}`, params.slice(0, -2)),
  ]);

  send(res, 200, {
    data: rows.rows.map(toClientEmployee),
    total: Number(total.rows[0].count),
    page, limit,
  });
}

async function getEmployee(req, res, id) {
  const result = await pool.query(`
    SELECT e.*, d.name as department_name,
           (SELECT COUNT(*) FROM contracts c WHERE c.employee_id = e.id) as contract_count
    FROM employees e
    LEFT JOIN departments d ON d.id = e.department_id
    WHERE e.id = $1
  `, [id]);
  if (!result.rows[0]) throw httpError(404, 'Employee not found.');
  send(res, 200, toClientEmployee(result.rows[0]));
}

async function createEmployee(req, res) {
  const body = await readJson(req);
  const required = ['first_name', 'last_name', 'email', 'job_title', 'employment_type'];
  for (const f of required) {
    if (!String(body[f] || '').trim()) throw httpError(400, `${f} is required.`);
  }

  const lastEmp = await pool.query(`SELECT employee_id FROM employees ORDER BY employee_id DESC LIMIT 1`);
  const lastNum = lastEmp.rows[0] ? parseInt(lastEmp.rows[0].employee_id.replace('EMP-', ''), 10) : 0;
  const newEmpId = `EMP-${String(lastNum + 1).padStart(3, '0')}`;

  const deptId = body.department_id ? await resolveDepartmentId(body.department_id) : null;

  const result = await pool.query(`
    INSERT INTO employees (employee_id, first_name, last_name, email, phone,
      date_of_birth, id_number, job_title, employment_type, employment_status,
      hire_date, department_id, address, city, province, country, nationality, created_by)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'Active',$10,$11,$12,$13,$14,$15,'South African',$16)
    RETURNING id
  `, [newEmpId, body.first_name, body.last_name, body.email, body.phone || null,
      body.date_of_birth || null, body.id_number || null, body.job_title, body.employment_type,
      body.hire_date || new Date().toISOString().slice(0, 10),
      deptId, body.address || null, body.city || null, body.province || null,
      body.country || 'South Africa', body.created_by || null]);

  const created = await pool.query(`
    SELECT e.*, d.name as department_name FROM employees e
    LEFT JOIN departments d ON d.id = e.department_id WHERE e.id = $1
  `, [result.rows[0].id]);

  send(res, 201, toClientEmployee(created.rows[0]));
}

// ── Contracts ────────────────────────────────────────────────────────────────

async function listContracts(req, res) {
  const url = new URL(req.url, `http://localhost`);
  const search = url.searchParams.get('search') || '';
  const status = url.searchParams.get('status') || '';
  const page   = Math.max(1, Number(url.searchParams.get('page') || 1));
  const limit  = Math.min(100, Number(url.searchParams.get('limit') || 50));
  const offset = (page - 1) * limit;

  const conditions = ['c.is_active = true'];
  const params = [];
  if (search) { params.push(`%${search}%`); conditions.push(`(c.contract_number ILIKE $${params.length} OR c.title ILIKE $${params.length} OR e.first_name ILIKE $${params.length} OR e.last_name ILIKE $${params.length})`); }
  if (status) { params.push(status); conditions.push(`c.status = $${params.length}`); }

  const where = conditions.join(' AND ');
  params.push(limit, offset);

  const [rows, total] = await Promise.all([
    pool.query(`
      SELECT c.id, c.contract_number, c.title, c.status, c.salary, c.currency,
             c.employment_type, c.start_date, c.end_date, c.created_at, c.submitted_at,
             c.approved_at, c.signed_at,
             e.first_name, e.last_name, e.employee_id, e.job_title,
             ct.name as contract_type
      FROM contracts c
      JOIN employees e ON e.id = c.employee_id
      JOIN contract_types ct ON ct.id = c.contract_type_id
      WHERE ${where}
      ORDER BY c.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params),
    pool.query(`
      SELECT COUNT(*) as count FROM contracts c
      JOIN employees e ON e.id = c.employee_id
      WHERE ${where}
    `, params.slice(0, -2)),
  ]);

  send(res, 200, {
    data: rows.rows.map(toClientContract),
    total: Number(total.rows[0].count),
    page, limit,
  });
}

async function getContract(req, res, id) {
  const result = await pool.query(`
    SELECT c.*, e.first_name, e.last_name, e.employee_id as emp_code, e.email as emp_email,
           ct.name as contract_type, t.name as template_name
    FROM contracts c
    JOIN employees e ON e.id = c.employee_id
    JOIN contract_types ct ON ct.id = c.contract_type_id
    JOIN templates t ON t.id = c.template_id
    WHERE c.id = $1
  `, [id]);
  if (!result.rows[0]) throw httpError(404, 'Contract not found.');

  const details = await pool.query(`SELECT field_name, field_value FROM contract_details WHERE contract_id = $1`, [id]);
  const approvals = await pool.query(`
    SELECT aw.*, u.first_name, u.last_name, u.email
    FROM approval_workflows aw
    JOIN users u ON u.id = aw.approver_id
    WHERE aw.contract_id = $1
    ORDER BY aw.step_number
  `, [id]);

  const row = result.rows[0];
  send(res, 200, {
    ...toClientContract(row),
    templateName: row.template_name,
    details: Object.fromEntries(details.rows.map(d => [d.field_name, d.field_value])),
    approvalWorkflow: approvals.rows.map(a => ({
      id: a.id, step: a.step_number, status: a.status,
      approver: `${a.first_name} ${a.last_name}`, approverEmail: a.email,
      comment: a.comment, decidedAt: a.decision_date,
    })),
  });
}

async function createContract(req, res) {
  const body = await readJson(req);
  const required = ['employee_id', 'contract_type_id', 'template_id', 'start_date', 'salary', 'employment_type', 'created_by'];
  for (const f of required) {
    if (!body[f]) throw httpError(400, `${f} is required.`);
  }

  const lastC = await pool.query(`SELECT contract_number FROM contracts ORDER BY created_at DESC LIMIT 1`);
  const year = new Date().getFullYear();
  const lastNum = lastC.rows[0] ? parseInt(lastC.rows[0].contract_number.split('-')[2] || '0') : 0;
  const num = `RMP-${year}-${String(lastNum + 1).padStart(3, '0')}`;

  const result = await pool.query(`
    INSERT INTO contracts (contract_number, employee_id, contract_type_id, template_id,
      title, status, salary, employment_type, start_date, end_date,
      probation_period_months, notice_period_days, created_by)
    VALUES ($1,$2,$3,$4,$5,'Draft',$6,$7,$8,$9,$10,$11,$12)
    RETURNING id
  `, [num, body.employee_id, body.contract_type_id, body.template_id,
      body.title || null, body.salary, body.employment_type,
      body.start_date, body.end_date || null,
      body.probation_period_months || 3, body.notice_period_days || 30,
      body.created_by]);

  const created = await getContractRow(result.rows[0].id);
  send(res, 201, toClientContract(created));
}

async function submitContract(req, res, id) {
  const body = await readJson(req);
  const result = await pool.query(`
    UPDATE contracts SET status = 'Review', submitted_at = NOW(), updated_at = NOW()
    WHERE id = $1 AND status = 'Draft'
    RETURNING id, contract_number, title, created_by, employee_id
  `, [id]);
  if (!result.rows[0]) throw httpError(400, 'Contract must be in Draft status to submit.');
  const contract = result.rows[0];

  // Ensure at least one approval workflow step exists; if not, create one for the first director
  const existing = await pool.query(
    `SELECT id FROM approval_workflows WHERE contract_id = $1 LIMIT 1`, [id]
  );
  if (!existing.rows[0]) {
    const director = await pool.query(
      `SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id
       WHERE r.name ILIKE '%director%' AND u.is_active = true LIMIT 1`
    );
    if (director.rows[0]) {
      await pool.query(
        `INSERT INTO approval_workflows (contract_id, approver_id, step_number, status)
         VALUES ($1, $2, 1, 'Pending')`,
        [id, director.rows[0].id]
      );
    }
  }

  // Notify all pending approvers
  const approvers = await pool.query(
    `SELECT aw.id, u.id as user_id, u.email, u.first_name, u.last_name
     FROM approval_workflows aw
     JOIN users u ON u.id = aw.approver_id
     WHERE aw.contract_id = $1 AND aw.status = 'Pending'
     ORDER BY aw.step_number`,
    [id]
  );

  const submitter = body.submitted_by_name || 'HR';
  await Promise.all(approvers.rows.map(a =>
    notifications.notifyApprovalRequested(pool, {
      approverId: a.user_id,
      approverEmail: a.email,
      approverName: `${a.first_name} ${a.last_name}`,
      contract: { id, title: contract.title, reference: contract.contract_number },
      submittedByName: submitter,
    })
  ));

  send(res, 200, { status: 'submitted', contractNumber: contract.contract_number });
}

async function updateContractStatus(req, res, id) {
  const body = await readJson(req);
  if (!body.status) throw httpError(400, 'status is required.');
  const valid = ['Draft', 'Review', 'Approved', 'Signed', 'Executed', 'Rejected', 'Archived'];
  if (!valid.includes(body.status)) throw httpError(400, `Invalid status. Must be one of: ${valid.join(', ')}`);

  const result = await pool.query(`
    UPDATE contracts SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id
  `, [body.status, id]);
  if (!result.rows[0]) throw httpError(404, 'Contract not found.');
  send(res, 200, { status: body.status });
}

async function sendContractToEmployee(req, res, id) {
  const body = await readJson(req);

  const result = await pool.query(`
    SELECT c.id, c.title, c.contract_number, c.status,
           e.id as employee_id, e.email as emp_email, e.first_name as emp_first, e.last_name as emp_last,
           u.id as creator_id, u.email as creator_email, u.first_name as hr_first, u.last_name as hr_last
    FROM contracts c
    JOIN employees e ON e.id = c.employee_id
    JOIN users u ON u.id = c.created_by
    WHERE c.id = $1
  `, [id]);
  if (!result.rows[0]) throw httpError(404, 'Contract not found.');

  const r = result.rows[0];
  if (!['Approved', 'Signed'].includes(r.status)) {
    throw httpError(400, 'Contract must be Approved before sending to the employee.');
  }
  if (!r.emp_email) throw httpError(400, 'Employee has no email address on record.');

  // Mark as Signed
  await pool.query(
    `UPDATE contracts SET status = 'Signed', signed_at = NOW(), updated_at = NOW() WHERE id = $1`,
    [id]
  );

  const senderName = body.sender_name || `${r.hr_first} ${r.hr_last}`;

  // Notify employee
  await notifications.notifyContractSent(pool, {
    recipientId: r.employee_id,
    recipientEmail: r.emp_email,
    recipientName: `${r.emp_first} ${r.emp_last}`,
    contract: {
      id,
      title: r.title,
      reference: r.contract_number,
      senderName,
    },
  });

  // Also notify HR that the send succeeded
  await notifications.notifyContractApproved(pool, {
    recipientId: r.creator_id,
    recipientEmail: r.creator_email,
    recipientName: `${r.hr_first} ${r.hr_last}`,
    contract: {
      id,
      title: r.title,
      reference: r.contract_number,
      approverName: `${r.emp_first} ${r.emp_last} (employee)`,
    },
  });

  send(res, 200, {
    status: 'sent',
    sentTo: r.emp_email,
    contractNumber: r.contract_number,
  });
}

async function getContractRow(id) {
  const r = await pool.query(`
    SELECT c.*, e.first_name, e.last_name, e.employee_id as emp_code,
           ct.name as contract_type
    FROM contracts c
    JOIN employees e ON e.id = c.employee_id
    JOIN contract_types ct ON ct.id = c.contract_type_id
    WHERE c.id = $1
  `, [id]);
  return r.rows[0];
}

// ── Approvals ────────────────────────────────────────────────────────────────

async function listApprovals(req, res) {
  const url = new URL(req.url, `http://localhost`);
  const status = url.searchParams.get('status') || 'Pending';

  const result = await pool.query(`
    SELECT aw.id, aw.step_number, aw.status, aw.comment, aw.created_at, aw.decision_date,
           c.id as contract_id, c.contract_number, c.title, c.status as contract_status,
           c.employment_type, c.salary,
           e.first_name, e.last_name, e.employee_id as emp_code,
           u.first_name as approver_first, u.last_name as approver_last, u.email as approver_email
    FROM approval_workflows aw
    JOIN contracts c ON c.id = aw.contract_id
    JOIN employees e ON e.id = c.employee_id
    JOIN users u ON u.id = aw.approver_id
    WHERE ($1 = 'all' OR aw.status = $1)
    ORDER BY aw.created_at DESC
    LIMIT 100
  `, [status]);

  send(res, 200, { data: result.rows.map(toClientApproval) });
}

async function approveWorkflow(req, res, id) {
  const body = await readJson(req);
  const result = await pool.query(`
    UPDATE approval_workflows
    SET status = 'Approved', comment = $1, decision_date = NOW(), updated_at = NOW()
    WHERE id = $2 AND status = 'Pending'
    RETURNING contract_id, step_number
  `, [body.comment || null, id]);
  if (!result.rows[0]) throw httpError(404, 'Approval workflow item not found or already actioned.');

  const { contract_id, step_number } = result.rows[0];

  // Check if there's a next step; if not, advance contract status
  const nextStep = await pool.query(`
    SELECT id FROM approval_workflows WHERE contract_id = $1 AND step_number = $2 AND status = 'Pending'
  `, [contract_id, step_number + 1]);

  if (!nextStep.rows[0]) {
    await pool.query(`UPDATE contracts SET status = 'Approved', approved_at = NOW() WHERE id = $1`, [contract_id]);

    // Notify the HR officer who created the contract
    const contractRow = await pool.query(`
      SELECT c.title, c.contract_number, u.id as creator_id, u.email as creator_email,
             u.first_name, u.last_name, aw2.first_name as approver_first, aw2.last_name as approver_last
      FROM contracts c
      JOIN users u ON u.id = c.created_by
      LEFT JOIN (
        SELECT aw.contract_id, u2.first_name, u2.last_name
        FROM approval_workflows aw JOIN users u2 ON u2.id = aw.approver_id
        WHERE aw.id = $1
      ) aw2 ON aw2.contract_id = c.id
      WHERE c.id = $2
    `, [id, contract_id]);

    if (contractRow.rows[0]) {
      const r = contractRow.rows[0];
      await notifications.notifyContractApproved(pool, {
        recipientId: r.creator_id,
        recipientEmail: r.creator_email,
        recipientName: `${r.first_name} ${r.last_name}`,
        contract: {
          id: contract_id,
          title: r.title,
          reference: r.contract_number,
          approverName: r.approver_first ? `${r.approver_first} ${r.approver_last}` : 'Approver',
        },
      });
    }
  }

  send(res, 200, { status: 'approved' });
}

async function rejectWorkflow(req, res, id) {
  const body = await readJson(req);
  const reason = body.comment || 'Rejected by reviewer.';
  const result = await pool.query(`
    UPDATE approval_workflows
    SET status = 'Rejected', comment = $1, decision_date = NOW(), updated_at = NOW()
    WHERE id = $2 AND status = 'Pending'
    RETURNING contract_id
  `, [reason, id]);
  if (!result.rows[0]) throw httpError(404, 'Approval workflow item not found or already actioned.');

  const contract_id = result.rows[0].contract_id;
  await pool.query(`UPDATE contracts SET status = 'Rejected' WHERE id = $1`, [contract_id]);

  // Notify the HR officer who created the contract
  const contractRow = await pool.query(`
    SELECT c.title, c.contract_number, u.id as creator_id, u.email as creator_email,
           u.first_name, u.last_name, u2.first_name as approver_first, u2.last_name as approver_last
    FROM contracts c
    JOIN users u ON u.id = c.created_by
    LEFT JOIN approval_workflows aw ON aw.id = $1
    LEFT JOIN users u2 ON u2.id = aw.approver_id
    WHERE c.id = $2
  `, [id, contract_id]);

  if (contractRow.rows[0]) {
    const r = contractRow.rows[0];
    await notifications.notifyContractRejected(pool, {
      recipientId: r.creator_id,
      recipientEmail: r.creator_email,
      recipientName: `${r.first_name} ${r.last_name}`,
      contract: {
        id: contract_id,
        title: r.title,
        reference: r.contract_number,
        approverName: r.approver_first ? `${r.approver_first} ${r.approver_last}` : 'Approver',
      },
      reason,
    });
  }

  send(res, 200, { status: 'rejected' });
}

// ── Templates ────────────────────────────────────────────────────────────────

async function listTemplates(res) {
  const result = await pool.query(`
    SELECT t.id, t.name, t.description, t.version, t.is_active, t.created_at, t.updated_at,
           ct.name as contract_type, ct.code as contract_type_code
    FROM templates t
    JOIN contract_types ct ON ct.id = t.contract_type_id
    ORDER BY t.name
  `);
  send(res, 200, { data: result.rows });
}

// ── Analytics ────────────────────────────────────────────────────────────────

async function getAnalytics(res) {
  const [byStatus, byType, byMonth, topEmployees, sla] = await Promise.all([
    pool.query(`SELECT status, COUNT(*) as count FROM contracts GROUP BY status ORDER BY count DESC`),
    pool.query(`
      SELECT ct.name, COUNT(c.id) as count, ROUND(AVG(c.salary)::numeric, 0) as avg_salary
      FROM contracts c JOIN contract_types ct ON ct.id = c.contract_type_id
      GROUP BY ct.name ORDER BY count DESC
    `),
    pool.query(`
      SELECT TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') as month,
             COUNT(*) as count
      FROM contracts
      WHERE created_at >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at)
    `),
    pool.query(`
      SELECT e.first_name, e.last_name, COUNT(c.id) as contract_count
      FROM employees e JOIN contracts c ON c.employee_id = e.id
      GROUP BY e.id, e.first_name, e.last_name
      ORDER BY contract_count DESC LIMIT 5
    `),
    pool.query(`
      SELECT ROUND(AVG(EXTRACT(EPOCH FROM (approved_at - submitted_at)) / 3600)::numeric, 1) as avg_approval_hours,
             COUNT(*) FILTER (WHERE approved_at IS NOT NULL) as approved_total,
             COUNT(*) FILTER (WHERE status = 'Rejected') as rejected_total
      FROM contracts WHERE submitted_at IS NOT NULL
    `),
  ]);

  send(res, 200, {
    byStatus: byStatus.rows,
    byType: byType.rows,
    byMonth: byMonth.rows,
    topEmployees: topEmployees.rows,
    sla: sla.rows[0],
  });
}

// ── Audit logs ───────────────────────────────────────────────────────────────

async function listAuditLogs(req, res) {
  const url = new URL(req.url, `http://localhost`);
  const type   = url.searchParams.get('type') || '';
  const page   = Math.max(1, Number(url.searchParams.get('page') || 1));
  const limit  = Math.min(100, Number(url.searchParams.get('limit') || 50));
  const offset = (page - 1) * limit;

  const params = [];
  const conditions = [];
  if (type) { params.push(type); conditions.push(`al.entity_type = $${params.length}`); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(limit, offset);

  const [rows, total] = await Promise.all([
    pool.query(`
      SELECT al.id, al.entity_type, al.action, al.new_values, al.change_reason,
             al.created_at, u.first_name, u.last_name, u.email
      FROM audit_logs al
      JOIN users u ON u.id = al.changed_by
      ${where}
      ORDER BY al.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params),
    pool.query(`SELECT COUNT(*) as count FROM audit_logs al ${where}`, params.slice(0, -2)),
  ]);

  send(res, 200, {
    data: rows.rows.map(r => ({
      id: r.id,
      entityType: r.entity_type,
      action: r.action,
      details: r.change_reason || (r.new_values?.message) || '',
      actor: `${r.first_name} ${r.last_name}`,
      actorEmail: r.email,
      createdAt: r.created_at,
    })),
    total: Number(total.rows[0].count),
    page, limit,
  });
}

// ── Direct notification (frontend-triggered emails) ──────────────────────────

async function sendDirectNotification(req, res) {
  const body = await readJson(req);
  const { type, to, recipientName, contractTitle, contractRef, submittedBy, approverName, reason } = body;

  if (!type || !to) throw httpError(400, 'type and to are required.');

  const contract = {
    id: contractRef || 'unknown',
    title: contractTitle || 'Employment Contract',
    reference: contractRef || 'unknown',
    approverName: approverName || submittedBy || '—',
    senderName: submittedBy || '—',
  };

  const emailService = require('./services/emailService');

  const handlers = {
    approval_requested: () => emailService.sendApprovalRequestedEmail({
      to,
      approverName: recipientName || to,
      contract,
      submittedByName: submittedBy || 'HR',
    }),
    contract_approved: () => emailService.sendContractApprovedEmail({
      to,
      recipientName: recipientName || to,
      contract,
    }),
    contract_rejected: () => emailService.sendContractRejectedEmail({
      to,
      recipientName: recipientName || to,
      contract,
      reason: reason || 'Reviewer requested revisions.',
    }),
    contract_sent: () => emailService.sendContractSentEmail({
      to,
      recipientName: recipientName || to,
      contract,
    }),
  };

  const handler = handlers[type];
  if (!handler) throw httpError(400, `Unknown notification type: ${type}`);

  try {
    await handler();
    console.log(`[notify] ${type} → ${to}`);
    send(res, 200, { status: 'sent', type, to });
  } catch (err) {
    console.error(`[notify] Failed to send ${type} to ${to}:`, err.message);
    send(res, 500, { status: 'failed', error: err.message });
  }
}

// ── Notifications ────────────────────────────────────────────────────────────

async function listNotifications(req, res) {
  const url = new URL(req.url, `http://localhost`);
  const userId = url.searchParams.get('user_id');
  if (!userId) throw httpError(400, 'user_id is required.');

  const result = await pool.query(`
    SELECT id, notification_type, title, message, is_read, created_at,
           related_entity_type, related_entity_id
    FROM notifications WHERE recipient_id = $1
    ORDER BY created_at DESC LIMIT 50
  `, [userId]);

  send(res, 200, { data: result.rows });
}

async function markNotificationsRead(req, res) {
  const body = await readJson(req);
  if (!body.user_id) throw httpError(400, 'user_id is required.');
  await pool.query(`
    UPDATE notifications SET is_read = true, read_at = NOW()
    WHERE recipient_id = $1 AND is_read = false
  `, [body.user_id]);
  send(res, 200, { status: 'marked_read' });
}

// ── Departments ──────────────────────────────────────────────────────────────

async function listDepartments(res) {
  const result = await pool.query(`SELECT id, name, code, description FROM departments WHERE is_active = true ORDER BY name`);
  send(res, 200, { data: result.rows });
}

// ── Client mappers ───────────────────────────────────────────────────────────

function toClientContract(row) {
  return {
    id: row.id,
    contractNumber: row.contract_number,
    title: row.title,
    status: row.status,
    salary: row.salary,
    currency: row.currency || 'ZAR',
    employmentType: row.employment_type,
    startDate: row.start_date,
    endDate: row.end_date,
    createdAt: row.created_at,
    submittedAt: row.submitted_at,
    approvedAt: row.approved_at,
    signedAt: row.signed_at,
    contractType: row.contract_type,
    employee: row.first_name ? {
      name: `${row.first_name} ${row.last_name}`,
      firstName: row.first_name,
      lastName: row.last_name,
      employeeId: row.employee_id || row.emp_code,
      jobTitle: row.job_title,
    } : null,
  };
}

function toClientEmployee(row) {
  return {
    id: row.id,
    employeeId: row.employee_id,
    firstName: row.first_name,
    lastName: row.last_name,
    name: `${row.first_name} ${row.last_name}`,
    initials: `${row.first_name?.[0] || ''}${row.last_name?.[0] || ''}`.toUpperCase(),
    email: row.email,
    phone: row.phone,
    jobTitle: row.job_title,
    department: row.department_name || row.department,
    employmentType: row.employment_type,
    employmentStatus: row.employment_status,
    hireDate: row.hire_date,
    contractCount: Number(row.contract_count || 0),
  };
}

function toClientApproval(row) {
  return {
    id: row.id,
    step: row.step_number,
    status: row.status,
    comment: row.comment,
    createdAt: row.created_at,
    decidedAt: row.decision_date,
    contract: {
      id: row.contract_id,
      contractNumber: row.contract_number,
      title: row.title,
      status: row.contract_status,
      employmentType: row.employment_type,
      salary: row.salary,
    },
    employee: {
      name: `${row.first_name} ${row.last_name}`,
      employeeId: row.emp_code,
    },
    approver: {
      name: `${row.approver_first} ${row.approver_last}`,
      email: row.approver_email,
    },
  };
}

async function audit(req, res) {
  await readJson(req);
  send(res, 202, { status: 'accepted' });
}

async function resolveDepartmentId(code) {
  const result = await pool.query(
    `select id
     from departments
     where lower(code) = lower($1) or lower(name) = lower($1)
     limit 1`,
    [code]
  );
  if (!result.rows[0]) throw httpError(400, `Department not found: ${code}`);
  return result.rows[0].id;
}

function validateCreateUser(body, actorEmail, roleName) {
  const required = [
    ['email', body.email],
    ['first_name', body.first_name],
    ['last_name', body.last_name],
    ['temp_password', body.temp_password],
  ];
  for (const [field, value] of required) {
    if (!String(value || '').trim()) throw httpError(400, `${field} is required.`);
  }
  if (!actorEmail) throw httpError(401, 'A signed-in superuser is required.');
  if (!roleName) throw httpError(400, 'role_id is required.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.email))) {
    throw httpError(400, 'A valid email address is required.');
  }
  if (String(body.temp_password).length < 12) {
    throw httpError(400, 'Temporary password must be at least 12 characters.');
  }
}

function toClientUser(row) {
  const initials = `${row.first_name?.[0] || ''}${row.last_name?.[0] || ''}`.toUpperCase();
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    name: `${row.first_name} ${row.last_name}`.trim(),
    initials,
    phone: row.phone,
    role: row.role,
    isActive: row.is_active,
    isSuperuser: row.is_superuser,
    forcePasswordChange: row.force_password_change,
  };
}

function send(res, status, body = null) {
  res.statusCode = status;
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (body === null) return res.end();
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        req.destroy();
        reject(httpError(413, 'Request body too large.'));
      }
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(httpError(400, 'Request body must be valid JSON.'));
      }
    });
    req.on('error', reject);
  });
}

function loadEnv() {
  const fs = require('fs');
  const path = require('path');
  const envPath = path.resolve(__dirname, '../../.env');
  if (!fs.existsSync(envPath)) return process.env;

  const parsed = {};
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (!match || match[1].startsWith('#')) continue;
    parsed[match[1]] = unquote(match[2]);
  }
  return { ...parsed, ...process.env };
}

function unquote(value) {
  return String(value).replace(/^["']|["']$/g, '');
}

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function mapPgError(error) {
  if (error.statusCode) return error;
  if (error.code === '23505') return httpError(409, 'A user with that email address already exists.');
  if (error.code === '23503') return httpError(400, 'The selected role or department no longer exists.');
  if (error.code === '23514') return httpError(400, error.detail || 'The request violates a database validation rule.');
  if (error.code === 'P0001') return httpError(400, error.message);
  return error;
}
