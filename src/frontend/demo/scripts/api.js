'use strict';

/* ═══════════════════════════════════════════════════════════════════
   ContractIQ — Live API connector
   Fetches real data from the Node backend and renders it into each page.
   When the API is offline, pages show an explicit error state instead of
   pretending static sample data is live.
═══════════════════════════════════════════════════════════════════ */

const API = window.CONTRACTIQ_API_BASE || 'http://localhost:5000';
const FETCH_TIMEOUT = 8000;

async function apiFetch(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  try {
    // Attach auth token
    const token = (() => { try { return sessionStorage.getItem('contractiq.accessToken') || ''; } catch { return ''; } })();
    const headers = { ...(options.headers || {}) };
    if (token && !headers['Authorization']) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(API + path, { ...options, headers, signal: controller.signal });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `HTTP ${res.status}`);
    }
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

/* ── Skeleton helpers ────────────────────────────────────────────── */

function skelTableRow(cols) {
  const widths = ['80px','140px','110px','90px','72px','80px','80px','60px'];
  const cells = Array.from({ length: cols }, (_, i) =>
    `<td><span class="skel skel-text" style="width:${widths[i] || '80px'}"></span></td>`
  ).join('');
  return `<tr class="skel-tr">${cells}</tr>`;
}

function skelEmployeeCard() {
  return `
    <div class="skel-emp-card">
      <span class="skel skel-avatar"></span>
      <div style="display:flex;flex-direction:column;gap:8px">
        <span class="skel skel-title" style="width:160px"></span>
        <span class="skel skel-text" style="width:220px"></span>
        <div style="display:flex;gap:6px">
          <span class="skel skel-text" style="width:70px"></span>
          <span class="skel skel-text" style="width:90px"></span>
          <span class="skel skel-text" style="width:80px"></span>
        </div>
      </div>
      <span class="skel skel-btn"></span>
    </div>`;
}

function skelApprovalCard() {
  return `
    <div class="skel-approval-card">
      <span class="skel skel-avatar" style="width:44px;height:44px;flex-shrink:0"></span>
      <div style="flex:1;display:flex;flex-direction:column;gap:8px">
        <span class="skel skel-title" style="width:180px"></span>
        <span class="skel skel-text" style="width:260px"></span>
        <div style="display:flex;gap:6px">
          <span class="skel skel-badge"></span>
          <span class="skel skel-badge" style="width:80px"></span>
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-shrink:0">
        <span class="skel skel-btn"></span>
        <span class="skel skel-btn" style="width:72px"></span>
      </div>
    </div>`;
}

function skelAuditEntry() {
  return `
    <div class="skel-audit-entry">
      <span class="skel skel-avatar" style="width:30px;height:30px;flex-shrink:0"></span>
      <div style="flex:1;display:flex;flex-direction:column;gap:7px">
        <span class="skel skel-title" style="width:240px"></span>
        <span class="skel skel-text" style="width:340px"></span>
        <span class="skel skel-text" style="width:120px"></span>
      </div>
    </div>`;
}

function skelTemplateCard() {
  return `
    <div class="skel-template-card">
      <div style="display:flex;align-items:center;gap:12px">
        <span class="skel skel-avatar" style="width:46px;height:46px;border-radius:12px;flex-shrink:0"></span>
        <div style="flex:1;display:flex;flex-direction:column;gap:8px">
          <span class="skel skel-title" style="width:200px"></span>
          <span class="skel skel-text" style="width:140px"></span>
        </div>
        <span class="skel skel-badge"></span>
      </div>
      <span class="skel skel-text" style="width:100%;height:10px"></span>
      <span class="skel skel-text" style="width:75%;height:10px"></span>
    </div>`;
}

/* ── Status badge helper ─────────────────────────────────────────── */
function statusBadge(status) {
  const map = {
    Draft:    'draft',    Review:   'review',  Approved: 'approved',
    Signed:   'signed',   Executed: 'signed',  Rejected: 'returned',
    Archived: 'draft',    Pending:  'review',
    Active:   'approved', 'On Leave': 'review', Terminated: 'returned',
  };
  return `<span class="status-badge ${map[status] || 'draft'}">${status}</span>`;
}

function fmt(amount) {
  if (!amount) return '—';
  return 'R ' + Number(amount).toLocaleString('en-ZA', { minimumFractionDigits: 0 });
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}

function timeAgo(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return 'Just now';
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/* ══════════════════════════════════════════════════════════════════
   DASHBOARD
══════════════════════════════════════════════════════════════════ */

async function initDashboard(silent = false) {
  // Personalise greeting from session
  const session = typeof getSession === 'function' ? getSession() : null;
  if (session?.firstName || session?.name) {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    setEl('dash-greeting', `${greeting}, ${session.firstName || session.name.split(' ')[0]}`);
  }

  // Show skeletons immediately — skipped on silent refreshes (polling / live updates)
  // so the numbers update in place without flashing.
  if (!silent) {
    ['dash-total-contracts','dash-pending-approvals','dash-active-employees','dash-signed-count'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = '<span class="skel skel-num"></span>';
    });
    ['dash-review-count','dash-draft-count','dash-signed-count-2'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = '<span class="skel skel-text" style="width:40px;display:inline-block"></span>';
    });
    const tbody = document.getElementById('dash-recent-contracts');
    if (tbody) tbody.innerHTML = Array(4).fill(skelTableRow(5)).join('');
  }

  try {
    const data = await apiFetch('/api/dashboard');
    setEl('dash-total-contracts',  data.totalContracts);
    setEl('dash-pending-approvals', data.pendingApprovals);
    setEl('dash-active-employees',  data.activeEmployees);
    setEl('dash-signed-count',      data.signedCount);
    setEl('dash-review-count',      data.reviewCount);
    setEl('dash-draft-count',       data.draftCount);
    setEl('dash-signed-count-2',    data.signedCount);

    // Update sidebar approval badge
    setNavBadge('#nav-approvals .nav-badge', data.pendingApprovals);

    const tbody = document.getElementById('dash-recent-contracts');
    if (tbody && data.recentContracts?.length) {
      tbody.innerHTML = data.recentContracts.map(c => `
        <tr style="border-bottom:1px solid var(--coal-100);">
          <td style="padding:10px 14px;"><strong>${escapeHtml(c.contractNumber)}</strong></td>
          <td style="padding:10px 14px;">${escapeHtml(c.employee?.name || '—')}</td>
          <td style="padding:10px 14px;">${statusBadge(c.status)}</td>
          <td style="padding:10px 14px;">${fmt(c.salary)}</td>
          <td style="padding:10px 14px;color:var(--coal-400);">${timeAgo(c.createdAt)}</td>
        </tr>
      `).join('');
    }
  } catch (err) {
    console.warn('[api] dashboard:', err.message);
    const tbody = document.getElementById('dash-recent-contracts');
    if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="padding:16px 14px;color:var(--coal-400);">Could not load live data — API offline.</td></tr>';
  }
}

/* ══════════════════════════════════════════════════════════════════
   LIVE DATA — keep the dashboard & chrome current as the app is used
   - notifyDataChanged(): call after any create/update so open views refresh
   - polling: while a live page is active, refresh quietly on an interval
   - sidebar badges update on every refresh, on any page
══════════════════════════════════════════════════════════════════ */

let _livePollTimer = null;
const LIVE_POLL_MS = 20000;

// Refresh whatever live view is currently active, plus global chrome.
function refreshLiveData(silent = true) {
  const route = document.body.dataset.route;
  if (route === 'dashboard' && typeof initDashboard === 'function') return initDashboard(silent);
  if (route === 'contracts' && typeof initContracts === 'function') return initContracts(_contractsPage || 1);
  if (route === 'approvals' && typeof initApprovalsFromApi === 'function') return initApprovalsFromApi();
  if (route === 'employees' && typeof initEmployees === 'function') return initEmployees();
  if (route === 'analytics' && typeof initAnalytics === 'function') return initAnalytics();
  // Not on a live page — at least keep the sidebar badges current.
  return updateLiveBadges();
}

