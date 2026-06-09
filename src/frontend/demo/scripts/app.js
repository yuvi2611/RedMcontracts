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
  initShellControls();
  bindContractForm();
  initAuthShell();
  initRouter();
}

document.addEventListener('DOMContentLoaded', initApp);

function closeModal() {
  document.getElementById('welcomeModal')?.classList.add('hidden');
}

const SIDEBAR_STATE_KEY = 'contractiq.sidebarCollapsed';
const PREVIEW_READY_KEY = 'contractiq.previewReady';

function canAccessPreview() {
  try {
    return sessionStorage.getItem(PREVIEW_READY_KEY) === 'true';
  } catch {
    return false;
  }
}

function setPreviewAccess(ready) {
  try {
    if (ready) {
      sessionStorage.setItem(PREVIEW_READY_KEY, 'true');
    } else {
      sessionStorage.removeItem(PREVIEW_READY_KEY);
    }
  } catch {
    // Ignore storage failures in restricted browser modes.
  }
}

function initShellControls() {
  initSidebarLabels();
  let collapsed = false;
  try {
    collapsed = localStorage.getItem(SIDEBAR_STATE_KEY) === 'true';
  } catch {
    collapsed = false;
  }
  setSidebarCollapsed(collapsed);

  document.addEventListener('click', event => {
    const menu = document.getElementById('profileMenu');
    const button = document.getElementById('profileMenuButton');
    if (!menu || menu.classList.contains('hidden')) return;
    if (menu.contains(event.target) || button?.contains(event.target)) return;
    closeProfileMenu();
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      closeProfileMenu();
      toggleFaqChat(false);
    }
  });
}

function initSidebarLabels() {
  document.querySelectorAll('.sidebar .nav-item').forEach(item => {
    const label = item.querySelector('.nav-label')?.textContent.trim()
      || item.textContent.replace(/\s+/g, ' ').trim();
    if (!item.getAttribute('aria-label')) item.setAttribute('aria-label', label);
    if (!item.title) item.title = label;
  });
}

function setSidebarCollapsed(collapsed) {
  const shell = document.getElementById('appShell');
  const toggle = document.querySelector('.sidebar-toggle');
  shell?.classList.toggle('sidebar-collapsed', collapsed);
  toggle?.setAttribute('aria-expanded', String(!collapsed));
  toggle?.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
  toggle?.setAttribute('data-tooltip', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
  try {
    localStorage.setItem(SIDEBAR_STATE_KEY, String(collapsed));
  } catch {
    // Ignore storage failures in restricted browser modes.
  }
}

function toggleSidebar() {
  const shell = document.getElementById('appShell');
  setSidebarCollapsed(!shell?.classList.contains('sidebar-collapsed'));
}

function syncProfileMenu() {
  const session = typeof getSession === 'function' ? getSession() : null;
  if (!session) return;
  const set = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };
  const signedIn = session.signedInAt ? new Date(session.signedInAt) : new Date();
  const memberSince = signedIn.toLocaleDateString('en-ZA', { month: 'short', year: 'numeric' });

  set('profileMenuInitials', session.initials || 'SA');
  set('profileMenuName', session.name || 'System Administrator');
  set('profileMenuEmail', session.email || 'admin@redmps.com');
  set('profileMenuRole', session.role || 'Administrator');
  set('profileMemberSince', memberSince);
  set('profileSessionState', 'Active');
  set('profileAccessLevel', session.isSuperuser ? 'Full' : 'Standard');
}

function toggleProfileMenu() {
  const menu = document.getElementById('profileMenu');
  const button = document.getElementById('profileMenuButton');
  if (!menu) return;
  const opening = menu.classList.contains('hidden');
  if (opening) syncProfileMenu();
  menu.classList.toggle('hidden', !opening);
  button?.setAttribute('aria-expanded', String(opening));
}

