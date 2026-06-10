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
const GENERATED_CONTRACT_KEY = 'contractiq.generatedContract';
const APPROVAL_QUEUE_KEY = 'contractiq.approvalQueue';
const PREVIEW_DRAFTS_KEY = 'contractiq.previewDrafts';
let selectedApprovalRef = null;

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

function storeGeneratedContract(payload) {
  try {
    sessionStorage.setItem(GENERATED_CONTRACT_KEY, JSON.stringify({
      ...payload,
      generatedAt: new Date().toISOString(),
      submittedForApproval: false
    }));
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
    if (menu && !menu.classList.contains('hidden') && !menu.contains(event.target) && !button?.contains(event.target)) {
      closeProfileMenu();
    }
    const search = document.getElementById('globalSearchPanel');
    const searchInput = document.getElementById('globalSearchInput');
    if (search && !search.classList.contains('hidden') && !search.contains(event.target) && !searchInput?.contains(event.target)) {
      closeGlobalSearch();
    }
    const notifications = document.getElementById('notificationPanel');
    const notificationButton = document.getElementById('notificationButton');
    if (notifications && !notifications.classList.contains('hidden') && !notifications.contains(event.target) && !notificationButton?.contains(event.target)) {
      toggleNotificationPanel(false);
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      closeProfileMenu();
      toggleFaqChat(false);
      closeGlobalSearch();
      toggleNotificationPanel(false);
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      openGlobalSearch(true);
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

const GLOBAL_SEARCH_ITEMS = [
  { label: 'Create a new contract', meta: 'Guided Contract Studio', route: 'wizard', keywords: 'new contract generate fixed permanent offer' },
  { label: 'Approval Queue', meta: 'Manager, director, and signature review', route: 'approvals', keywords: 'approval approve manager director signature returned' },
  { label: 'Yuvaan Pather', meta: 'Employee record · Junior Platform Engineer', route: 'employees', keywords: 'yuvaan pather employee engineer id phone' },
  { label: 'Fixed-Term Employment Agreement', meta: 'Published template', route: 'templates', keywords: 'fixed term template employment agreement' },
  { label: 'Permanent Employment Contract', meta: 'Draft template review', route: 'templates', keywords: 'permanent employment contract template' },
  { label: 'Contract Analytics', meta: 'Generation, SLA, and compliance signals', route: 'analytics', keywords: 'analytics reporting performance sla compliance' },
  { label: 'Audit Log', meta: 'Trace contract and approval activity', route: 'audit', keywords: 'audit log history activity trace' },
  { label: 'Create User', meta: 'Superuser account provisioning', route: 'create-user', keywords: 'create user superuser administrator account' }
];

function openGlobalSearch(focus = false) {
  const panel = document.getElementById('globalSearchPanel');
  if (!panel) return;
  panel.classList.remove('hidden');
  updateGlobalSearch(document.getElementById('globalSearchInput')?.value || '');
  if (focus) setTimeout(() => document.getElementById('globalSearchInput')?.focus(), 20);
}

function closeGlobalSearch() {
  document.getElementById('globalSearchPanel')?.classList.add('hidden');
}

function updateGlobalSearch(query = '') {
  const results = document.getElementById('globalSearchResults');
  if (!results) return;
  const normalized = query.toLowerCase().trim();
  const matches = GLOBAL_SEARCH_ITEMS
    .filter(item => !normalized || `${item.label} ${item.meta} ${item.keywords}`.toLowerCase().includes(normalized))
    .slice(0, 6);
  results.innerHTML = matches.length
    ? matches.map((item, index) => `
      <button class="global-search-item ${index === 0 ? 'is-active' : ''}" type="button" onclick="runGlobalSearchResult('${item.route}')">
        <span>${escapeHtml(item.label)}</span>
        <small>${escapeHtml(item.meta)}</small>
      </button>
    `).join('')
    : '<div class="global-search-empty">No matching workspace items.</div>';
}

function handleGlobalSearchKey(event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    document.querySelector('.global-search-item.is-active, .global-search-item')?.click();
  }
  if (event.key === 'Escape') closeGlobalSearch();
}

function runGlobalSearchResult(route) {
  closeGlobalSearch();
  const input = document.getElementById('globalSearchInput');
  if (input) input.value = '';
  routeTo(route);
}

function toggleNotificationPanel(forceOpen = null) {
  const panel = document.getElementById('notificationPanel');
  const button = document.getElementById('notificationButton');
  if (!panel) return;
  const opening = forceOpen === null ? panel.classList.contains('hidden') : forceOpen;
  panel.classList.toggle('hidden', !opening);
  button?.setAttribute('aria-expanded', String(opening));
}

function markNotificationsRead() {
  document.querySelector('.notif-dot')?.classList.add('is-read');
  showToast('Notifications marked as read.', 'success');
  toggleNotificationPanel(false);
}

function readGeneratedContract() {
  try {
    return JSON.parse(sessionStorage.getItem(GENERATED_CONTRACT_KEY) || 'null');
  } catch {
    return null;
  }
}

function readApprovalQueue() {
  try {
    return JSON.parse(localStorage.getItem(APPROVAL_QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeApprovalQueue(queue) {
  try {
    localStorage.setItem(APPROVAL_QUEUE_KEY, JSON.stringify(queue));
  } catch {
    showToast?.('Approval queue could not be saved in this browser session.', 'warning');
  }
}

function getApprovalStageLabel(stage) {
  const labels = {
    manager: 'Manager Review',
    director: 'Director Review',
    signature: 'Signature Ready',
    revision: 'Returned for Revision',
    approved: 'Approved'
  };
  return labels[stage] || 'Manager Review';
}

function getNextApprovalStage(stage) {
  if (stage === 'manager') return 'director';
  if (stage === 'director') return 'signature';
  if (stage === 'signature') return 'approved';
  return 'manager';
}

function userCanApproveStage(stage) {
  const session = typeof getSession === 'function' ? getSession() : null;
  const role = (session?.role || '').toLowerCase();
  if (session?.isSuperuser || role.includes('admin')) return true;
  if (stage === 'manager') return role.includes('manager') || role.includes('director');
  if (stage === 'director' || stage === 'signature') return role.includes('director');
  return false;
}

function submitCurrentContractForApproval() {
  const generated = readGeneratedContract();
  if (!generated) {
    showToast('Generate a contract preview before submitting for approval.', 'warning');
    return;
  }

  const queue = readApprovalQueue();
  const exportContext = getContractExportContext();
  if (!queue.some(item => item.ref === generated.ref)) {
    queue.unshift({
      id: generated.ref,
      ref: generated.ref,
      employeeName: generated.fullName,
      documentType: generated.schemaLabel,
      schemaKey: generated.schemaKey,
      data: generated.data || null,
      previewHtml: exportContext?.html || '',
      stage: 'manager',
      status: 'Manager Review',
      priority: 'normal',
      submittedAt: new Date().toISOString(),
      submittedBy: getSession?.()?.name || 'Current user',
      currentOwner: 'HR Manager',
      notes: [],
      history: [
        { at: new Date().toISOString(), action: 'Submitted for approval', by: getSession?.()?.name || 'Current user' }
      ]
    });
    writeApprovalQueue(queue);
  }

  try {
    sessionStorage.setItem(GENERATED_CONTRACT_KEY, JSON.stringify({ ...generated, submittedForApproval: true }));
  } catch {
    // Ignore storage failures in restricted browser modes.
  }
  showToast(`${generated.fullName} sent to HR Manager approval.`, 'success');
  routeTo('approvals');
}

function getContractExportContext() {
  const generated = readGeneratedContract();
  const doc = document.querySelector('#page-preview .preview-doc');
  if (!doc) {
    showToast('Open a generated contract preview before exporting.', 'warning');
    return null;
  }

  const clone = doc.cloneNode(true);
  clone.querySelectorAll('.is-hidden').forEach(node => node.remove());
  clone.querySelectorAll('[hidden]').forEach(node => node.remove());
  clone.querySelectorAll('script, button').forEach(node => node.remove());

  const title = clone.querySelector('#doc-contract-title')?.textContent.trim()
    || generated?.schemaLabel
    || 'Employment Agreement';
  const employee = clone.querySelector('#doc-employee-name')?.textContent.trim()
    || generated?.fullName
    || 'Employee';
  const ref = generated?.ref || `RMP-${Date.now()}`;

  return {
    ref,
    title,
    employee,
    html: clone.innerHTML,
    generatedAt: generated?.generatedAt || new Date().toISOString()
  };
}

function sanitizeFilename(value) {
  return String(value || 'contract')
    .replace(/[\\/:*?"<>|]+/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 90) || 'contract';
}

function contractExportFilename(context, extension) {
  return sanitizeFilename(`${context.ref}-${context.employee}-${context.title}`) + extension;
}

async function getLetterheadLogoDataUri() {
  try {
    const response = await fetch('demo/assets/templates/image1.png');
    const blob = await response.blob();
    return await new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve('');
      reader.readAsDataURL(blob);
    });
  } catch {
    return '';
  }
}

function buildContractExportHtml(context, logoDataUri = '') {
  const generatedDate = new Date(context.generatedAt).toLocaleDateString('en-ZA', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  const year = new Date(context.generatedAt).getFullYear();
  const coverTitle = context.title;

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(context.title)}</title>
  <style>
    @page { size: A4; margin: 17mm 18mm 20mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #1f2430; font-family: Arial, Helvetica, sans-serif; font-size: 11pt; line-height: 1.55; }
    .cover-page { min-height: 257mm; position: relative; page-break-after: always; }
    .letterhead-band { height: 74px; left: -18mm; overflow: hidden; position: relative; right: -18mm; top: -17mm; width: calc(100% + 36mm); }
    .letterhead-band:before { background: #8b8b8b; content: ""; height: 34px; left: 0; position: absolute; right: 0; top: 37px; }
    .letterhead-slash { background: #c98f92; height: 112px; position: absolute; top: -38px; transform: skewX(-28deg); width: 54px; }
    .letterhead-slash.dark { background: #8b8b8b; left: 18px; }
    .letterhead-slash.red-one { left: 44px; }
    .letterhead-slash.red-two { left: 118px; }
    .cover-logo { margin: 48px 0 0 52px; width: 172px; }
    .cover-logo img { display: block; height: auto; width: 100%; }
    .cover-copy { bottom: 62px; left: 28px; position: absolute; }
    .cover-redline { background: #c5001a; height: 4px; margin-bottom: 20px; width: 355px; }
    .cover-copy p { margin: 0 0 14px; }
    .cover-title { color: #404551; font-size: 18pt; font-weight: 800; letter-spacing: .2px; line-height: 1.45; margin-top: 28px; max-width: 420px; text-transform: uppercase; }
    .cover-bottom-logo { margin-top: 64px; width: 116px; }
    .agreement-page { min-height: 257mm; position: relative; }
    .inner-doc-head { align-items: center; border-bottom: 1px solid #9ca3af; display: grid; grid-template-columns: 1fr auto 1fr; gap: 18px; margin: 0 0 38px; padding-bottom: 8px; }
    .inner-doc-kicker { color: #111827; font-size: 8pt; grid-column: 2; text-align: center; }
    .inner-doc-logo { justify-self: end; max-width: 74px; }
    .inner-doc-logo img { display: block; height: auto; width: 100%; }
    .doc-header { text-align: center; margin-bottom: 24px; }
    .doc-company { color: #c5001a; font-size: 9pt; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; }
    .doc-title { font-family: Georgia, 'Times New Roman', serif; font-size: 18pt; font-weight: 700; margin-top: 6px; }
    .doc-subtitle { color: #5b6172; font-size: 9.5pt; margin-top: 3px; }
    table { width: 100%; border-collapse: collapse; margin: 0 0 18px; }
    th, td { border: 1px solid #1f2430; padding: 6px 8px; vertical-align: top; text-align: left; }
    th { width: 36%; background: #f4f5f8; text-transform: uppercase; font-size: 9pt; }
    .doc-section { margin-bottom: 16px; break-inside: avoid; }
    .doc-section-title { border-bottom: 1px solid #d8dbe5; font-weight: 700; margin-bottom: 6px; padding-bottom: 4px; }
    .doc-p { margin: 0 0 7px; }
    .doc-list { margin: 6px 0 0 22px; padding: 0; }
    .clause-indent { margin-left: 24px; }
    .doc-signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 34px; margin-top: 30px; }
    .sig-line { border-bottom: 1px solid #111827; height: 34px; margin-bottom: 6px; }
    .sig-name { font-weight: 700; }
    .sig-label { color: #5b6172; font-size: 9pt; }
    .export-footer { border-top: 1px solid #d5d8df; color: #4c5364; display: flex; justify-content: space-between; gap: 18px; font-size: 8.5pt; margin-top: 28px; padding-top: 10px; }
    @media print {
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .cover-page { break-after: page; }
      .doc-section { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <section class="cover-page">
    <div class="letterhead-band" aria-hidden="true">
      <span class="letterhead-slash dark"></span>
      <span class="letterhead-slash red-one"></span>
      <span class="letterhead-slash red-two"></span>
    </div>
    <div class="cover-logo">${logoDataUri ? `<img src="${logoDataUri}" alt="RedMPS">` : '<strong>REDMPS.com</strong>'}</div>
    <div class="cover-copy">
      <div class="cover-redline"></div>
      <p>RedM Professional Services</p>
      <p>Human Resources</p>
      <p>${year}</p>
      <div class="cover-title">${escapeHtml(coverTitle)}</div>
      <div class="cover-bottom-logo">${logoDataUri ? `<img src="${logoDataUri}" alt="RedMPS">` : '<strong>REDMPS.com</strong>'}</div>
    </div>
  </section>
  <section class="agreement-page">
    <div class="inner-doc-head">
      <span></span>
      <div class="inner-doc-kicker">${escapeHtml(context.title)}</div>
      <div class="inner-doc-logo">${logoDataUri ? `<img src="${logoDataUri}" alt="RedMPS">` : '<strong>REDMPS.com</strong>'}</div>
    </div>
    ${context.html}
    <div class="export-footer">
      <span>WEBSITE www.redmps.com</span>
      <span>ADDRESS 145 Western Service Road, Woodmead, Johannesburg</span>
      <span>CONTACT +27 10 300 9025</span>
    </div>
    <div style="color:#73788a;font-size:8.5pt;margin-top:8px;">Generated by ContractIQ on ${generatedDate}. Reference ${escapeHtml(context.ref)}.</div>
  </section>
</body>
</html>`;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function downloadContractWord() {
  const context = getContractExportContext();
  if (!context) return;

  try {
    const html = buildContractExportHtml(context, await getLetterheadLogoDataUri());
    const blob = new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' });
    downloadBlob(blob, contractExportFilename(context, '.doc'));
    showToast('Editable Word contract downloaded.', 'success');
  } catch {
    showToast('Word export failed. Save the draft and try again from Preview.', 'error');
  }
}

async function downloadContractPdf() {
  const context = getContractExportContext();
  if (!context) return;

  try {
    const html = buildContractExportHtml(context, await getLetterheadLogoDataUri());
    const win = window.open('', '_blank', 'width=900,height=1100');
    if (!win) {
      showToast('Allow pop-ups to open the PDF print window.', 'warning');
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.onload = () => {
      win.focus();
      win.print();
    };
    showToast('Choose Save as PDF in the print window.', 'info');
  } catch {
    showToast('PDF export failed. Download Word as a fallback.', 'error');
  }
}

function saveCurrentContractDraft() {
  const context = getContractExportContext();
  if (!context) return;

  try {
    const drafts = JSON.parse(localStorage.getItem(PREVIEW_DRAFTS_KEY) || '[]');
    drafts.unshift({
      ref: context.ref,
      title: context.title,
      employee: context.employee,
      savedAt: new Date().toISOString(),
      html: context.html
    });
    localStorage.setItem(PREVIEW_DRAFTS_KEY, JSON.stringify(drafts.slice(0, 20)));
    showToast('Generated contract draft saved.', 'success');
  } catch {
    showToast('Draft could not be saved in this browser session.', 'warning');
  }
}

function sendCurrentContractForSignature() {
  const generated = readGeneratedContract();
  if (!generated) {
    showToast('Generate a contract before sending it for signature.', 'warning');
    return;
  }

  const approval = readApprovalQueue().find(item => item.ref === generated.ref);
  if (!approval) {
    showToast('Submit this contract for approval before signature.', 'warning');
    return;
  }
  if (approval.stage !== 'approved') {
    showToast(`Signature is available after ${getApprovalStageLabel(approval.stage)} is complete.`, 'warning');
    routeTo('approvals');
    return;
  }

  showToast('Signature packet prepared for the approved contract.', 'success');
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
    answer: 'Preview opens after the contract is validated. From there you can review the exact generated agreement, download a Word-editable copy, open the PDF print flow, submit for approval, or prepare for signature after approval is complete.',
    route: 'preview',
    label: 'Open Preview'
  },
  {
    keywords: ['word', 'doc', 'docx', 'edit', 'editable', 'wrong', 'fix', 'mistake'],
    answer: 'If the generated contract needs a correction, download the Word version from Preview, make the manual fix, and keep the saved draft/audit trail. If a field value is wrong, go back to New Contract and regenerate so the schedule and clauses stay consistent.',
    route: 'preview',
    label: 'Open Preview'
  },
  {
    keywords: ['pdf', 'letterhead', 'redmps format', 'format', 'print'],
    answer: 'Contract exports use the RedMPS letterhead details: RedM Professional Services, 145 Western Service Road, Woodmead, +27 10 300 9025, and www.redmps.com. Download PDF opens a print-ready contract where you choose Save as PDF.',
    route: 'preview',
    label: 'Open Preview'
  },
  {
    keywords: ['approval flow', 'send for approval', 'send approval', 'privilege', 'privileges'],
    answer: 'The approval flow is HR generation, HR Manager review, Director review, then Signature. Only admins, managers, directors, or superusers with the matching stage permission can approve. Flagging an item sends it back to the responsible party for correction.',
    route: 'approvals',
    label: 'View Approvals'
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

function filterEmployeeCards(query) {
  const q = query.toLowerCase().trim();
  let visible = 0;
  document.querySelectorAll('.employee-record-card').forEach(card => {
    const match = !q || (card.dataset.search || '').toLowerCase().includes(q);
    card.style.display = match ? '' : 'none';
    if (match) visible++;
  });
  if (!visible) showToast('No employees match that search.', 'info');
}

function setEmployeeFilter(btn, filter) {
  document.querySelectorAll('#page-employees .filter-tab').forEach(tab => tab.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.employee-record-card').forEach(card => {
    const match = filter === 'all' || card.dataset.status === filter;
    card.style.display = match ? '' : 'none';
  });
}

function setApprovalsTab(btn, filter) {
  document.querySelectorAll('#approvalsTabs .filter-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');

  const cards = document.querySelectorAll('#approvalsList .approval-card');
  cards.forEach(card => {
    const match = filter === 'all' || card.dataset.route === filter;
    card.style.display = match ? '' : 'none';
  });
}

function approveItemLegacy(btn, name) {
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

function initApprovals() {
  renderGeneratedApprovals();
  refreshApprovalActions();
  updateApprovalStats();
}

function renderGeneratedApprovals() {
  const list = document.getElementById('approvalsList');
  if (!list) return;
  list.querySelectorAll('[data-generated-approval="true"]').forEach(card => card.remove());

  readApprovalQueue()
    .filter(item => item.stage !== 'approved')
    .forEach(item => list.prepend(createApprovalCard(item)));
}

function createApprovalCard(item) {
  const card = document.createElement('div');
  card.className = 'approval-card generated-approval';
  card.dataset.generatedApproval = 'true';
  card.dataset.route = item.stage;
  card.dataset.ref = item.ref;
  card.innerHTML = `
    <div class="approval-card-left">
      <div class="emp-avatar" style="background:var(--red-600);width:44px;height:44px;font-size:15px;flex-shrink:0">${initialsFromName(item.employeeName)}</div>
      <div class="approval-card-info">
        <div class="approval-card-name">${escapeHtml(item.employeeName)}</div>
        <div class="approval-card-doc">${escapeHtml(item.documentType)} <span class="ref-chip">${escapeHtml(item.ref)}</span></div>
        ${renderApprovalRoute(item.stage)}
      </div>
    </div>
      <div class="approval-card-right">
      <div class="approval-meta">
        <span class="status-badge ${getApprovalBadgeClass(item.stage)}">${getApprovalStageLabel(item.stage)}</span>
        <span class="approval-age">${formatApprovalAge(item.submittedAt)}</span>
      </div>
      <div class="approval-actions-row">
        ${renderApprovalCardActions(item)}
      </div>
    </div>
  `;
  return card;
}

function renderApprovalCardActions(item) {
  if (item.stage === 'revision') {
    return `
      <button class="btn-approve" onclick="reviseApprovalItem(this,'${escapeAttribute(item.employeeName)}')">Revise Draft</button>
      <button class="row-btn" onclick="viewApprovalItem(this)">View</button>
    `;
  }
  return `
    <button class="btn-approve" onclick="approveItem(this,'${escapeAttribute(item.employeeName)}')">${item.stage === 'signature' ? 'Send for Signature' : 'Approve'}</button>
    <button class="btn-flag" onclick="flagApprovalItem(this,'${escapeAttribute(item.employeeName)}')">Flag</button>
    <button class="row-btn" onclick="viewApprovalItem(this)">View</button>
  `;
}

function renderApprovalRoute(stage) {
  const steps = stage === 'revision'
    ? ['Generated', 'Returned', 'HR Revision', 'Resubmit']
    : ['Generated', 'HR Manager', 'Director', 'Signature'];
  const stageIndex = { manager: 1, director: 2, signature: 3, approved: 4, revision: 1 }[stage] || 1;
  return '<div class="approval-card-route">' + steps.map((label, index) => {
    const className = stage === 'revision' && index === 1 ? 'active returned' : index < stageIndex ? 'done' : index === stageIndex ? 'active' : '';
    const step = `<span class="route-step ${className}">${label}</span>`;
    return index < steps.length - 1 ? step + '<span class="route-arrow">&rarr;</span>' : step;
  }).join('') + '</div>';
}

function refreshApprovalActions() {
  document.querySelectorAll('#approvalsList .approval-card').forEach(card => {
    const stage = card.dataset.route || 'manager';
    const approve = card.querySelector('.btn-approve');
    if (!approve) return;
    const allowed = stage === 'revision' ? userCanReviseApproval() : userCanApproveStage(stage);
    approve.disabled = !allowed;
    approve.classList.toggle('is-disabled', !allowed);
    approve.title = allowed ? 'Action this approval item' : 'You do not have permission for this approval stage';
    if (stage === 'signature') approve.textContent = 'Send for Signature';
  });
}

function approveItem(btn, name) {
  const card = btn.closest('.approval-card');
  if (!card) return;
  const stage = card.dataset.route || 'manager';
  if (stage === 'revision') {
    reviseApprovalItem(btn, name);
    return;
  }
  if (!userCanApproveStage(stage)) {
    showToast('You do not have permission to approve this stage.', 'warning');
    return;
  }

  const nextStage = getNextApprovalStage(stage);
  const ref = card.dataset.ref;
  if (ref) {
    const queue = readApprovalQueue();
    const item = queue.find(entry => entry.ref === ref);
    if (item) {
      item.stage = nextStage;
      item.status = getApprovalStageLabel(nextStage);
      item.currentOwner = getApprovalOwner(nextStage);
      item.history = item.history || [];
      item.history.push({ at: new Date().toISOString(), action: `${getApprovalStageLabel(stage)} completed`, by: getSession?.()?.name || 'Current user' });
      const note = document.getElementById('approvalCommentInput')?.value.trim();
      if (selectedApprovalRef === ref && note) {
        item.notes = item.notes || [];
        item.notes.push({ at: new Date().toISOString(), by: getSession?.()?.name || 'Current user', text: note });
      }
      writeApprovalQueue(queue);
    }
  }

  btn.textContent = nextStage === 'approved' ? 'Sent' : 'Approved';
  btn.style.background = 'var(--success)';
  btn.style.pointerEvents = 'none';

  setTimeout(() => {
    card.style.transition = 'opacity .4s ease, transform .4s ease, max-height .4s ease';
    card.style.opacity = '0';
    card.style.transform = 'translateX(20px)';
    setTimeout(() => {
      card.style.display = 'none';
      const message = nextStage === 'approved'
        ? `${name} sent for signature. HR is notified.`
        : `${name} routed to ${getApprovalStageLabel(nextStage)}.`;
      showToast(message, 'success');
      renderGeneratedApprovals();
      refreshApprovalActions();
      updateApprovalStats();
      if (selectedApprovalRef === ref) closeApprovalDetail();
    }, 400);
  }, 500);
}

function flagApprovalItem(btn, name) {
  const card = btn.closest('.approval-card');
  const ref = card?.dataset.ref;
  const note = selectedApprovalRef === ref
    ? document.getElementById('approvalCommentInput')?.value.trim()
    : '';
  if (ref) {
    const queue = readApprovalQueue();
    const item = queue.find(entry => entry.ref === ref);
    if (item) {
      item.stage = 'revision';
      item.status = 'Returned for revision';
      item.currentOwner = 'HR Officer';
      item.returnReason = note || 'Reviewer requested revisions.';
      item.history = item.history || [];
      item.history.push({ at: new Date().toISOString(), action: 'Returned for revision', by: getSession?.()?.name || 'Current user' });
      if (note) {
        item.notes = item.notes || [];
        item.notes.push({ at: new Date().toISOString(), by: getSession?.()?.name || 'Current user', text: note });
      }
      writeApprovalQueue(queue);
    }
    renderGeneratedApprovals();
    refreshApprovalActions();
    updateApprovalStats();
    showToast(`${name} returned to HR for revision.`, 'warning');
    if (selectedApprovalRef === ref) openApprovalDetail(ref);
    return;
  }
  if (card) card.dataset.route = 'revision';
  showToast(`${name} flagged for revision.`, 'warning');
  updateApprovalStats();
}

function updateApprovalStats() {
  const cards = Array.from(document.querySelectorAll('#approvalsList .approval-card'));
  const counts = {
    all: cards.filter(card => card.dataset.route !== 'approved').length,
    manager: cards.filter(card => card.dataset.route === 'manager').length,
    director: cards.filter(card => card.dataset.route === 'director').length,
    signature: cards.filter(card => card.dataset.route === 'signature').length,
    revision: cards.filter(card => card.dataset.route === 'revision').length
  };
  document.querySelectorAll('#approvalsTabs .filter-tab').forEach(btn => {
    const filter = btn.getAttribute('onclick')?.match(/'([^']+)'/)?.[1] || 'all';
    const count = btn.querySelector('.tab-count');
    if (count) count.textContent = counts[filter] ?? counts.all;
  });
  const statNums = document.querySelectorAll('.approval-stats .apstat-num');
  if (statNums[0]) statNums[0].textContent = counts.all;
  if (statNums[1]) statNums[1].textContent = counts.director;
  if (statNums[2]) statNums[2].textContent = counts.signature;
  if (statNums[3]) statNums[3].textContent = String(18 + readApprovalQueue().filter(item => item.stage === 'approved').length);
}

function getApprovalBadgeClass(stage) {
  if (stage === 'signature') return 'signed';
  if (stage === 'director') return 'approved';
  if (stage === 'revision') return 'returned';
  if (stage === 'approved') return 'signed';
  return 'review';
}

function getApprovalOwner(stage) {
  const owners = {
    manager: 'HR Manager',
    director: 'Director',
    signature: 'HR Signature Coordinator',
    revision: 'HR Officer',
    approved: 'Completed'
  };
  return owners[stage] || 'HR Manager';
}

function formatApprovalAge(value) {
  if (!value) return 'Just now';
  const diff = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(diff) || diff < 60000) return 'Just now';
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function userCanReviseApproval() {
  const session = typeof getSession === 'function' ? getSession() : null;
  const role = (session?.role || '').toLowerCase();
  return Boolean(session?.isSuperuser || role.includes('admin') || role.includes('hr') || role.includes('manager'));
}

function getApprovalFromCard(card) {
  if (!card) return null;
  const ref = card.dataset.ref || card.querySelector('.ref-chip')?.textContent.trim();
  const queued = ref ? readApprovalQueue().find(item => item.ref === ref) : null;
  if (queued) return queued;
  const name = card.querySelector('.approval-card-name')?.textContent.trim() || 'Employee';
  const documentType = card.querySelector('.approval-card-doc')?.childNodes[0]?.textContent.trim() || 'Contract';
  return {
    ref: ref || 'Sample',
    employeeName: name,
    documentType,
    stage: card.dataset.route || 'manager',
    status: getApprovalStageLabel(card.dataset.route || 'manager'),
    submittedAt: null,
    submittedBy: 'Demo workspace',
    currentOwner: getApprovalOwner(card.dataset.route || 'manager'),
    notes: [],
    history: [
      { at: new Date().toISOString(), action: 'Demo approval item loaded', by: 'ContractIQ' }
    ]
  };
}

function viewApprovalItem(btn) {
  const approval = getApprovalFromCard(btn.closest('.approval-card'));
  if (!approval) return;
  openApprovalDetail(approval.ref, approval);
}

function openApprovalDetail(ref, fallback = null) {
  const item = readApprovalQueue().find(entry => entry.ref === ref) || fallback;
  if (!item) {
    showToast('Approval item could not be opened.', 'warning');
    return;
  }
  selectedApprovalRef = ref;
  const panel = document.getElementById('approvalDetailPanel');
  if (!panel) return;
  panel.classList.remove('hidden');
  const set = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };
  set('approvalDetailStage', getApprovalStageLabel(item.stage));
  set('approvalDetailName', item.employeeName);
  set('approvalDetailDoc', item.documentType);
  set('approvalDetailRef', item.ref);
  set('approvalDetailSubmitter', item.submittedBy || 'Current user');
  set('approvalDetailSubmitted', item.submittedAt ? new Date(item.submittedAt).toLocaleString('en-ZA') : 'Demo item');
  set('approvalDetailOwner', item.currentOwner || getApprovalOwner(item.stage));

  const comment = document.getElementById('approvalCommentInput');
  if (comment) comment.value = item.returnReason || '';

  const approve = document.getElementById('approvalDetailApprove');
  const ret = document.getElementById('approvalDetailReturn');
  if (approve) {
    approve.textContent = item.stage === 'signature' ? 'Send for Signature' : item.stage === 'revision' ? 'Revise Draft' : 'Approve Stage';
    approve.disabled = item.stage === 'revision' ? !userCanReviseApproval() : !userCanApproveStage(item.stage);
  }
  if (ret) ret.disabled = item.stage === 'revision';

  renderApprovalHistory(item);
}

function renderApprovalHistory(item) {
  const history = document.getElementById('approvalDetailHistory');
  if (!history) return;
  const entries = [
    ...(item.notes || []).map(note => ({ ...note, action: `Note: ${note.text}` })),
    ...(item.history || [])
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  history.innerHTML = entries.length
    ? entries.map(entry => `
      <div class="approval-history-entry">
        <strong>${escapeHtml(entry.action || entry.text || 'Updated')}</strong>
        <span>${escapeHtml(entry.by || 'ContractIQ')} - ${entry.at ? new Date(entry.at).toLocaleString('en-ZA') : 'Now'}</span>
      </div>
    `).join('')
    : '<div class="approval-history-entry"><strong>No history yet</strong><span>Activity will appear here.</span></div>';
}

function closeApprovalDetail() {
  selectedApprovalRef = null;
  document.getElementById('approvalDetailPanel')?.classList.add('hidden');
}

function getSelectedApprovalCard() {
  if (!selectedApprovalRef) return null;
  return Array.from(document.querySelectorAll('#approvalsList .approval-card'))
    .find(card => card.dataset.ref === selectedApprovalRef) || null;
}

function approveSelectedApproval() {
  const card = getSelectedApprovalCard();
  const item = selectedApprovalRef ? readApprovalQueue().find(entry => entry.ref === selectedApprovalRef) : null;
  if (item?.stage === 'revision') {
    reviseApprovalItem(card?.querySelector('.btn-approve') || document.createElement('button'), item.employeeName);
    return;
  }
  if (card) {
    approveItem(card.querySelector('.btn-approve') || document.createElement('button'), item?.employeeName || 'Approval item');
    return;
  }
  showToast('Sample approvals can be actioned from their row.', 'info');
}

function returnSelectedApproval() {
  const card = getSelectedApprovalCard();
  const item = selectedApprovalRef ? readApprovalQueue().find(entry => entry.ref === selectedApprovalRef) : null;
  if (card) {
    flagApprovalItem(card.querySelector('.btn-flag') || document.createElement('button'), item?.employeeName || 'Approval item');
    return;
  }
  showToast('Sample approvals can be returned from their row.', 'info');
}

function openSelectedApprovalPreview() {
  if (!selectedApprovalRef) return;
  const item = readApprovalQueue().find(entry => entry.ref === selectedApprovalRef);
  if (!item) {
    showToast('Preview is available for generated contracts.', 'info');
    return;
  }
  try {
    sessionStorage.setItem(GENERATED_CONTRACT_KEY, JSON.stringify({
      ref: item.ref,
      fullName: item.employeeName,
      schemaKey: item.schemaKey,
      schemaLabel: item.documentType,
      data: item.data,
      generatedAt: item.submittedAt || new Date().toISOString(),
      submittedForApproval: true
    }));
    setPreviewAccess(true);
  } catch {
    // Preview access can still be routed in normal browser sessions.
  }
  routeTo('preview');
}

function reviseApprovalItem(btn, name) {
  const card = btn.closest?.('.approval-card') || getSelectedApprovalCard();
  const ref = card?.dataset.ref || selectedApprovalRef;
  const queue = readApprovalQueue();
  const item = queue.find(entry => entry.ref === ref);
  if (!item) {
    showToast('Revision is available for generated approval items.', 'info');
    return;
  }
  if (!userCanReviseApproval()) {
    showToast('You do not have permission to revise this contract.', 'warning');
    return;
  }
  item.stage = 'manager';
  item.status = 'Manager Review';
  item.currentOwner = 'HR Manager';
  item.returnReason = '';
  item.history = item.history || [];
  item.history.push({ at: new Date().toISOString(), action: 'Revision accepted and resubmitted', by: getSession?.()?.name || 'Current user' });
  writeApprovalQueue(queue);
  renderGeneratedApprovals();
  refreshApprovalActions();
  updateApprovalStats();
  closeApprovalDetail();
  showToast(`${name} revised and resubmitted to HR Manager.`, 'success');
}

function exportApprovalQueue() {
  const cards = Array.from(document.querySelectorAll('#approvalsList .approval-card'));
  const rows = [['Reference', 'Employee', 'Document', 'Stage', 'Owner']];
  cards.forEach(card => {
    if (card.style.display === 'none') return;
    const item = getApprovalFromCard(card);
    rows.push([item.ref, item.employeeName, item.documentType, getApprovalStageLabel(item.stage), item.currentOwner || getApprovalOwner(item.stage)]);
  });
  const csv = rows.map(row => row.map(value => `"${String(value || '').replace(/"/g, '""')}"`).join(',')).join('\n');
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `approval-queue-${new Date().toISOString().slice(0, 10)}.csv`);
  showToast('Approval queue exported.', 'success');
}

function remindPendingApprovers() {
  const cards = Array.from(document.querySelectorAll('#approvalsList .approval-card')).filter(card => card.dataset.route !== 'revision');
  const recipients = new Set(cards.map(card => getApprovalOwner(card.dataset.route || 'manager')));
  showToast(`Reminder sent to ${Array.from(recipients).join(', ')}.`, 'success');
}

function filterTemplateCards(btn, filter) {
  document.querySelectorAll('#templatesTabs .filter-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('#templateCards .template-card').forEach(card => {
    const isPublished = card.dataset.published === 'true';
    const match = filter === 'all'
      || (filter === 'published' && isPublished)
      || (filter === 'draft' && !isPublished);
    card.style.display = match ? '' : 'none';
  });
}

function initialsFromName(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase() || '').join('') || 'RM';
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function escapeAttribute(value = '') {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

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

    <!-- Status card -->
    <div class="cu-info-card">
      <div class="cu-info-card-title">
        <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        System Status
      </div>
      <div class="cu-api-status-row">
        <span id="cuApiDot" class="cu-api-dot"></span>
        <span id="cuApiStatusText">Checking connection…</span>
      </div>
      <ul class="cu-policy-list" style="margin-top:12px;">
        <li><span class="cu-dot green"></span>New account is saved immediately</li>
        <li><span class="cu-dot green"></span>Login event is recorded in the audit log</li>
        <li><span class="cu-dot amber"></span>Password must be at least 12 characters</li>
        <li><span class="cu-dot amber"></span>Only administrators can create accounts</li>
      </ul>
    </div>

    <!-- What each role can do -->
    <div class="cu-info-card">
      <div class="cu-info-card-title">
        <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        What each role can do
      </div>
      <div class="cu-role-list">
        <div class="cu-role-item">
          <span class="cu-role-name">HR Officer</span>
          <span class="cu-role-desc">Create contracts and view templates</span>
        </div>
        <div class="cu-role-item">
          <span class="cu-role-name">HR Manager</span>
          <span class="cu-role-desc">Everything above, plus review and approve contracts</span>
        </div>
        <div class="cu-role-item">
          <span class="cu-role-name">Director</span>
          <span class="cu-role-desc">Everything above, plus final director approval</span>
        </div>
        <div class="cu-role-item">
          <span class="cu-role-name">Administrator</span>
          <span class="cu-role-desc">Full access — manage users, templates, and settings</span>
        </div>
      </div>
    </div>

    <!-- Tips -->
    <div class="cu-info-card" style="background:linear-gradient(135deg,rgba(212,0,42,.04),rgba(212,0,42,.01));border-color:rgba(212,0,42,.12);">
      <div class="cu-info-card-title" style="color:var(--red-600);">
        <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        Helpful tips
      </div>
      <ul class="cu-policy-list">
        <li><span class="cu-dot red"></span>Share the temporary password securely — don't send it in the same email as the username</li>
        <li><span class="cu-dot red"></span>Enable "Ask them to set their own password" so they choose something personal</li>
        <li><span class="cu-dot red"></span>Only grant Administrator access to people who manage the system</li>
      </ul>
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
    subEl.textContent = `Share the login details below with ${data.firstName} so they can access ContractIQ.`;
  }

  if (detailEl) {
    detailEl.innerHTML = `
      <div style="display:grid;gap:0;">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--coal-100);">
          <span style="color:var(--coal-500);font-size:13px;font-weight:500;">Name</span>
          <strong style="color:var(--coal-900);font-size:13px;">${data.firstName} ${data.lastName}</strong>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--coal-100);">
          <span style="color:var(--coal-500);font-size:13px;font-weight:500;">Email (username)</span>
          <div style="display:flex;align-items:center;gap:8px;">
            <strong style="color:var(--coal-900);font-size:13px;">${data.email}</strong>
            <button class="cu-copy-btn" onclick="cuCopyText('${data.email}','Email')" title="Copy email">
              <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
          </div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--coal-100);">
          <span style="color:var(--coal-500);font-size:13px;font-weight:500;">Temporary password</span>
          <div style="display:flex;align-items:center;gap:8px;">
            <code style="font-family:'Courier New',monospace;font-size:13px;font-weight:700;color:var(--coal-900);background:rgba(212,0,42,.07);padding:3px 8px;border-radius:6px;letter-spacing:.5px;">${data.password}</code>
            <button class="cu-copy-btn" onclick="cuCopyText('${data.password}','Password')" title="Copy password">
              <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
          </div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--coal-100);">
          <span style="color:var(--coal-500);font-size:13px;font-weight:500;">Role</span>
          <strong style="color:var(--coal-900);font-size:13px;">${CU_ROLE_LABELS[data.roleId] || data.roleId}</strong>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;">
          <span style="color:var(--coal-500);font-size:13px;font-weight:500;">Must set own password?</span>
          <strong style="color:var(--coal-900);font-size:13px;">${data.forceChange ? 'Yes — on first login' : 'No'}</strong>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-top:14px;padding:10px 12px;background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.22);border-radius:8px;">
        <svg width="14" height="14" fill="none" stroke="#b45309" stroke-width="2" viewBox="0 0 24 24" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <span style="font-size:12px;color:#92400e;font-weight:600;">Share these credentials securely. The password above will not be shown again.</span>
      </div>`;
  }

  document.getElementById('cuSuccessPanel')?.classList.remove('hidden');
  showToast(`${data.firstName} ${data.lastName} created successfully.`, 'success');
}

/* ── Copy to clipboard ── */
function cuCopyText(text, label) {
  navigator.clipboard.writeText(text).then(() => {
    showToast(`${label} copied to clipboard.`, 'success');
  }).catch(() => {
    // Fallback for older browsers
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0;';
    document.body.appendChild(ta);
    ta.focus(); ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast(`${label} copied.`, 'success');
  });
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