// Lightweight: refresh the sidebar approval + contracts-review badges anywhere.
// Set a sidebar nav badge — hide it entirely when the count is zero/empty.
function setNavBadge(selector, count) {
  const el = document.querySelector(selector);
  if (!el) return;
  const n = Number(count) || 0;
  el.textContent = n;
  el.hidden = n <= 0;
}

async function updateLiveBadges() {
  try {
    const d = await apiFetch('/api/dashboard');
    setNavBadge('#nav-approvals .nav-badge', d.pendingApprovals);
    setNavBadge('#nav-contracts .nav-badge', d.reviewCount);
  } catch { /* offline — leave existing values */ }
}

// Call after any mutating action so open views reflect the change immediately.
function notifyDataChanged() {
  refreshLiveData(true);
  updateLiveBadges();
  if (typeof refreshNotifBadge === 'function') refreshNotifBadge();
}

// Poll only while a data-driven page is active and the tab is visible.
function startLivePolling() {
  stopLivePolling();
  const route = document.body.dataset.route;
  if (!['dashboard', 'approvals', 'contracts'].includes(route)) return;
  _livePollTimer = setInterval(() => {
    if (document.hidden) return;
    refreshLiveData(true);
    if (typeof refreshNotifBadge === 'function') refreshNotifBadge();
  }, LIVE_POLL_MS);
}

function stopLivePolling() {
  if (_livePollTimer) { clearInterval(_livePollTimer); _livePollTimer = null; }
}

// Refresh immediately when the user returns to a backgrounded tab.
if (typeof document !== 'undefined' && !window.__liveVisibilityBound) {
  window.__liveVisibilityBound = true;
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refreshLiveData(true);
  });
}

/* ══════════════════════════════════════════════════════════════════
   EMPLOYEES
══════════════════════════════════════════════════════════════════ */

let _employeesPage = 1;

async function initEmployees(page = _employeesPage || 1) {
  _employeesPage = page;
  const dir = document.getElementById('employeeDirectory');
  if (!dir) return;
  const limit = 8;

  // Show skeletons immediately
  dir.innerHTML = Array(6).fill(skelEmployeeCard()).join('');

  try {
    const data = await apiFetch(`/api/employees?limit=${limit}&page=${page}`);
    if (!data.data?.length) { dir.innerHTML = '<p style="color:var(--coal-400);padding:20px">No employees found.</p>'; return; }

    const employees = data.data;
    const active = employees.filter(e => e.employmentStatus === 'Active').length;
    const inactive = employees.filter(e => e.employmentStatus !== 'Active').length;
    const healthPct = employees.length > 0 ? Math.round((active / employees.length) * 100) : 0;

    setEl('emp-stat-health', `${healthPct}%`);
    setEl('emp-stat-missing-id', employees.filter(e => !e.employeeId).length);
    setEl('emp-stat-missing-phone', employees.filter(e => !e.phone).length);
    setEl('emp-stat-ready', active);

    const tabs = document.querySelectorAll('#page-employees .filter-tab');
    const tabCounts = [employees.length, active, inactive];
    tabs.forEach((tab, i) => {
      const chip = tab.querySelector('.tab-count');
      if (chip && tabCounts[i] !== undefined) chip.textContent = tabCounts[i];
    });

    const empAvatarColors = ['#d4002a','#7c3aed','#0891b2','#059669','#b45309','#374151','#1d4ed8','#be185d'];
    dir.innerHTML = employees.map((emp, i) => {
      const isActive = emp.employmentStatus === 'Active';
      const status = isActive ? 'ready' : 'needs-data';
      const searchStr = `${emp.name} ${emp.jobTitle} ${emp.department}`.toLowerCase();
      const color = empAvatarColors[i % empAvatarColors.length];
      return `
        <article class="employee-record-card" data-status="${status}" data-search="${escapeHtml(searchStr)}">
          <div class="emp-avatar" style="background:${color};width:38px;height:38px;font-size:13px;border-radius:10px;">${escapeHtml(emp.initials)}</div>
          <div class="employee-record-main">
            <div class="employee-record-top">
              <strong>${escapeHtml(emp.name)}</strong>
              ${statusBadge(emp.employmentStatus)}
            </div>
            <p>${escapeHtml(emp.jobTitle)} · ${escapeHtml(emp.department || '—')}</p>
            <div class="employee-record-meta">
              <span>${escapeHtml(emp.employeeId)}</span>
              <span>${escapeHtml(emp.employmentType)}</span>
              <span>Hired ${fmtDate(emp.hireDate)}</span>
              <span>${emp.contractCount} contract${emp.contractCount !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <button class="btn-secondary" type="button" onclick="prefillWizardFromEmployee(${JSON.stringify({ firstName: emp.firstName, lastName: emp.lastName, email: emp.email, phone: emp.phone || '', jobTitle: emp.jobTitle || '' })});routeTo('wizard')">Use in Contract</button>
        </article>
      `;
    }).join('');
    renderEmployeesPagination(page, Math.ceil((data.total || 0) / limit) || 1, data.total || employees.length);
  } catch (err) {
    console.warn('[api] employees:', err.message);
    dir.innerHTML = '<p style="color:var(--coal-400);padding:20px">Could not load employees — API offline.</p>';
  }
}

function renderEmployeesPagination(page, totalPages, total) {
  const dir = document.getElementById('employeeDirectory');
  if (!dir) return;
  let footer = document.getElementById('employeePaginationFooter');
  if (!footer) {
    footer = document.createElement('div');
    footer.id = 'employeePaginationFooter';
    footer.className = 'table-footer';
    dir.insertAdjacentElement('afterend', footer);
  }
  const controls = totalPages > 1 ? buildSimplePagination(page, totalPages, 'loadEmployeesPage') : '';
  footer.innerHTML = `<span class="table-count">Showing page ${page} of ${totalPages} (${total} employees)</span><div class="pagination">${controls}</div>`;
}

function loadEmployeesPage(page) {
  initEmployees(page);
}

/* ══════════════════════════════════════════════════════════════════
   CONTRACTS
══════════════════════════════════════════════════════════════════ */

let _contractsPage = 1;