function closeProfileMenu() {
  document.getElementById('profileMenu')?.classList.add('hidden');
  document.getElementById('profileMenuButton')?.setAttribute('aria-expanded', 'false');
}

async function copyProfileEmail() {
  const email = document.getElementById('profileMenuEmail')?.textContent.trim();
  if (!email) return;
  try {
    await navigator.clipboard.writeText(email);
    showToast('Profile email copied.', 'success');
  } catch {
    showToast(email, 'info');
  }
}

const FAQ_ANSWERS = [
  {
    keywords: ['create', 'new contract', 'contract', 'generate', 'wizard'],
    answer: 'I can help with that. Open New Contract, complete the guided fields, validate the form, then generate the preview. ContractIQ matches the approved template and prepares the approval route.',
    route: 'wizard',
    label: 'Open New Contract'
  },
  {
    keywords: ['approval', 'approve', 'director', 'manager', 'queue'],
    answer: 'Approvals are routed by policy. HR prepares the draft, managers or directors review depending on the route, and the queue shows age, priority, and action buttons for each item.',
    route: 'approvals',
    label: 'View Approvals'
  },
  {
    keywords: ['template', 'templates', 'publish', 'placeholder', 'clause'],
    answer: 'Templates control clauses, placeholders, and publishing status. Published templates can be used immediately; draft templates should be reviewed before they generate contracts.',
    route: 'templates',
    label: 'Manage Templates'
  },
  {
    keywords: ['user', 'users', 'account', 'superuser', 'create user'],
    answer: 'Public registration is disabled. Only active superusers can create accounts, assign roles, choose departments, and force a password change on first login.',
    route: 'create-user',
    label: 'Create User'
  },
  {
    keywords: ['password', 'reset', 'forgot', 'login', 'sign in'],
    answer: 'Use Forgot Password on the sign-in screen. In the local demo, the reset code is RESET-2026. In production, resets should be issued only for provisioned accounts.',
    route: 'reset-password',
    label: 'Reset Password'
  },
  {
    keywords: ['audit', 'log', 'history', 'trace', 'activity'],
    answer: 'The Audit Log traces contract, user, template, and approval activity. Use it to confirm who changed what, when it happened, and which workspace action created the event.',
    route: 'audit',
    label: 'Open Audit Log'
  },
  {
    keywords: ['settings', 'security', 'policy', 'configuration', 'configure'],
    answer: 'Settings controls security, document generation, approval policies, retention, and feature toggles. Superuser permissions are required for the most sensitive controls.',
    route: 'settings',
    label: 'Open Settings'
  },
  {
    keywords: ['dashboard', 'summary', 'workspace', 'overview', 'status'],
    answer: 'Workspace summary: 142 contracts generated, 5 pending approvals, 4.8 minute average processing, and 87% automation coverage. The highest-value next step is clearing pending approvals.',
    route: 'dashboard',
    label: 'Open Dashboard'
  },
  {
    keywords: ['employee', 'employees', 'directory', 'staff'],
    answer: 'The Employees area is for browsing employee records and contract history. Use it when you need reusable employee data before starting a contract.',
    route: 'employees',
    label: 'Open Employees'
  },
  {
    keywords: ['preview', 'export', 'download', 'sign', 'signature'],
    answer: 'Preview opens after the contract is validated. From there you can review the generated agreement, check schedule details, and export or prepare for signature.',
    route: 'preview',
    label: 'Open Preview'
  }
];

