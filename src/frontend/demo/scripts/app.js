const PAGE_FILES = {
  dashboard: 'demo/components/pages/dashboard.html',
  'create-user': 'demo/components/pages/create-user.html',
  wizard: 'demo/components/pages/wizard.html',
  preview: 'demo/components/pages/preview.html',
  contracts: 'demo/components/pages/contracts.html',
  analytics: 'demo/components/pages/analytics.html',
  employees: 'demo/components/pages/employees.html',
  templates: 'demo/components/pages/templates.html',
  approvals: 'demo/components/pages/approvals.html',
  audit: 'demo/components/pages/audit.html',
  settings: 'demo/components/pages/settings.html'
};

// Cache-bust all component fetches so edits are always picked up on reload
const CACHE_BUST = `?v=${Date.now()}`;

async function loadComponent(targetId, url) {
  const el = document.getElementById(targetId);
  if (!el) return;
  const res = await fetch(url + CACHE_BUST);
  el.innerHTML = await res.text();
}

async function loadPages() {
  const container = document.getElementById('pages-container');
  if (!container) return;

  for (const [name, url] of Object.entries(PAGE_FILES)) {
    const res = await fetch(url + CACHE_BUST);
    const html = await res.text();
    const wrapper = document.createElement('div');
    wrapper.className = 'page';
    wrapper.id = 'page-' + name;
    wrapper.innerHTML = html;
    container.appendChild(wrapper);
  }
}

async function initApp() {
  await loadPages();
  initToastContainer();
  bindContractForm();
  initAuthShell();
  initRouter();
}

document.addEventListener('DOMContentLoaded', initApp);

function closeModal() {
  document.getElementById('welcomeModal')?.classList.add('hidden');
}

/* ═══════════════════════════════════════════
   TOAST NOTIFICATION SYSTEM
═══════════════════════════════════════════ */

function initToastContainer() {
  if (document.getElementById('toast-container')) return;
  const el = document.createElement('div');
  el.id = 'toast-container';
  document.body.appendChild(el);
}

const TOAST_ICONS = {
  success: '✓',
  error:   '✕',
  warning: '!',
  info:    'i'
};