async function initContracts(page) {
  page = page || _contractsPage || 1;
  _contractsPage = page;
  const limit = 8;

  // Show skeletons immediately
  const listTbody = document.querySelector('#contractsListView tbody');
  if (listTbody) listTbody.innerHTML = Array(limit).fill(skelTableRow(6)).join('');

  try {
    const data = await apiFetch(`/api/contracts?limit=${limit}&page=${page}`);
    if (!data.data) return;

    const totalPages = Math.ceil((data.total || 0) / limit) || 1;

    // Update count label
    setEl('contractsCount', `Showing ${data.data.length} of ${data.total} contracts`);

    // Render list view rows matching the 6-column thead
    const listView = document.getElementById('contractsListView');
    if (listView) {
      const tbody = listView.querySelector('tbody') || listView;
      tbody.innerHTML = data.data.length ? data.data.map(c => {
        const name = escapeHtml(c.employee?.name || '—');
        const status = (c.status || '').toLowerCase();
        const id = escapeAttribute(c.id);
        return `
          <tr class="contract-row" data-status="${status}"
              data-search="${escapeHtml(`${c.contractNumber} ${c.employee?.name} ${c.title} ${c.contractType}`.toLowerCase())}">
            <td><div class="employee-cell"><div class="emp-avatar" style="background:var(--red-600)">${escapeHtml(initialsFromName(c.employee?.name || ''))}</div><div><div class="emp-name">${name}</div><div class="emp-dept">${escapeHtml(c.contractNumber)}</div></div></div></td>
            <td><span class="type-chip">${escapeHtml(c.contractType || '—')}</span></td>
            <td>${escapeHtml(c.title || c.employee?.jobTitle || '—')}</td>
            <td>${fmtDate(c.startDate) || '—'}</td>
            <td>${statusBadge(c.status)}</td>
            <td><div class="row-actions"><button class="row-btn" onclick="openContractViewModal('${id}','${name}')">View</button><button class="row-btn" onclick="downloadContractRowPdf('${id}','${name}')">PDF</button></div></td>
          </tr>`;
      }).join('') : `<tr><td colspan="6"><div class="contracts-empty">
        <svg width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
        <strong>No contracts yet</strong>
        <span>Generate your first agreement to see it here.</span>
      </div></td></tr>`;
    }

    // Render grid view
    const gridView = document.getElementById('contractsGridView');
    if (gridView) {
      const avatarColors = ['#d4002a','#7c3aed','#0891b2','#059669','#b45309','#374151','#1d4ed8','#be185d'];
      const calIcon = `<svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;
      gridView.innerHTML = `<div class="contracts-grid animate-in">` + data.data.map((c, i) => {
        const name = c.employee?.name || '—';
        const initials = initialsFromName(name);
        const color = avatarColors[i % avatarColors.length];
        const status = (c.status || '').toLowerCase();
        const id = escapeAttribute(c.id);
        return `
        <div class="contract-card" data-status="${status}"
             data-search="${escapeHtml(`${c.contractNumber} ${name} ${c.title}`.toLowerCase())}"
             onclick="openContractViewModal('${id}','${escapeAttribute(name)}')">
          <div class="contract-card-body">
            <div class="contract-card-header">
              <div class="contract-card-avatar" style="background:${color}">${escapeHtml(initials)}</div>
              ${statusBadge(c.status)}
            </div>
            <div class="contract-card-name">${escapeHtml(name)}</div>
            <div class="contract-card-title">${escapeHtml(c.title || '—')}</div>
            <div class="contract-card-meta">
              <span class="type-chip">${escapeHtml(c.contractType || '—')}</span>
              <span class="contract-card-ref">${escapeHtml(c.contractNumber)}</span>
            </div>
            <div class="contract-card-footer">
              <span class="contract-card-date">${calIcon} ${fmtDate(c.startDate) || timeAgo(c.createdAt)}</span>
              <button class="contract-card-action" onclick="event.stopPropagation();openContractViewModal('${id}','${escapeAttribute(name)}')">View →</button>
            </div>
          </div>
        </div>`;
      }).join('') + `</div>`;
    }

    // Update tab counts
    updateContractTabCounts(data.data, data.total);
    // Update sidebar badge (prefer the authoritative total when available)
    const reviewCount = data.reviewTotal ?? data.data.filter(c => c.status === 'Review').length;
    setNavBadge('#nav-contracts .nav-badge', reviewCount);

    // Update pagination controls
    const paginationEl = document.getElementById('contractsPagination') ||
                         document.querySelector('#contractsListView .pagination');
    if (paginationEl) {
      paginationEl.innerHTML = buildContractsPagination(page, totalPages);
    }

  } catch (err) {
    console.warn('[api] contracts:', err.message);
  }
}

function buildContractsPagination(page, total) {
  if (total <= 1) return '';
  const pages = [];
  const prev = page > 1 ? `<button class="page-btn-next" onclick="loadContractsPage(${page - 1})">← Prev</button>` : '';
  for (let p = 1; p <= Math.min(total, 5); p++) {
    pages.push(`<button class="page-btn${p === page ? ' active' : ''}" onclick="loadContractsPage(${p})">${p}</button>`);
  }
  if (total > 5) pages.push(`<span class="page-ellipsis">…</span><button class="page-btn${page === total ? ' active' : ''}" onclick="loadContractsPage(${total})">${total}</button>`);
  const next = page < total ? `<button class="page-btn-next" onclick="loadContractsPage(${page + 1})">Next →</button>` : '';
  return prev + pages.join('') + next;
}

function loadContractsPage(n) {
  _contractsPage = n;
  initContracts(n);
}

function buildSimplePagination(page, total, handlerName) {
  if (total <= 1) return '';
  const pages = [];
  const prev = page > 1 ? `<button class="page-btn-next" onclick="${handlerName}(${page - 1})">Prev</button>` : '';
  for (let p = 1; p <= Math.min(total, 5); p++) {
    pages.push(`<button class="page-btn${p === page ? ' active' : ''}" onclick="${handlerName}(${p})">${p}</button>`);
  }
  if (total > 5) pages.push(`<span class="page-ellipsis">...</span><button class="page-btn${page === total ? ' active' : ''}" onclick="${handlerName}(${total})">${total}</button>`);
  const next = page < total ? `<button class="page-btn-next" onclick="${handlerName}(${page + 1})">Next</button>` : '';
  return prev + pages.join('') + next;
}

// Client-side sort of the currently rendered contract rows.
function sortContractsTable(col, th) {
  const tbody = document.querySelector('#contractsListView tbody');
  if (!tbody) return;
  const rows = Array.from(tbody.querySelectorAll('tr.contract-row'));
  if (rows.length < 2) return;

  const asc = !th.classList.contains('sorted-asc');
  document.querySelectorAll('.contracts-table th.sortable')
    .forEach(h => h.classList.remove('sorted-asc', 'sorted-desc'));
  th.classList.add(asc ? 'sorted-asc' : 'sorted-desc');

  const cellVal = row => {
    const cell = row.children[col];
    if (!cell) return '';
    if (col === 0) return (cell.querySelector('.emp-name')?.textContent || '').trim().toLowerCase();
    if (col === 3) { const t = cell.textContent.trim(); const d = Date.parse(t); return isNaN(d) ? t.toLowerCase() : d; }
    return cell.textContent.trim().toLowerCase();
  };

  rows.sort((a, b) => {
    const va = cellVal(a), vb = cellVal(b);
    if (typeof va === 'number' && typeof vb === 'number') return asc ? va - vb : vb - va;
    return asc ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
  });
  rows.forEach(r => tbody.appendChild(r));
}

function exportContractsCsv() {
  const rows = [['Reference','Employee','Contract Type','Role','Start Date','Status']];
  document.querySelectorAll('#contractsListView .contract-row').forEach(row => {
    if (row.style.display === 'none') return;
    const cells = row.querySelectorAll('td');
    const ref = cells[0]?.querySelector('.emp-dept')?.textContent?.trim() || '';
    const name = cells[0]?.querySelector('.emp-name')?.textContent?.trim() || '';
    const type = cells[1]?.textContent?.trim() || '';
    const role = cells[2]?.textContent?.trim() || '';
    const date = cells[3]?.textContent?.trim() || '';
    const status = cells[4]?.textContent?.trim() || '';
    rows.push([ref, name, type, role, date, status]);
  });
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  downloadBlob(new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' }), `contracts-${new Date().toISOString().slice(0,10)}.csv`);
  showToast('Contracts exported to CSV.', 'success');
}

/* ══════════════════════════════════════════════════════════════════
   CONTRACT DETAIL DRAWER  (premium slide-in panel)
══════════════════════════════════════════════════════════════════ */

const CONTRACT_STAGES = ['Draft', 'Review', 'Approved', 'Signed'];

// Map a contract status to the 4-step timeline state.
function contractTimeline(status) {
  const s = status || 'Draft';
  if (s === 'Rejected') {
    return CONTRACT_STAGES.map((label, i) => {
      if (label === 'Draft')  return { label, cls: 'done', mark: '✓' };
      if (label === 'Review') return { label: 'Rejected', cls: 'rejected', mark: '✕' };
      return { label, cls: '', mark: i + 1 };
    });
  }
  const order = ['Draft', 'Review', 'Approved', 'Signed', 'Executed'];
  let idx = order.indexOf(s);
  if (idx < 0) idx = 0;
  return CONTRACT_STAGES.map((label, i) => {
    const stageIdx = order.indexOf(label);
    if (stageIdx < idx) return { label, cls: 'done', mark: '✓' };
    if (stageIdx === idx) return { label, cls: 'current', mark: i + 1 };
    return { label, cls: '', mark: i + 1 };
  });
}

// Entry point used by list rows / grid cards (keeps the old name).
async function openContractViewModal(contractId, contractName) {
  if (!contractId) { showToast('Contract not found.', 'warning'); return; }
  closeContractViewModal();

  const overlay = document.createElement('div');
  overlay.id = 'contractDrawer';
  overlay.className = 'cdrawer-overlay';
  overlay.innerHTML = `<div class="cdrawer" role="dialog" aria-modal="true" aria-label="Contract details">
    <div class="cdrawer-loading">Loading contract…</div>
  </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeContractViewModal(); });
  document.addEventListener('keydown', drawerEscHandler);
  window.addEventListener('hashchange', closeContractViewModal, { once: true });
  requestAnimationFrame(() => overlay.classList.add('is-open'));

  await renderContractDrawer(contractId, contractName);
}