const FAQ_ROUTE_GUIDE = {
  dashboard: 'You are on Dashboard. Use it to monitor volume, approval pressure, automation readiness, and priority queues.',
  contracts: 'You are on Contracts. Search, filter, switch list/grid views, and inspect contract statuses from here.',
  wizard: 'You are in New Contract. Complete the required employee and contract fields, then validate to unlock preview.',
  preview: 'You are on Preview. Review generated content, schedule details, and export options before signing.',
  employees: 'You are on Employees. Use it to find employee records and reuse master data for contracts.',
  templates: 'You are on Templates. Review placeholder coverage, versions, publishing state, and compliance readiness.',
  approvals: 'You are on Approvals. Filter by route and process pending manager, director, or signature tasks.',
  analytics: 'You are on Analytics. Use this for trends, compliance signals, and operational reporting.',
  audit: 'You are on Audit Log. Trace user, contract, template, and approval actions.',
  settings: 'You are on Settings. Configure security, document generation, approval policy, and feature toggles.',
  'create-user': 'You are on Create User. Superusers can provision accounts, assign roles, and enforce first-login password changes.'
};

const FAQ_ROUTE_ALIASES = {
  dashboard: 'dashboard',
  contracts: 'contracts',
  contract: 'contracts',
  wizard: 'wizard',
  'new contract': 'wizard',
  preview: 'preview',
  employees: 'employees',
  employee: 'employees',
  templates: 'templates',
  template: 'templates',
  approvals: 'approvals',
  approval: 'approvals',
  analytics: 'analytics',
  audit: 'audit',
  settings: 'settings',
  profile: 'profile',
  users: 'create-user',
  'create user': 'create-user'
};

function toggleFaqChat(forceOpen = null) {
  const panel = document.getElementById('faqChatPanel');
  const fab = document.querySelector('.ai-chat-fab');
  const topbarButton = document.querySelector('.ai-chat-topbar-btn');
  if (!panel) return;
  const open = forceOpen === null ? panel.classList.contains('hidden') : forceOpen;
  panel.classList.toggle('hidden', !open);
  fab?.setAttribute('aria-expanded', String(open));
  topbarButton?.setAttribute('aria-expanded', String(open));
  if (open) {
    closeProfileMenu();
    setTimeout(() => document.getElementById('faqChatInput')?.focus(), 50);
  }
}

function submitFaqQuestion(event) {
  event?.preventDefault();
  const input = document.getElementById('faqChatInput');
  const question = input?.value.trim();
  if (!question) return;
  appendFaqMessage(question, 'user');
  input.value = '';
  appendFaqTyping(resolveContractaIntent(question));
}

function askFaqSuggestion(question) {
  toggleFaqChat(true);
  const input = document.getElementById('faqChatInput');
  if (input) input.value = question;
  submitFaqQuestion(new Event('submit'));
}

function resolveContractaIntent(question) {
  const normalized = question.toLowerCase();
  const directCommand = handleContractaCommand(normalized);
  if (directCommand) return directCommand;

  const scored = FAQ_ANSWERS
    .map(item => ({
      item,
      score: item.keywords.reduce((total, keyword) => total + (normalized.includes(keyword) ? 1 : 0), 0)
    }))
    .sort((a, b) => b.score - a.score);

  if (scored[0]?.score > 0) return scored[0].item;
  return {
    answer: 'I am Contracta. I can answer FAQs, explain the current page, navigate to app areas, summarize the workspace, clear this chat, open your profile, or collapse and expand the sidebar. Try "what can I do here?", "open templates", or "summarize my workspace".',
    route: null,
    label: null
  };
}