function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <div class="toast-icon">${TOAST_ICONS[type] || 'i'}</div>
    <span>${message}</span>
    <button class="toast-close" onclick="dismissToast(this.parentElement)">×</button>
  `;

  container.appendChild(toast);

  setTimeout(() => dismissToast(toast), duration);
}

function dismissToast(toast) {
  if (!toast || toast.classList.contains('leaving')) return;
  toast.classList.add('leaving');
  setTimeout(() => toast.remove(), 260);
}

/* ═══════════════════════════════════════════
   CONTRACTS PAGE INTERACTIONS
═══════════════════════════════════════════ */

function setContractsView(view) {
  const grid = document.getElementById('contractsGridView');
  const list = document.getElementById('contractsListView');
  const btnGrid = document.getElementById('viewGrid');
  const btnList = document.getElementById('viewList');
  if (!grid || !list) return;

  if (view === 'grid') {
    grid.style.display = 'block';
    list.style.display = 'none';
    btnGrid?.classList.add('active');
    btnList?.classList.remove('active');
  } else {
    grid.style.display = 'none';
    list.style.display = 'block';
    btnList?.classList.add('active');
    btnGrid?.classList.remove('active');
  }
}

function setContractsTab(btn, filter) {
  document.querySelectorAll('#contractsTabs .filter-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');

  const rows = document.querySelectorAll('.contract-row');
  let visible = 0;
  rows.forEach(row => {
    const match = filter === 'all' || row.dataset.status === filter;
    row.style.display = match ? '' : 'none';
    if (match) visible++;
  });

  const countEl = document.getElementById('contractsCount');
  if (countEl) countEl.textContent = `Showing ${visible} of 142 contracts`;
}

function filterContracts(query) {
  const q = query.toLowerCase().trim();
  const rows = document.querySelectorAll('.contract-row');
  let visible = 0;
  rows.forEach(row => {
    const searchable = (row.dataset.search || '').toLowerCase();
    const match = !q || searchable.includes(q);
    row.style.display = match ? '' : 'none';
    if (match) visible++;
  });

  const countEl = document.getElementById('contractsCount');
  if (countEl) countEl.textContent = `Showing ${visible} of 142 contracts`;
}

/* ═══════════════════════════════════════════
   APPROVALS PAGE INTERACTIONS
═══════════════════════════════════════════ */

function setApprovalsTab(btn, filter) {
  document.querySelectorAll('#approvalsTabs .filter-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');

  const cards = document.querySelectorAll('#approvalsList .approval-card');
  cards.forEach(card => {
    const match = filter === 'all' || card.dataset.route === filter;
    card.style.display = match ? '' : 'none';
  });
}

function approveItem(btn, name) {
  const card = btn.closest('.approval-card');
  if (!card) return;

  btn.textContent = '✓ Approved';
  btn.style.background = 'var(--success)';
  btn.style.pointerEvents = 'none';

  setTimeout(() => {
    card.style.transition = 'opacity .4s ease, transform .4s ease, max-height .4s ease';
    card.style.opacity = '0';
    card.style.transform = 'translateX(20px)';
    setTimeout(() => {
      card.style.display = 'none';
      showToast(`${name} contract approved — routed to next stage.`, 'success');
    }, 400);
  }, 500);
}

/* ═══════════════════════════════════════════
   CREATE USER PAGE
═══════════════════════════════════════════ */

const API_BASE = 'http://localhost:5000';

function initCreateUser() {
  cuCheckSuperuserAccess();
  cuCheckApiStatus();
  const form = document.getElementById('createUserForm');
  if (form) {
    form.removeEventListener('submit', cuHandleSubmit);
    form.addEventListener('submit', cuHandleSubmit);
  }
}

function cuCheckSuperuserAccess() {
  const session = typeof getSession === 'function' ? getSession() : null;
  const guard = document.getElementById('cuSuperuserGuard');
  const formWrap = document.getElementById('cuFormWrap');
  if (!session?.isSuperuser) {
    guard?.classList.remove('hidden');
    formWrap?.classList.add('hidden');
  }
}

async function cuCheckApiStatus() {
  const dot  = document.getElementById('cuApiDot');
  const text = document.getElementById('cuApiStatusText');
  if (!dot || !text) return;

  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      dot.className  = 'cu-api-dot online';
      text.textContent = 'API online — writes go to PostgreSQL';
      text.style.color = 'var(--success)';
    } else {
      cuApiOffline(dot, text);
    }
  } catch {
    cuApiOffline(dot, text);
  }
}

function cuApiOffline(dot, text) {
  dot.className  = 'cu-api-dot offline';
  text.textContent = 'API offline — demo mode: user saved in-session only';
  text.style.color = 'var(--amber)';
}

function cuTogglePw(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  btn.style.color = show ? 'var(--red-500)' : '';
}

function cuCheckStrength(pw) {
  const bars  = [1,2,3,4].map(i => document.getElementById(`cuSbar${i}`));
  const label = document.getElementById('cuStrengthLabel');
  if (!label) return;

  const checks = [
    pw.length >= 12,
    /[A-Z]/.test(pw) && /[a-z]/.test(pw),
    /[0-9]/.test(pw),
    /[^A-Za-z0-9]/.test(pw)
  ];
  const score = checks.filter(Boolean).length;

  const levels = [
    { color: '#ef4444', label: 'Too weak'  },
    { color: '#ef4444', label: 'Weak'      },
    { color: '#f59e0b', label: 'Fair'      },
    { color: '#3b82f6', label: 'Good'      },
    { color: '#10b981', label: 'Strong'    }
  ];

  const lvl = levels[score] || levels[0];
  bars.forEach((bar, i) => {
    bar.style.background = i < score ? lvl.color : 'var(--coal-100)';
  });
  label.textContent = pw.length === 0 ? 'Enter a password' : lvl.label;
  label.style.color = pw.length === 0 ? 'var(--coal-400)' : lvl.color;
}

function cuSetErr(fieldId, msg) {
  const el = document.getElementById(fieldId + 'Err');
  const inp = document.getElementById(fieldId);
  if (el) { el.textContent = msg; el.classList.toggle('visible', !!msg); }
  if (inp) inp.classList.toggle('is-invalid', !!msg);
}

function cuClearErrs() {
  ['cuFirstName','cuLastName','cuEmail','cuRole','cuPassword','cuConfirm'].forEach(id => cuSetErr(id, ''));
  const apiErr = document.getElementById('cuApiError');
  if (apiErr) apiErr.classList.add('hidden');
}

function cuValidate(data) {
  let ok = true;
  if (!data.firstName) { cuSetErr('cuFirstName', 'First name is required.'); ok = false; }
  if (!data.lastName)  { cuSetErr('cuLastName',  'Last name is required.');  ok = false; }
  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    cuSetErr('cuEmail', 'A valid email address is required.'); ok = false;
  }
  if (!data.roleId)   { cuSetErr('cuRole', 'Please select a role.'); ok = false; }
  if (data.password.length < 12) {
    cuSetErr('cuPassword', 'Password must be at least 12 characters.'); ok = false;
  }
  if (data.password !== data.confirm) {
    cuSetErr('cuConfirm', 'Passwords do not match.'); ok = false;
  }
  return ok;
}

async function cuHandleSubmit(e) {
  e.preventDefault();
  cuClearErrs();

  const data = {
    firstName:    document.getElementById('cuFirstName')?.value.trim(),
    lastName:     document.getElementById('cuLastName')?.value.trim(),
    email:        document.getElementById('cuEmail')?.value.trim().toLowerCase(),
    phone:        document.getElementById('cuPhone')?.value.trim() || null,
    roleId:       document.getElementById('cuRole')?.value,
    departmentId: document.getElementById('cuDept')?.value || null,
    password:     document.getElementById('cuPassword')?.value || '',
    confirm:      document.getElementById('cuConfirm')?.value || '',
    forceChange:  document.getElementById('cuForceChange')?.checked ?? true,
    isActive:     document.getElementById('cuIsActive')?.checked ?? true,
    isSuperuser:  document.getElementById('cuIsSuperuser')?.checked ?? false,
  };

  if (!cuValidate(data)) return;

  // Set loading state
  const btn   = document.getElementById('cuSubmitBtn');
  const label = document.getElementById('cuSubmitLabel');
  const spin  = document.getElementById('cuSpinner');
  btn?.classList.add('is-loading');
  if (label) label.textContent = 'Creating…';
  spin?.classList.remove('hidden');

  const payload = {
    email:                 data.email,
    first_name:            data.firstName,
    last_name:             data.lastName,
    phone:                 data.phone,
    role_id:               data.roleId,
    department_id:         data.departmentId,
    temp_password:         data.password,
    force_password_change: data.forceChange,
    is_active:             data.isActive,
    is_superuser:          data.isSuperuser,
  };

  let success = false;
  let createdUser = null;
  let apiMode = true;

  try {
    const res = await fetch(`${API_BASE}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(6000),
    });

    if (res.ok) {
      createdUser = await res.json();
      success = true;
    } else {
      const errBody = await res.json().catch(() => ({}));
      cuShowApiErr(errBody.message || `Server error (${res.status}). Check the API logs.`);
    }
  } catch (err) {
    // API offline — simulate creation in-session so demo keeps working
    apiMode = false;
    const initials = (data.firstName[0] + data.lastName[0]).toUpperCase();
    const roleLabels = {
      hr_officer: 'HR Officer', hr_manager: 'HR Manager',
      director: 'Director', administrator: 'Administrator'
    };

    createdUser = {
      id: 'demo-' + Math.random().toString(36).slice(2, 10),
      email: data.email,
      first_name: data.firstName,
      last_name:  data.lastName,
      role:       roleLabels[data.roleId] || data.roleId,
    };

    // Register in DEMO_USERS so login works this session
    if (typeof DEMO_USERS !== 'undefined') {
      DEMO_USERS.push({
        email:    data.email,
        password: data.password,
        name:     `${data.firstName} ${data.lastName}`,
        initials: initials,
        role:     roleLabels[data.roleId] || 'HR Officer',
        isSuperuser: data.isSuperuser,
        forcePasswordChange: data.forceChange,
      });
    }
    success = true;
  }

  // Reset button
  btn?.classList.remove('is-loading');
  if (label) label.textContent = 'Create User';
  spin?.classList.add('hidden');

  if (!success) return;

  // Show success panel
  document.getElementById('cuFormWrap')?.classList.add('hidden');
  const panel = document.getElementById('cuSuccessPanel');
  const sub   = document.getElementById('cuSuccessSub');
  const detail = document.getElementById('cuSuccessDetail');

  if (sub) sub.textContent = apiMode
    ? 'The account has been written to PostgreSQL via create_user_as_superuser().'
    : 'API is offline — account registered in-session for this demo. It will persist until you sign out.';

  if (detail) detail.innerHTML = [
    `<strong>Name:</strong> ${data.firstName} ${data.lastName}`,
    `<strong>Email:</strong> ${data.email}`,
    `<strong>Role:</strong> ${createdUser.role || data.roleId}`,
    `<strong>Active:</strong> ${data.isActive ? 'Yes' : 'No'}`,
    `<strong>Force password change:</strong> ${data.forceChange ? 'Yes' : 'No'}`,
    `<strong>Superuser:</strong> ${data.isSuperuser ? 'Yes' : 'No'}`,
    `<strong>ID:</strong> ${createdUser.id}`,
  ].join('<br>');

  panel?.classList.remove('hidden');
  showToast(`User ${data.firstName} ${data.lastName} created.`, 'success');
}

function cuShowApiErr(msg) {
  const banner = document.getElementById('cuApiError');
  const text   = document.getElementById('cuApiErrorText');
  if (text) text.textContent = msg;
  banner?.classList.remove('hidden');
}

function cuResetForm() {
  document.getElementById('createUserForm')?.reset();
  cuClearErrs();
  cuCheckStrength('');
}

function cuCreateAnother() {
  document.getElementById('cuSuccessPanel')?.classList.add('hidden');
  document.getElementById('cuFormWrap')?.classList.remove('hidden');
  cuResetForm();
  cuCheckApiStatus();
}

/* ═══════════════════════════════════════════
   AUDIT PAGE INTERACTIONS
═══════════════════════════════════════════ */

function setAuditTab(btn, filter) {
  document.querySelectorAll('#auditTabs .filter-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');

  const entries = document.querySelectorAll('.audit-entry');
  entries.forEach(entry => {
    const match = filter === 'all' || entry.dataset.type === filter;
    entry.style.display = match ? '' : 'none';
  });
}