function drawerEscHandler(e) { if (e.key === 'Escape') closeContractViewModal(); }

async function renderContractDrawer(contractId, contractName) {
  const panel = document.querySelector('#contractDrawer .cdrawer');
  if (!panel) return;
  try {
    const c = await apiFetch(`/api/contracts/${contractId}`);
    const d = c.details || {};
    const name = c.employee?.name
      || (d.firstName ? `${d.firstName} ${d.lastName || ''}`.trim() : '')
      || contractName || '—';

    const steps = contractTimeline(c.status).map(s =>
      `<div class="ctl-step ${s.cls}"><div class="ctl-dot">${s.mark}</div><div class="ctl-label">${escapeHtml(s.label)}</div></div>`
    ).join('');

    const fact = (label, value, cls = '') => (value && value !== '—')
      ? `<div class="cfact-row"><span class="cfact-label">${label}</span><span class="cfact-value ${cls}">${value}</span></div>` : '';

    const parties = [
      fact('Employee', escapeHtml(name)),
      fact('ID Number', escapeHtml(d.idNumber)),
      fact('Email', escapeHtml(d.emailAddress || c.employee?.email)),
      fact('Phone', escapeHtml(d.phoneNumber || c.employee?.phone)),
      fact('Address', escapeHtml(d.address)),
    ].join('');

    const terms = [
      fact('Position', escapeHtml(c.title || d.role || c.employee?.jobTitle)),
      fact('Contract Type', escapeHtml(c.contractType)),
      fact('Monthly Salary', `${fmt(c.salary)} ${c.currency || 'ZAR'}`, 'salary'),
      fact('Commencement', fmtDate(c.startDate)),
      c.endDate ? fact('Termination', fmtDate(c.endDate)) : '',
      fact('Probation', d.probationPeriod ? `${d.probationPeriod} month(s)` : ''),
      fact('Notice Period', escapeHtml(d.noticePeriod)),
      fact('Hours of Work', escapeHtml(d.workHours)),
    ].join('');

    const history = [
      c.submittedAt ? fact('Submitted', fmtDate(c.submittedAt)) : '',
      c.approvedAt ? fact('Approved', fmtDate(c.approvedAt)) : '',
      c.signedAt ? fact('Signed', fmtDate(c.signedAt)) : '',
    ].join('');

    panel.innerHTML = `
      <div class="cdrawer-header">
        <button class="cdrawer-close" onclick="closeContractViewModal()" aria-label="Close">✕</button>
        <div class="cdrawer-eyebrow">RedMPS · ContractIQ</div>
        <h2 class="cdrawer-title">${escapeHtml(c.title || c.contractType || 'Contract')}</h2>
        <div class="cdrawer-submeta"><span>${escapeHtml(c.contractNumber)}</span><span class="dot"></span>${statusBadge(c.status)}</div>
      </div>
      <div class="cdrawer-body">
        <div class="cdrawer-timeline">${steps}</div>
        <div class="cdrawer-section">
          <div class="cdrawer-section-title">Parties</div>
          <div class="cfacts">${parties || '<div class="cfact-row"><span class="cfact-value">No party details captured.</span></div>'}</div>
        </div>
        <div class="cdrawer-section">
          <div class="cdrawer-section-title">Terms</div>
          <div class="cfacts">${terms}</div>
        </div>
        ${history ? `<div class="cdrawer-section"><div class="cdrawer-section-title">History</div><div class="cfacts">${history}</div></div>` : ''}
      </div>
      <div class="cdrawer-actions">${contractDrawerActions(c, name)}</div>`;
  } catch (err) {
    showToast('Could not load contract details.', 'error');
    closeContractViewModal();
  }
}

// Inline lifecycle actions, gated by the contract's current status.
function contractDrawerActions(c, name) {
  const id = escapeAttribute(c.id);
  const nm = escapeAttribute(name);
  const pdf = `<button class="btn-secondary" onclick="downloadContractRowPdf('${id}','${nm}')">Download PDF</button>`;
  let primary = '', hint = '';
  switch (c.status) {
    case 'Draft':
      primary = `<button class="btn-primary" onclick="drawerSubmitContract('${id}')">Submit for Approval</button>`;
      break;
    case 'Review':
      primary = `<button class="btn-primary" onclick="closeContractViewModal();routeTo('approvals')">Open Approval Queue</button>`;
      hint = 'Awaiting a reviewer decision.';
      break;
    case 'Approved':
      primary = `<button class="btn-primary" onclick="drawerSendToEmployee('${id}')">Send to Employee</button>`;
      break;
    case 'Signed':
    case 'Executed':
      primary = `<button class="btn-primary" onclick="drawerSendToEmployee('${id}')">Resend to Employee</button>`;
      hint = 'This contract is fully executed.';
      break;
    case 'Rejected':
      hint = 'Returned for revision — edit and resubmit from the studio.';
      break;
  }
  return `${primary}${pdf}${hint ? `<p class="cdrawer-hint">${hint}</p>` : ''}`;
}

function refreshContractsList() {
  const pg = (typeof _contractsPage !== 'undefined' && _contractsPage) || 1;
  if (typeof initContracts === 'function') initContracts(pg);
}