function handleContractaCommand(normalized) {
  if (/\b(clear|reset)\b.*\b(chat|conversation)\b/.test(normalized)) {
    clearFaqChat();
    return {
      answer: 'Fresh chat started. What would you like help with next?',
      route: null,
      label: null
    };
  }

  if (normalized.includes('what can i do here') || normalized.includes('current page') || normalized.includes('this page') || normalized.includes('where am i')) {
    const route = getCurrentContractaRoute();
    return {
      answer: FAQ_ROUTE_GUIDE[route] || 'This page is part of the ContractIQ workspace. I can explain workflows, navigate, or answer common questions.',
      route: route && route !== 'login' ? route : null,
      label: route && route !== 'login' ? 'Stay Here' : null
    };
  }

  if (normalized.includes('summarize') || normalized.includes('workspace status') || normalized.includes('status report')) {
    return {
      answer: 'Workspace snapshot: 142 contracts generated, 5 pending approvals, 92% readiness, 3 templates needing compliance updates, and no critical POPIA findings in today’s drafts.',
      route: 'dashboard',
      label: 'Open Dashboard'
    };
  }

  if (normalized.includes('collapse sidebar')) {
    setSidebarCollapsed(true);
    return { answer: 'Sidebar collapsed. You can say “expand sidebar” whenever you want it back.', route: null, label: null };
  }

  if (normalized.includes('expand sidebar')) {
    setSidebarCollapsed(false);
    return { answer: 'Sidebar expanded.', route: null, label: null };
  }

  if (normalized.includes('open profile') || normalized.includes('show profile') || normalized.includes('my profile')) {
    toggleProfileMenu();
    return { answer: 'Profile panel opened. You can copy the account email, review access, or jump to account actions from there.', route: null, label: null };
  }

  const routeCommand = Object.entries(FAQ_ROUTE_ALIASES)
    .find(([phrase]) => normalized.includes('open ' + phrase) || normalized.includes('go to ' + phrase) || normalized.includes('show ' + phrase));

  if (routeCommand) {
    const route = routeCommand[1];
    if (route === 'profile') {
      toggleProfileMenu();
      return { answer: 'Profile panel opened.', route: null, label: null };
    }
    return {
      answer: `I can take you to ${APP_ROUTES[route]?.title || route}.`,
      route,
      label: `Open ${APP_ROUTES[route]?.title || route}`
    };
  }

  return null;
}

