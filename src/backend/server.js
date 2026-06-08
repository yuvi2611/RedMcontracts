const http = require('http');
const { URL } = require('url');
const { Pool } = require('pg');

const env = loadEnv();
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

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'OPTIONS') return send(res, 204);

  try {
    if (req.method === 'GET' && url.pathname === '/health') return health(res);
    if (req.method === 'POST' && url.pathname === '/api/auth/login') return login(req, res);
    if (req.method === 'POST' && url.pathname === '/api/auth/password-reset/request') return requestPasswordReset(req, res);
    if (req.method === 'POST' && url.pathname === '/api/auth/password-reset/confirm') return confirmPasswordReset(req, res);
    if (req.method === 'POST' && url.pathname === '/api/users') return createUser(req, res);
    if (req.method === 'POST' && url.pathname === '/api/audit') return audit(req, res);
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
  const email = String(body.email || '').trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw httpError(400, 'A valid email address is required.');
  }

  const result = await pool.query(
    `select id from users where lower(email) = lower($1) and is_active = true limit 1`,
    [email]
  );
  if (!result.rows[0]) throw httpError(404, 'No active account found for that email address.');

  send(res, 200, {
    status: 'reset_code_issued',
    code: 'RESET-2026',
    message: 'Development reset code issued.',
  });
}

async function confirmPasswordReset(req, res) {
  const body = await readJson(req);
  const email = String(body.email || '').trim().toLowerCase();
  const code = String(body.code || '').trim();
  const password = String(body.password || '');

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw httpError(400, 'A valid email address is required.');
  }
  if (code !== 'RESET-2026') throw httpError(400, 'Invalid reset code.');
  if (password.length < 12) throw httpError(400, 'New password must be at least 12 characters.');

  const result = await pool.query(
    `update users
     set password_hash = crypt($2, gen_salt('bf', 12)),
         force_password_change = false,
         failed_login_attempts = 0,
         locked_until = null,
         password_changed_at = current_timestamp,
         updated_at = current_timestamp
     where lower(email) = lower($1)
       and is_active = true
     returning id, email`,
    [email, password]
  );
  if (!result.rows[0]) throw httpError(404, 'No active account found for that email address.');

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

  send(res, 201, toClientUser(created.rows[0]));
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
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
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