async function drawerSubmitContract(id) {
  try {
    await apiFetch(`/api/contracts/${id}/submit`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    showToast('Contract submitted for approval.', 'success');
    await renderContractDrawer(id);
    notifyDataChanged();
  } catch (err) { showToast(err.message || 'Could not submit contract.', 'error'); }
}

async function drawerSendToEmployee(id) {
  try {
    const r = await apiFetch(`/api/contracts/${id}/send-to-employee`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    showToast(`Contract sent to ${r.sentTo || 'employee'}.`, 'success');
    await renderContractDrawer(id);
    notifyDataChanged();
  } catch (err) { showToast(err.message || 'Could not send contract.', 'error'); }
}

function closeContractViewModal() {
  document.removeEventListener('keydown', drawerEscHandler);
  const ov = document.getElementById('contractDrawer');
  if (!ov) { document.getElementById('contractViewModal')?.remove(); return; }
  ov.classList.remove('is-open');
  setTimeout(() => ov.remove(), 300);
}

// Build a fully branded, signature-ready RedMPS contract document (print → PDF).
// Shared by the contracts list and the preview page so exports look identical.
function buildContractDocumentHtml(c, d, name) {
  d = d || {};
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const row = (label, value) => (value && value !== '—')
    ? `<tr><th>${label}</th><td>${value}</td></tr>` : '';
  const salary = `${fmt(c.salary)} ${c.currency || 'ZAR'}`;

  const scheduleRows = [
    row('Employee', escapeHtml(name)),
    row('Identity Number', escapeHtml(d.idNumber)),
    row('Physical Address', escapeHtml(d.address)),
    row('Phone', escapeHtml(d.phoneNumber || c.employee?.phone)),
    row('Email', escapeHtml(d.emailAddress || c.employee?.email)),
    row('Position', escapeHtml(c.title || d.role || c.employee?.jobTitle)),
    row('Contract Type', escapeHtml(c.contractType)),
    row('Commencement Date', fmtDate(c.startDate)),
    c.endDate ? row('Termination Date', fmtDate(c.endDate)) : '',
    row('Probation Period', d.probationPeriod ? `${escapeHtml(d.probationPeriod)} month(s)` : ''),
    row('Hours of Work', escapeHtml(d.workHours || '08:00 – 17:00, Monday – Friday')),
    row('Gross Monthly Salary', salary),
    row('Notice Period', escapeHtml(d.noticePeriod || '30 days')),
  ].join('');

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<title>${escapeHtml(c.contractNumber)} — ${escapeHtml(name)}</title>
<style>
  @page { size: A4; margin: 22mm 20mm; }
  * { box-sizing: border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #1a1a1a; font-size: 11.5pt; line-height: 1.6; margin: 0; }
  .letterhead { border-bottom: 3px solid #d4002a; padding-bottom: 16px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: flex-end; }
  .lh-brand { font-family: 'Arial', sans-serif; }
  .lh-brand .name { font-size: 22pt; font-weight: 800; letter-spacing: 1px; color: #0d0d0f; text-transform: uppercase; }
  .lh-brand .name span { color: #d4002a; }
  .lh-brand .tag { font-size: 8.5pt; letter-spacing: 2px; text-transform: uppercase; color: #d4002a; font-weight: 700; margin-top: 2px; }
  .lh-meta { text-align: right; font-family: Arial, sans-serif; font-size: 8pt; color: #555; line-height: 1.5; }
  .doc-title { text-align: center; margin: 26px 0 4px; font-size: 16pt; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; }
  .doc-sub { text-align: center; font-size: 9pt; color: #666; font-style: italic; margin-bottom: 4px; }
  .doc-ref { text-align: center; font-family: Arial, sans-serif; font-size: 8.5pt; color: #777; margin-bottom: 22px; }
  table.schedule { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 10.5pt; }
  table.schedule th, table.schedule td { border: 1px solid #d8d8d8; padding: 8px 12px; text-align: left; vertical-align: top; }
  table.schedule th { background: #f6f6f8; width: 38%; font-weight: 700; color: #0d0d0f; }
  .party-band { background: #0d0d0f; color: #fff; font-family: Arial, sans-serif; font-size: 8.5pt; letter-spacing: 1px; text-transform: uppercase; padding: 7px 12px; font-weight: 700; }
  .party-band.red { background: #d4002a; }
  .clause h3 { font-size: 11pt; margin: 18px 0 6px; color: #0d0d0f; }
  .clause p { margin: 0 0 10px; text-align: justify; }
  .sign-grid { display: flex; gap: 40px; margin-top: 42px; }
  .sign-box { flex: 1; }
  .sign-line { border-top: 1.5px solid #1a1a1a; margin-top: 46px; padding-top: 6px; font-family: Arial, sans-serif; font-size: 8.5pt; color: #555; }
  .sign-name { font-family: Arial, sans-serif; font-weight: 700; font-size: 10pt; color: #0d0d0f; margin-bottom: 2px; }
  .doc-footer { margin-top: 36px; border-top: 1px solid #e0e0e0; padding-top: 10px; font-family: Arial, sans-serif; font-size: 7.5pt; color: #999; text-align: center; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head><body>
  <div class="letterhead">
    <div class="lh-brand">
      <div class="name">Red<span>MPS</span></div>
      <div class="tag">Professional Services</div>
    </div>
    <div class="lh-meta">
      RedM Professional Services (Pty) Ltd · Reg 2013/172695/07<br>
      145 Western Services Road, Woodmead, Sandton, 2191<br>
      +27 10 300 9025
    </div>
  </div>

  <div class="doc-title">${escapeHtml(c.title || c.contractType || 'Employment Agreement')}</div>
  <div class="doc-sub">In compliance with the Basic Conditions of Employment Act, 1997</div>
  <div class="doc-ref">Reference ${escapeHtml(c.contractNumber)} · Status: ${escapeHtml(c.status)} · Issued ${today}</div>

  <div class="party-band red">Schedule — Particulars of Employment</div>
  <table class="schedule"><tbody>
    <tr><th>Employer</th><td>RedM Professional Services (Pty) Ltd</td></tr>
    ${scheduleRows}
  </tbody></table>

  <div class="clause">
    <h3>1. Appointment</h3>
    <p>The Employer appoints the Employee in the position set out in the Schedule, and the Employee accepts such appointment, on the terms and conditions of this Agreement and the Employer's policies as amended from time to time.</p>
    <h3>2. Remuneration</h3>
    <p>The Employee shall receive a gross monthly salary of ${salary}, payable monthly in arrears, subject to such statutory and agreed deductions as may be applicable.</p>
    <h3>3. Probation</h3>
    <p>The Employee's appointment is subject to a probationary period as stated in the Schedule, during which the Employer may assess the Employee's suitability and conduct in accordance with the Labour Relations Act, 1995.</p>
    <h3>4. Hours of Work</h3>
    <p>Ordinary hours of work are as set out in the Schedule, in line with the Basic Conditions of Employment Act, 1997.</p>
    <h3>5. Termination</h3>
    <p>Either party may terminate this Agreement on the notice period set out in the Schedule, save for termination for cause in accordance with applicable law and fair procedure.</p>
    <h3>6. Confidentiality &amp; Governing Law</h3>
    <p>The Employee shall keep the Employer's confidential information secret during and after employment. This Agreement is governed by the laws of the Republic of South Africa.</p>
  </div>

  <div class="party-band">Signatures</div>
  <div class="sign-grid">
    <div class="sign-box">
      <div class="sign-name">For RedM Professional Services (Pty) Ltd</div>
      <div class="sign-line">Authorised signatory · Date</div>
    </div>
    <div class="sign-box">
      <div class="sign-name">${escapeHtml(name)}</div>
      <div class="sign-line">Employee signature · Date</div>
    </div>
  </div>

  <div class="doc-footer">Generated by ContractIQ · RedMPS Management &amp; Professional Services · ${escapeHtml(c.contractNumber)} · This is a confidential document.</div>
</body></html>`;
}

async function downloadContractRowPdf(contractId, contractName) {
  showToast('Preparing contract document…', 'info');
  let html;
  try {
    const c = await apiFetch(`/api/contracts/${contractId}`);
    const name = c.employee?.name || contractName || '—';
    html = buildContractDocumentHtml(c, c.details || {}, name);
  } catch {
    showToast('Could not load contract for PDF.', 'error');
    return;
  }
  const win = window.open('', '_blank', 'width=900,height=1100');
  if (!win) { showToast('Allow pop-ups to open the PDF print window.', 'warning'); return; }
  win.document.open(); win.document.write(html); win.document.close();
  win.onload = () => { win.focus(); win.print(); };
}

function updateContractTabCounts(contracts, total) {
  const counts = { all: contracts.length };
  contracts.forEach(c => {
    const key = (c.status || '').toLowerCase();
    counts[key] = (counts[key] || 0) + 1;
  });

  // Stats row cards (use API total for the "total" stat)
  setEl('cstat-total',   total || counts.all || 0);
  setEl('cstat-active',  (counts.review || 0) + (counts.approved || 0));
  setEl('cstat-pending', counts.draft || 0);
  setEl('cstat-signed',  (counts.signed || 0) + (counts.executed || 0));

  // Filter tabs
  document.querySelectorAll('#contractsTabs .filter-tab').forEach(btn => {
    const filter = btn.getAttribute('onclick')?.match(/'([^']+)'/)?.[1] || 'all';
    const chip = btn.querySelector('.tab-count');
    if (chip) chip.textContent = filter === 'all' ? (total || counts.all) : (counts[filter] ?? 0);
  });
}

/* ══════════════════════════════════════════════════════════════════
   APPROVALS  (extends existing initApprovals)
══════════════════════════════════════════════════════════════════ */

let _approvalsPage = 1;

async function initApprovalsFromApi(page = _approvalsPage || 1) {
  _approvalsPage = page;
  const limit = 8;
  // Show skeletons at top of list
  const listEl = document.getElementById('approvalsList');
  if (listEl) {
    const skelContainer = document.createElement('div');
    skelContainer.id = 'approvals-skel';
    skelContainer.innerHTML = Array(3).fill(skelApprovalCard()).join('');
    listEl.prepend(skelContainer);
  }

  try {
    const data = await apiFetch(`/api/approvals?status=all&limit=${limit}&page=${page}`);
    // Remove skeleton
    document.getElementById('approvals-skel')?.remove();

    const list = document.getElementById('approvalsList');
    if (!list) return;

    // Remove existing static cards (keep generated ones from localStorage)
    list.querySelectorAll('.approval-card:not([data-generated-approval])').forEach(c => c.remove());

    if (!data.data?.length) {
      renderApprovalsPagination(page, Math.ceil((data.total || 0) / limit) || 1, data.total || 0);
      return;
    }

    const pending = data.data.filter(a => a.status === 'Pending');

    // Show "Send to Employee" for fully approved contracts
    const fullyApproved = data.data.filter(a => a.status === 'Approved' && a.contract.status === 'Approved');
    const seenApproved = new Set();
    fullyApproved.forEach(a => {
      if (seenApproved.has(a.contract.id)) return;
      seenApproved.add(a.contract.id);
      const card = document.createElement('div');
      card.className = 'approval-card';
      card.dataset.route = 'approved';
      card.dataset.ref = a.contract.contractNumber;
      card.innerHTML = `
        <div class="approval-card-left">
          <div class="emp-avatar" style="background:var(--green-600,#16a34a);width:44px;height:44px;font-size:15px;flex-shrink:0">
            ${escapeHtml(initialsFromName(a.employee.name))}
          </div>
          <div class="approval-card-info">
            <div class="approval-card-name">${escapeHtml(a.employee.name)}</div>
            <div class="approval-card-doc">${escapeHtml(a.contract.title || a.contract.contractNumber)} <span class="ref-chip">${escapeHtml(a.contract.contractNumber)}</span></div>
            <span class="status-badge approved" style="margin-top:4px;display:inline-block">Approved — ready to send</span>
          </div>
        </div>
        <div class="approval-card-right">
          <div class="approval-meta">
            <span class="approval-age">${timeAgo(a.decidedAt)}</span>
          </div>
          <div class="approval-actions-row">
            <button class="btn-approve" onclick="sendToEmployee(this,'${escapeAttribute(a.contract.id)}','${escapeAttribute(a.employee.name)}')">Send to Employee</button>
          </div>
        </div>
      `;
      list.appendChild(card);
    });

    pending.forEach(a => {
      const stage = a.step === 1 ? 'manager' : a.step === 2 ? 'director' : 'signature';
      const card = document.createElement('div');
      card.className = 'approval-card';
      card.dataset.route = stage;
      card.dataset.ref = a.contract.contractNumber;
      card.dataset.approvalId = a.id;
      card.innerHTML = `
        <div class="approval-card-left">
          <div class="emp-avatar" style="background:var(--red-600);width:44px;height:44px;font-size:15px;flex-shrink:0">
            ${escapeHtml(initialsFromName(a.employee.name))}
          </div>
          <div class="approval-card-info">
            <div class="approval-card-name">${escapeHtml(a.employee.name)}</div>
            <div class="approval-card-doc">${escapeHtml(a.contract.title || a.contract.contractNumber)} <span class="ref-chip">${escapeHtml(a.contract.contractNumber)}</span></div>
            ${renderApprovalRoute(stage)}
          </div>
        </div>
        <div class="approval-card-right">
          <div class="approval-meta">
            <span class="status-badge ${getApprovalBadgeClass(stage)}">${getApprovalStageLabel(stage)}</span>
            <span class="approval-age">${timeAgo(a.createdAt)}</span>
          </div>
          <div class="approval-actions-row">
            <button class="btn-approve" onclick="approveFromApi(this,'${escapeAttribute(a.id)}','${escapeAttribute(a.employee.name)}')">Approve</button>
            <button class="btn-flag" onclick="rejectFromApi(this,'${escapeAttribute(a.id)}','${escapeAttribute(a.employee.name)}')">Reject</button>
          </div>
        </div>
      `;
      list.appendChild(card);
    });

    // Update stat numbers
    const director   = data.data.filter(a => a.status === 'Pending' && a.step === 2).length;
    const signature  = data.data.filter(a => a.status === 'Pending' && a.step >= 3).length;
    const approved   = data.data.filter(a => a.status === 'Approved').length;
    setEl('apstat-awaiting',       pending.length);
    setEl('apstat-director',       director);
    setEl('apstat-signature',      signature);
    setEl('apstat-approved-month', approved);

    // Update sidebar badge
    setNavBadge('#nav-approvals .nav-badge', pending.length);

    // Update filter tab counts
    updateApprovalStats();
    renderApprovalsPagination(page, Math.ceil((data.total || 0) / limit) || 1, data.total || data.data.length);
  } catch (err) {
    document.getElementById('approvals-skel')?.remove();
    console.warn('[api] approvals:', err.message);
  }
}

function renderApprovalsPagination(page, totalPages, total) {
  const list = document.getElementById('approvalsList');
  if (!list) return;
  let footer = document.getElementById('approvalsPaginationFooter');
  if (!footer) {
    footer = document.createElement('div');
    footer.id = 'approvalsPaginationFooter';
    footer.className = 'table-footer';
    list.insertAdjacentElement('afterend', footer);
  }
  const controls = totalPages > 1 ? buildSimplePagination(page, totalPages, 'loadApprovalsPage') : '';
  footer.innerHTML = `<span class="table-count">Showing page ${page} of ${totalPages} (${total} approval items)</span><div class="pagination">${controls}</div>`;
}

function loadApprovalsPage(page) {
  initApprovalsFromApi(page);
}

async function approveFromApi(btn, approvalId, name) {
  btn.disabled = true;
  btn.textContent = 'Approving…';
  try {
    await apiFetch(`/api/approvals/${approvalId}/approve`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const card = btn.closest('.approval-card');
    card.style.opacity = '0';
    card.style.transition = 'opacity .3s';
    setTimeout(async () => {
      card.remove();
      updateApprovalStats();
      await initApprovalsFromApi();
      notifyDataChanged();
    }, 350);
    showToast(`${name} approved — routed to next stage.`, 'success');
  } catch (err) {
    btn.disabled = false;
    btn.textContent = 'Approve';
    showToast(`Approval failed: ${err.message}`, 'error');
  }
}

async function rejectFromApi(btn, approvalId, name) {
  btn.disabled = true;
  try {
    await apiFetch(`/api/approvals/${approvalId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment: 'Returned for revision.' }),
    });
    const card = btn.closest('.approval-card');
    card.dataset.route = 'revision';
    showToast(`${name} returned for revision.`, 'warning');
    await initApprovalsFromApi();
    notifyDataChanged();
  } catch (err) {
    btn.disabled = false;
    showToast(`Reject failed: ${err.message}`, 'error');
  }
}

/* ══════════════════════════════════════════════════════════════════
   ANALYTICS
══════════════════════════════════════════════════════════════════ */

async function initAnalytics() {
  try {
    const data = await apiFetch('/api/analytics');

    // Command strip
    if (data.sla) {
      const hours = parseFloat(data.sla.avg_approval_hours || 0);
      setEl('analytics-sla-hours', hours > 0 ? `${Math.round(hours * 10) / 10}h avg` : '—');
      setEl('analytics-approved-total', data.sla.approved_total || 0);
    }
    if (data.byStatus) {
      const total = data.byStatus.reduce((sum, s) => sum + Number(s.count), 0);
      setEl('analytics-total-contracts', total || '—');
    }

    // Generation volume bar chart
    const barChart = document.querySelector('#page-analytics .bar-chart');
    if (barChart && data.byMonth?.length) {
      const max = Math.max(...data.byMonth.map(m => Number(m.count)), 1);
      barChart.innerHTML = data.byMonth.slice(-6).map(m => `
        <div style="--bar:${Math.round((Number(m.count) / max) * 100)}%">
          <span>${escapeHtml(m.month.split(' ')[0])}</span>
        </div>
      `).join('');
    }

    // Bottlenecks panel
    const bottlenecks = document.querySelector('#page-analytics .insight-list');
    if (bottlenecks && data.byStatus?.length) {
      const statusMap = Object.fromEntries(data.byStatus.map(s => [s.status, Number(s.count)]));
      bottlenecks.innerHTML = `
        <div><strong>In Review</strong><span>${statusMap['Review'] || 0} contract${statusMap['Review'] !== 1 ? 's' : ''} awaiting approval</span></div>
        <div><strong>Approved — pending signature</strong><span>${statusMap['Approved'] || 0} contract${statusMap['Approved'] !== 1 ? 's' : ''} ready for signing</span></div>
        <div><strong>Rejected</strong><span>${statusMap['Rejected'] || 0} returned for revision</span></div>
      `;
    }

    // Template performance — uses .template-performance.analytics-type-list
    const typePanel = document.querySelector('#page-analytics .analytics-type-list');
    if (typePanel && data.byType?.length) {
      const maxCount = Math.max(...data.byType.map(t => Number(t.count)), 1);
      typePanel.innerHTML = data.byType.map(t => {
        const pct = Math.round((Number(t.count) / maxCount) * 100);
        return `
          <div>
            <span>${escapeHtml(t.name)}</span>
            <strong>${t.count} generated</strong>
            <i><b style="width:${pct}%"></b></i>
          </div>
        `;
      }).join('');
    }

  } catch (err) {
    console.warn('[api] analytics:', err.message);
  }
}

/* ══════════════════════════════════════════════════════════════════
   AUDIT LOG
══════════════════════════════════════════════════════════════════ */

const AUDIT_DOT_MAP = {
  contract: 'green', approval: 'blue', auth: 'coal', system: 'amber',
  template: 'purple', employee: 'blue', user: 'coal',
};

let _auditPage = 1;
let _auditTotalPages = 1;
const AUDIT_PAGE_LIMIT = 50;

async function initAuditLog() {
  _auditPage = 1;
  const container = document.getElementById('auditTimeline') ||
                    document.querySelector('#page-audit .audit-timeline');
  if (container) container.innerHTML = Array(6).fill(skelAuditEntry()).join('');

  try {
    const data = await apiFetch(`/api/audit-logs?limit=${AUDIT_PAGE_LIMIT}&page=1`);
    _auditTotalPages = Math.ceil((data.total || 0) / AUDIT_PAGE_LIMIT) || 1;
    if (!container) return;
    if (!data.data?.length) {
      container.innerHTML = '<p style="color:var(--coal-400);padding:20px 0">No audit entries found.</p>';
      return;
    }

    // Group by date
    const groups = {};
    data.data.forEach(e => {
      const day = new Date(e.createdAt).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      if (!groups[day]) groups[day] = [];
      groups[day].push(e);
    });

    const docIcon = `<svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>`;
    const checkIcon = `<svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="9 11 12 14 22 4"/></svg>`;
    const infoIcon = `<svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
    const loginIcon = `<svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>`;

    function iconFor(type) {
      if (type === 'approval') return checkIcon;
      if (type === 'auth') return loginIcon;
      if (type === 'system' || type === 'template') return infoIcon;
      return docIcon;
    }

    let html = '';
    Object.entries(groups).forEach(([day, entries]) => {
      html += `<div class="audit-date-group">${escapeHtml(day)}</div>`;
      entries.forEach(e => {
        const type = (e.entityType || '').toLowerCase();
        const dotClass = AUDIT_DOT_MAP[type] || 'coal';
        html += `
          <div class="audit-entry" data-type="${escapeHtml(type)}">
            <div class="audit-icon-col">
              <div class="audit-dot ${dotClass}">${iconFor(type)}</div>
              <div class="audit-line"></div>
            </div>
            <div class="audit-body">
              <div class="audit-title"><strong>${escapeHtml(e.actor)}</strong> — ${escapeHtml(e.action)}</div>
              <div class="audit-detail">${escapeHtml(e.details)}</div>
              <div class="audit-time">${fmtDate(e.createdAt)}</div>
            </div>
          </div>
        `;
      });
    });

    container.innerHTML = html;
    updateAuditLoadMoreButton();
  } catch (err) {
    console.warn('[api] audit:', err.message);
    if (container) container.innerHTML = '<p style="color:var(--coal-400);padding:20px 0">Could not load audit log — API offline.</p>';
  }
}

async function loadMoreAuditEntries() {
  if (_auditPage >= _auditTotalPages) {
    showToast('No older entries found.', 'info');
    updateAuditLoadMoreButton();
    return;
  }
  _auditPage += 1;
  const container = document.getElementById('auditTimeline');
  try {
    const data = await apiFetch(`/api/audit-logs?limit=${AUDIT_PAGE_LIMIT}&page=${_auditPage}`);
    if (!data.data?.length) {
      showToast('No older entries found.', 'info');
      _auditPage -= 1;
      updateAuditLoadMoreButton();
      return;
    }
    _auditTotalPages = Math.ceil((data.total || 0) / AUDIT_PAGE_LIMIT) || _auditTotalPages;
    const docIcon = `<svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>`;
    const checkIcon = `<svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="9 11 12 14 22 4"/></svg>`;
    const infoIcon = `<svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
    const loginIcon = `<svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>`;
    function iconForType(type) {
      if (type === 'approval') return checkIcon;
      if (type === 'auth') return loginIcon;
      if (type === 'system' || type === 'template') return infoIcon;
      return docIcon;
    }
    let html = '';
    data.data.forEach(e => {
      const type = (e.entityType || '').toLowerCase();
      const dotClass = AUDIT_DOT_MAP[type] || 'coal';
      html += `<div class="audit-entry" data-type="${escapeHtml(type)}">
        <div class="audit-icon-col"><div class="audit-dot ${dotClass}">${iconForType(type)}</div><div class="audit-line"></div></div>
        <div class="audit-body">
          <div class="audit-title"><strong>${escapeHtml(e.actor)}</strong> — ${escapeHtml(e.action)}</div>
          <div class="audit-detail">${escapeHtml(e.details)}</div>
          <div class="audit-time">${fmtDate(e.createdAt)}</div>
        </div>
      </div>`;
    });
    if (container) container.insertAdjacentHTML('beforeend', html);
    updateAuditLoadMoreButton();
    showToast(`Loaded ${data.data.length} older entries.`, 'success');
  } catch (err) {
    showToast('Could not load older entries.', 'error');
    _auditPage -= 1;
  }
}

function updateAuditLoadMoreButton() {
  const btn = document.querySelector('#page-audit button[onclick="loadMoreAuditEntries()"]');
  if (!btn) return;
  const hasMore = _auditPage < _auditTotalPages;
  btn.disabled = !hasMore;
  btn.textContent = hasMore ? `Load older entries (${_auditPage}/${_auditTotalPages})` : 'No older entries';
}

/* ══════════════════════════════════════════════════════════════════
   TEMPLATES
══════════════════════════════════════════════════════════════════ */

async function initTemplates() {
  const container = document.getElementById('templateCards') ||
                    document.querySelector('#page-templates .template-cards');
  if (container) container.innerHTML = Array(3).fill(skelTemplateCard()).join('');

  try {
    const data = await apiFetch('/api/templates');
    if (!container) return;
    if (!data.data?.length) {
      container.innerHTML = '<p style="color:var(--coal-400);padding:20px">No templates found.</p>';
      return;
    }

    const templates = data.data;
    const published = templates.filter(t => t.is_active).length;
    const drafts = templates.filter(t => !t.is_active).length;
    const totalGenerated = templates.reduce((sum, t) => sum + (Number(t.usage_count) || 0), 0);

    setEl('tcov-published', published);
    setEl('tcov-draft', drafts);
    setEl('tcov-total', templates.length);
    setEl('tcov-generated', totalGenerated);

    // Update tab counts
    document.querySelectorAll('#templatesTabs .filter-tab').forEach(btn => {
      const filter = btn.getAttribute('onclick')?.match(/'([^']+)'/)?.[1] || 'all';
      const chip = btn.querySelector('.tab-count');
      if (!chip) return;
      if (filter === 'all') chip.textContent = templates.length;
      else if (filter === 'published') chip.textContent = published;
      else if (filter === 'draft') chip.textContent = drafts;
    });

    const docSvg = `<svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>`;

    container.innerHTML = templates.map(t => {
      const isActive = !!t.is_active;
      const draftClass = isActive ? '' : ' draft';
      const iconClass = isActive ? '' : ' amber';
      const badgeClass = isActive ? 'approved' : 'draft';
      const badgeLabel = isActive ? 'Published' : 'Draft';
      const versionClass = isActive ? '' : ' draft-v';
      return `
        <div class="template-card${draftClass}" data-published="${isActive}">
          <div class="template-card-header">
            <div class="template-doc-icon${iconClass}">${docSvg}</div>
            <div style="flex:1">
              <div class="template-card-name">${escapeHtml(t.name)}</div>
              <div class="template-card-meta">
                <span class="version-badge${versionClass}">v${escapeHtml(String(t.version || 1))}</span>
                <span class="status-badge ${badgeClass}" style="font-size:10px;padding:2px 8px">${badgeLabel}</span>
              </div>
            </div>
            <div class="template-card-actions">
              <button class="icon-btn" title="Edit" onclick="showToast('Opening template editor…','info')">
                <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="icon-btn" title="Duplicate" onclick="showToast('Template duplicated as draft.','success')">
                <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              </button>
            </div>
          </div>
          <div class="template-card-body">
            <div class="template-stat-row">
              <span class="template-stat">${escapeHtml(t.contract_type || '—')}</span>
              <span class="template-stat"><strong>${t.usage_count || 0}</strong> contracts generated</span>
            </div>
            <p style="font-size:12.5px;color:var(--coal-500);margin-top:6px">${escapeHtml(t.description || '—')}</p>
            ${!isActive ? `<div class="draft-notice" style="margin-top:10px"><svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> This template requires review before use.</div>` : ''}
          </div>
          <div class="template-card-footer">
            <span class="template-updated">Updated ${fmtDate(t.updated_at)}</span>
            <button class="${isActive ? 'btn-secondary' : 'btn-primary'}" style="font-size:12px;padding:6px 14px" onclick="${isActive ? "routeTo('wizard')" : "showToast('Template submitted for review.','success')"}">${isActive ? 'Use Template' : 'Submit for Review'}</button>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.warn('[api] templates:', err.message);
    if (container) container.innerHTML = '<p style="color:var(--coal-400);padding:20px">Could not load templates — API offline.</p>';
  }
}

/* ══════════════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════════════ */

function setEl(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

/* ══════════════════════════════════════════════════════════════════
   EMPLOYEE → WIZARD AUTO-FILL
══════════════════════════════════════════════════════════════════ */

function prefillWizardFromEmployee(emp) {
  // Store the prefill data; wizard picks it up on mount
  try {
    sessionStorage.setItem('contractiq.wizardPrefill', JSON.stringify(emp));
  } catch {
    // Ignore
  }
}

function applyWizardPrefillIfPresent() {
  let data = null;
  try {
    data = JSON.parse(sessionStorage.getItem('contractiq.wizardPrefill') || 'null');
    sessionStorage.removeItem('contractiq.wizardPrefill');
  } catch {
    return;
  }
  if (!data) return;

  const set = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val; };
  set('firstName',    data.firstName);
  set('lastName',     data.lastName);
  set('emailAddress', data.email);
  set('phoneNumber',  data.phone);
  set('role',         data.jobTitle);

  if (typeof updateFormProgress === 'function') updateFormProgress();
  if (typeof saveContractDraft === 'function') saveContractDraft({ quiet: true });

  showToast(`Form pre-filled for ${data.firstName} ${data.lastName}.`, 'success');
}

/* ══════════════════════════════════════════════════════════════════
   SEND CONTRACT TO EMPLOYEE  (post-approval one-click)
══════════════════════════════════════════════════════════════════ */

async function sendToEmployee(btn, contractId, employeeName) {
  if (!contractId) { showToast('No contract ID — open the contract first.', 'warning'); return; }
  btn.disabled = true;
  const original = btn.textContent;
  btn.textContent = 'Sending…';
  try {
    const session = typeof getSession === 'function' ? getSession() : null;
    const data = await apiFetch(`/api/contracts/${contractId}/send-to-employee`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sender_name: session?.name || 'HR' }),
    });
    btn.textContent = 'Sent ✓';
    showToast(`Contract sent to ${employeeName} at ${data.sentTo}.`, 'success');
    notifyDataChanged();
  } catch (err) {
    btn.disabled = false;
    btn.textContent = original;
    showToast(`Send failed: ${err.message}`, 'error');
  }
}

/* ══════════════════════════════════════════════════════════════════
   NOTIFICATIONS
══════════════════════════════════════════════════════════════════ */

// Colour the status dot by notification type.
const NOTIF_DOT = {
  approval_requested: 'warning', approval_reminder: 'warning',
  contract_created: 'info', contract_sent: 'info',
  contract_approved: 'success', user_welcome: 'success',
  contract_rejected: 'danger', contract_expired: 'danger',
  contract_expiring: 'warning',
  password_reset: 'info', user_invite: 'info',
};

function notifRoute(type) {
  const t = type || '';
  if (t.startsWith('approval')) return 'approvals';
  if (t.startsWith('contract')) return 'contracts';
  if (t.startsWith('user')) return 'create-user';
  return 'dashboard';
}

function setNotifUnreadCount(n) {
  const dot = document.querySelector('.notif-dot');
  if (dot) dot.classList.toggle('is-read', n === 0);
  const badge = document.getElementById('notifCount');
  if (badge) {
    badge.textContent = n > 9 ? '9+' : String(n);
    badge.hidden = n === 0;
  }
}

async function loadNotifications() {
  const session = typeof getSession === 'function' ? getSession() : null;
  if (!session?.id) return;

  const list = document.getElementById('notifList');
  try {
    const data = await apiFetch('/api/notifications');
    const items = data.data || [];
    const unread = items.filter(n => !n.is_read).length;
    setNotifUnreadCount(unread);

    if (!list) return;
    if (items.length === 0) {
      list.innerHTML = '<div class="notif-empty">You\'re all caught up — no notifications.</div>';
      return;
    }

    list.innerHTML = items.slice(0, 30).map(n => {
      const dotCls = NOTIF_DOT[n.notification_type] || 'info';
      const route = notifRoute(n.notification_type);
      return `<button class="notification-item${n.is_read ? '' : ' is-unread'}" type="button" onclick="openNotification('${route}')">
        <span class="notification-dot ${dotCls}"></span>
        <div class="notif-body-wrap">
          <strong>${escapeHtml(n.title || n.notification_type)}</strong>
          <small>${escapeHtml(n.message || '')}</small>
          <span class="notif-time">${timeAgo(n.created_at)}</span>
        </div>
      </button>`;
    }).join('');
  } catch (err) {
    console.warn('[notifications] load failed:', err.message);
    if (list) list.innerHTML = '<div class="notif-empty">Could not load notifications — API offline.</div>';
  }
}

// Refresh just the unread badge without opening the panel (used by live updates).
async function refreshNotifBadge() {
  const session = typeof getSession === 'function' ? getSession() : null;
  if (!session?.id) return;
  try {
    const data = await apiFetch('/api/notifications');
    setNotifUnreadCount((data.data || []).filter(n => !n.is_read).length);
  } catch { /* offline — leave as-is */ }
}

function openNotification(route) {
  if (typeof toggleNotificationPanel === 'function') toggleNotificationPanel(false);
  if (route && typeof routeTo === 'function') routeTo(route);
}

async function markAllNotificationsRead() {
  const session = typeof getSession === 'function' ? getSession() : null;
  if (!session?.id) return;
  try {
    await apiFetch('/api/notifications/read', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    setNotifUnreadCount(0);
    // Reflect read state in any currently rendered items.
    document.querySelectorAll('#notifList .notification-item.is-unread')
      .forEach(el => el.classList.remove('is-unread'));
  } catch (err) {
    console.warn('[notifications] mark-read failed:', err.message);
  }
}