function getCurrentContractaRoute() {
  const raw = window.location.hash.replace(/^#\/?/, '').split('?')[0];
  if (raw && APP_ROUTES[raw]) return raw;
  const active = document.querySelector('.page.active')?.id.replace(/^page-/, '');
  return active || 'dashboard';
}

function clearFaqChat() {
  const messages = document.getElementById('faqChatMessages');
  if (!messages) return;
  messages.innerHTML = `
    <div class="ai-message bot">
      <span>Contracta is ready. Ask for page help, workflow guidance, navigation, or a workspace summary.</span>
    </div>
  `;
}

function appendFaqTyping(match) {
  const typing = appendFaqMessage('Thinking...', 'bot typing');
  setTimeout(() => {
    typing?.remove();
    appendFaqMessage(match.answer, 'bot', match);
  }, 320);
}

function appendFaqMessage(text, type, action = null) {
  const messages = document.getElementById('faqChatMessages');
  if (!messages) return null;
  const message = document.createElement('div');
  message.className = `ai-message ${type}`;
  const bubble = document.createElement('span');
  bubble.textContent = text;
  message.appendChild(bubble);

  if (action?.route && action?.label) {
    const button = document.createElement('button');
    button.className = 'ai-message-action';
    button.type = 'button';
    button.textContent = action.label;
    button.addEventListener('click', () => runContractaAction(action));
    message.appendChild(button);
  }

  messages.appendChild(message);
  messages.scrollTop = messages.scrollHeight;
  return message;
}

function runContractaAction(action) {
  if (!action?.route) return;
  if (action.route === getCurrentContractaRoute()) {
    showToast('You are already there.', 'info');
    return;
  }
  routeTo(action.route);
  toggleFaqChat(false);
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

const API_BASE = window.CONTRACTIQ_API_BASE || 'http://localhost:5000';

const CU_ROLE_LABELS = {
  hr_officer:    'HR Officer',
  hr_manager:    'HR Manager',
  director:      'Director',
  administrator: 'Administrator',
};

/* ── Entry point called by router on every navigation ── */
function initCreateUser() {
  cuBuildLayout();       // always set grid + inject info panel via JS
  cuCheckSuperuserAccess();
  cuCheckApiStatus();

  const form = document.getElementById('createUserForm');
  if (form) {
    form.removeEventListener('submit', cuHandleSubmit);
    form.addEventListener('submit', cuHandleSubmit);
  }
}

/* ── Build the two-column grid and inject the info panel ──
   Running this in JS (not HTML/CSS) guarantees the layout
   is applied on every navigation regardless of page caching. */
function cuBuildLayout() {
  const wrap = document.getElementById('cuFormWrap');
  if (!wrap) return;

  // Force grid via individual style properties so we never wipe existing inline props
  wrap.style.display              = 'grid';
  wrap.style.gridTemplateColumns  = '1fr 300px';
  wrap.style.gap                  = '24px';
  wrap.style.alignItems           = 'start';

  // Inject info panel only once per DOM lifetime
  if (wrap.querySelector('.cu-info-panel')) return;

  const panel = document.createElement('aside');
  panel.className = 'cu-info-panel';
  panel.style.cssText = 'display:flex;flex-direction:column;gap:16px;';
  panel.innerHTML = `

    <!-- Database Target card -->
    <div class="cu-info-card">
      <div class="cu-info-card-title">
        <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
          <ellipse cx="12" cy="5" rx="9" ry="3"/>
          <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
        </svg>
        Database Target
      </div>
      <div class="cu-db-rows">
        <div class="cu-db-r"><span>Endpoint</span><code>POST /api/users</code></div>
        <div class="cu-db-r"><span>DB Function</span><code>create_user_as_superuser()</code></div>
        <div class="cu-db-r"><span>Hash</span><code>bcrypt · cost 12 · pgcrypto</code></div>
        <div class="cu-db-r"><span>Table</span><code>public.users</code></div>
        <div class="cu-db-r"><span>Columns</span><code>email · first_name · last_name · phone · password_hash · role_id · department_id · is_active · is_superuser · force_password_change</code></div>
      </div>
      <div class="cu-api-status-row">
        <span id="cuApiDot" class="cu-api-dot"></span>
        <span id="cuApiStatusText">Checking API…</span>
      </div>
    </div>

    <!-- Access Policy card -->
    <div class="cu-info-card">
      <div class="cu-info-card-title" style="color:var(--red-600);">
        <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        Access Policy
      </div>
      <ul class="cu-policy-list">
        <li><span class="cu-dot red"></span>Only superusers can create accounts</li>
        <li><span class="cu-dot red"></span>Public self-registration is disabled</li>
        <li><span class="cu-dot amber"></span>Passwords must be 12+ characters</li>
        <li><span class="cu-dot amber"></span>Force password change on by default</li>
        <li><span class="cu-dot green"></span>Creation events written to audit log</li>
        <li><span class="cu-dot green"></span>Passwords hashed bcrypt cost 12</li>
      </ul>
    </div>

    <!-- Role Permissions card -->
    <div class="cu-info-card">
      <div class="cu-info-card-title">
        <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        Role Permissions
      </div>
      <div class="cu-role-list">
        <div class="cu-role-item">
          <span class="cu-role-name">HR Officer</span>
          <span class="cu-role-desc">Generate contracts, view templates</span>
        </div>
        <div class="cu-role-item">
          <span class="cu-role-name">HR Manager</span>
          <span class="cu-role-desc">+ First-stage approvals</span>
        </div>
        <div class="cu-role-item">
          <span class="cu-role-name">Director</span>
          <span class="cu-role-desc">+ Director-stage approvals</span>
        </div>
        <div class="cu-role-item">
          <span class="cu-role-name">Administrator</span>
          <span class="cu-role-desc">Full system access + user management</span>
        </div>
      </div>
    </div>`;

  wrap.appendChild(panel);
}

/* ── Superuser guard ── */
function cuCheckSuperuserAccess() {
  const session  = typeof getSession === 'function' ? getSession() : null;
  const guard    = document.getElementById('cuSuperuserGuard');
  const formWrap = document.getElementById('cuFormWrap');

  if (!session?.isSuperuser) {
    guard?.classList.remove('hidden');
    formWrap?.classList.add('hidden');
  } else {
    guard?.classList.add('hidden');
    formWrap?.classList.remove('hidden');
  }
}

/* ── API health probe ── */
async function cuCheckApiStatus() {
  const dot  = document.getElementById('cuApiDot');
  const text = document.getElementById('cuApiStatusText');
  if (!dot || !text) return;

  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      dot.className    = 'cu-api-dot online';
      text.textContent = 'API online — writes go to PostgreSQL';
      text.style.color = 'var(--success, #10b981)';
    } else {
      cuMarkApiOffline(dot, text);
    }
  } catch {
    cuMarkApiOffline(dot, text);
  }
}

function cuMarkApiOffline(dot, text) {
  dot.className    = 'cu-api-dot offline';
  text.textContent = 'API offline — demo mode active';
  text.style.color = 'var(--amber, #f59e0b)';
}

/* ── Password eye toggle ── */
function cuTogglePw(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const show   = input.type === 'password';
  input.type   = show ? 'text' : 'password';
  btn.style.color = show ? 'var(--red-500)' : '';
}

/* ── Password strength meter ── */
function cuCheckStrength(pw) {
  const bars  = [1, 2, 3, 4].map(i => document.getElementById(`cuSbar${i}`));
  const label = document.getElementById('cuStrengthLabel');
  if (!label) return;

  const score = [
    pw.length >= 12,
    /[A-Z]/.test(pw) && /[a-z]/.test(pw),
    /[0-9]/.test(pw),
    /[^A-Za-z0-9]/.test(pw),
  ].filter(Boolean).length;

  const levels = [
    { color: '#ef4444', label: 'Too weak' },
    { color: '#ef4444', label: 'Weak'     },
    { color: '#f59e0b', label: 'Fair'     },
    { color: '#3b82f6', label: 'Good'     },
    { color: '#10b981', label: 'Strong'   },
  ];

  const lvl = levels[score] || levels[0];
  bars.forEach((bar, i) => {
    if (bar) bar.style.background = i < score ? lvl.color : 'var(--coal-100)';
  });
  label.textContent = pw.length === 0 ? 'Enter a password' : lvl.label;
  label.style.color = pw.length === 0 ? 'var(--coal-400)' : lvl.color;
}

/* ── Field-level error helpers ── */
function cuSetErr(fieldId, msg) {
  const el  = document.getElementById(fieldId + 'Err');
  const inp = document.getElementById(fieldId);
  if (el)  { el.textContent = msg; el.classList.toggle('visible', !!msg); }
  if (inp) { inp.classList.toggle('is-invalid', !!msg); }
}

function cuClearErrs() {
  ['cuFirstName', 'cuLastName', 'cuEmail', 'cuRole', 'cuPassword', 'cuConfirm']
    .forEach(id => cuSetErr(id, ''));
  document.getElementById('cuApiError')?.classList.add('hidden');
}

/* ── Form validation ── */
function cuValidate(data) {
  let valid = true;
  const fail = (id, msg) => { cuSetErr(id, msg); valid = false; };

  if (!data.firstName)  fail('cuFirstName', 'First name is required.');
  if (!data.lastName)   fail('cuLastName',  'Last name is required.');

  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
    fail('cuEmail', 'A valid email address is required.');

  if (!data.roleId)     fail('cuRole', 'Please select a role.');

  if ((data.password || '').length < 12)
    fail('cuPassword', 'Temporary password must be at least 12 characters.');

  if (data.password !== data.confirm)
    fail('cuConfirm', 'Passwords do not match.');

  return valid;
}

/* ── Submit handler ── */
async function cuHandleSubmit(e) {
  e.preventDefault();
  cuClearErrs();

  const session = typeof getSession === 'function' ? getSession() : null;

  const data = {
    firstName:    (document.getElementById('cuFirstName')?.value  || '').trim(),
    lastName:     (document.getElementById('cuLastName')?.value   || '').trim(),
    email:        (document.getElementById('cuEmail')?.value      || '').trim().toLowerCase(),
    phone:        (document.getElementById('cuPhone')?.value      || '').trim() || null,
    roleId:        document.getElementById('cuRole')?.value       || '',
    departmentId: (document.getElementById('cuDept')?.value       || '') || null,
    password:      document.getElementById('cuPassword')?.value   || '',
    confirm:       document.getElementById('cuConfirm')?.value    || '',
    forceChange:   document.getElementById('cuForceChange')?.checked  ?? true,
    isActive:      document.getElementById('cuIsActive')?.checked     ?? true,
    isSuperuser:   document.getElementById('cuIsSuperuser')?.checked  ?? false,
  };

  if (!cuValidate(data)) return;

  // Loading state
  const btnEl   = document.getElementById('cuSubmitBtn');
  const labelEl = document.getElementById('cuSubmitLabel');
  const spinEl  = document.getElementById('cuSpinner');
  btnEl?.classList.add('is-loading');
  if (labelEl) labelEl.textContent = 'Creating…';
  spinEl?.classList.remove('hidden');

  // Payload matches the local API, which resolves role/department IDs before
  // calling create_user_as_superuser().
  const payload = {
    email:                  data.email,
    first_name:             data.firstName,
    last_name:              data.lastName,
    phone:                  data.phone,
    role_id:                data.roleId,
    department_id:          data.departmentId,
    temp_password:          data.password,
    force_password_change:  data.forceChange,
    is_active:              data.isActive,
    is_superuser:           data.isSuperuser,
    created_by:             session?.email || '',
  };

  let success     = false;
  let createdUser = null;
  let apiMode     = true;

  try {
    const res = await fetch(`${API_BASE}/api/users`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
      signal:  AbortSignal.timeout(7000),
    });

    if (res.ok) {
      createdUser = await res.json();
      success = true;

      // Write audit entry via API
      await cuWriteAuditEntry({
        action:    'USER_CREATED',
        target:    data.email,
        actor:     session?.email || 'superuser',
        details:   `Role: ${CU_ROLE_LABELS[data.roleId] || data.roleId} | Superuser: ${data.isSuperuser}`,
        source:    'api',
      });
    } else {
      const err = await res.json().catch(() => ({}));
      cuShowApiErr(err.message || `Server returned ${res.status}. Check the API logs.`);
    }

  } catch {
    // ── Demo / offline fallback ─────────────────────────────────────
    apiMode = false;

    createdUser = {
      id:         'demo-' + Math.random().toString(36).slice(2, 10),
      email:      data.email,
      first_name: data.firstName,
      last_name:  data.lastName,
      role:       CU_ROLE_LABELS[data.roleId] || data.roleId,
    };

    // Persist in DEMO_USERS so the new account can sign in this session
    if (typeof DEMO_USERS !== 'undefined') {
      const initials = ((data.firstName[0] || '') + (data.lastName[0] || '')).toUpperCase();
      DEMO_USERS.push({
        email:               data.email,
        password:            data.password,
        name:                `${data.firstName} ${data.lastName}`,
        initials,
        role:                CU_ROLE_LABELS[data.roleId] || 'HR Officer',
        isSuperuser:         data.isSuperuser,
        forcePasswordChange: data.forceChange,
      });
    }

    // Write audit entry to sessionStorage (offline audit log)
    cuWriteAuditEntry({
      action:  'USER_CREATED',
      target:  data.email,
      actor:   session?.email || 'superuser',
      details: `Role: ${CU_ROLE_LABELS[data.roleId] || data.roleId} | Superuser: ${data.isSuperuser} | Demo mode`,
      source:  'demo',
    });

    success = true;
  }

  // Restore button state
  btnEl?.classList.remove('is-loading');
  if (labelEl) labelEl.textContent = 'Create User';
  spinEl?.classList.add('hidden');

  if (!success) return;

  // ── Show success panel ─────────────────────────────────────────────
  document.getElementById('cuFormWrap')?.classList.add('hidden');

  const subEl    = document.getElementById('cuSuccessSub');
  const detailEl = document.getElementById('cuSuccessDetail');

  if (subEl) {
    subEl.textContent = apiMode
      ? 'Account written to PostgreSQL via create_user_as_superuser() and audit event recorded.'
      : 'API offline — account saved in-session (demo mode). It persists until sign-out.';
  }

  if (detailEl) {
    detailEl.innerHTML = [
      `<strong>Name:</strong>  ${data.firstName} ${data.lastName}`,
      `<strong>Email:</strong> ${data.email}`,
      `<strong>Role:</strong>  ${CU_ROLE_LABELS[data.roleId] || data.roleId}`,
      `<strong>Active:</strong> ${data.isActive ? 'Yes' : 'No'}`,
      `<strong>Force password change:</strong> ${data.forceChange ? 'Yes' : 'No'}`,
      `<strong>Superuser:</strong> ${data.isSuperuser ? 'Yes' : 'No'}`,
      `<strong>Mode:</strong> ${apiMode ? 'Live — PostgreSQL' : 'Demo — in-session'}`,
      `<strong>ID:</strong> ${createdUser.id}`,
    ].join('<br>');
  }

  document.getElementById('cuSuccessPanel')?.classList.remove('hidden');
  showToast(`${data.firstName} ${data.lastName} created successfully.`, 'success');
}

/* ── Audit writer ──
   Sends to API when online; falls back to sessionStorage ring buffer. */
async function cuWriteAuditEntry({ action, target, actor, details, source }) {
  const entry = {
    id:        'audit-' + Math.random().toString(36).slice(2, 10),
    timestamp: new Date().toISOString(),
    action,
    target,
    actor,
    details,
    source,
  };

  if (source === 'api') {
    try {
      await fetch(`${API_BASE}/api/audit`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(entry),
        signal:  AbortSignal.timeout(3000),
      });
    } catch {
      // API audit failed — fall back to local storage silently
      cuPushLocalAudit(entry);
    }
  } else {
    cuPushLocalAudit(entry);
  }
}

/* Keep a capped ring buffer of audit events in sessionStorage */
function cuPushLocalAudit(entry) {
  try {
    const raw     = sessionStorage.getItem('contractiq.auditLog');
    const entries = raw ? JSON.parse(raw) : [];
    entries.unshift(entry);
    // Cap at 200 entries
    if (entries.length > 200) entries.length = 200;
    sessionStorage.setItem('contractiq.auditLog', JSON.stringify(entries));
  } catch {
    // sessionStorage unavailable — ignore
  }
}

/* ── API error banner ── */
function cuShowApiErr(msg) {
  const banner  = document.getElementById('cuApiError');
  const textEl  = document.getElementById('cuApiErrorText');
  if (textEl) textEl.textContent = msg;
  banner?.classList.remove('hidden');
}

/* ── Form helpers ── */
function cuResetForm() {
  document.getElementById('createUserForm')?.reset();
  cuClearErrs();
  cuCheckStrength('');
}

function cuCreateAnother() {
  document.getElementById('cuSuccessPanel')?.classList.add('hidden');
  const wrap = document.getElementById('cuFormWrap');
  if (wrap) {
    wrap.classList.remove('hidden');
    // Restore grid in case it was cleared when hidden
    wrap.style.display = 'grid';
  }
  cuResetForm();
  cuCheckApiStatus();
}

function cuAcknowledgeCreatedUser() {
  document.getElementById('cuSuccessPanel')?.classList.add('hidden');
  routeTo('settings');
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
