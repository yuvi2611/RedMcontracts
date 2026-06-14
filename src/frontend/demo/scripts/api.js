'use strict';

/* ═══════════════════════════════════════════════════════════════════
   ContractIQ — Live API connector
   Fetches real data from the Node backend and renders it into each page.
   All functions are safe to call even when the API is offline — they
   fall back silently so the static demo content remains visible.
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

async function initDashboard() {
  // Personalise greeting from session
  const session = typeof getSession === 'function' ? getSession() : null;
  if (session?.firstName || session?.name) {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    setEl('dash-greeting', `${greeting}, ${session.firstName || session.name.split(' ')[0]}`);
  }

  // Show skeletons immediately
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
    const badge = document.querySelector('#nav-approvals .nav-badge');
    if (badge) badge.textContent = data.pendingApprovals;

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
   EMPLOYEES
══════════════════════════════════════════════════════════════════ */

async function initEmployees() {
  const dir = document.getElementById('employeeDirectory');
  if (!dir) return;

  // Show skeletons immediately
  dir.innerHTML = Array(6).fill(skelEmployeeCard()).join('');

  try {
    const data = await apiFetch('/api/employees?limit=100');
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
  } catch (err) {
    console.warn('[api] employees:', err.message);
    dir.innerHTML = '<p style="color:var(--coal-400);padding:20px">Could not load employees — API offline.</p>';
  }
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
      }).join('') : `<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--coal-400)">No contracts found.</td></tr>`;
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
    // Update sidebar badge
    const reviewCount = data.data.filter(c => c.status === 'Review').length;
    const badge = document.querySelector('#nav-contracts .nav-badge');
    if (badge) badge.textContent = reviewCount;

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

async function openContractViewModal(contractId, contractName) {
  if (!contractId) { showToast('Contract not found.', 'warning'); return; }

  const existing = document.getElementById('contractViewModal');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'contractViewModal';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px;overflow-y:auto;';
  overlay.innerHTML = `<div style="background:var(--surface);border-radius:16px;max-width:760px;width:100%;max-height:90vh;overflow-y:auto;padding:32px;position:relative;">
    <button onclick="closeContractViewModal()" style="position:absolute;top:16px;right:16px;background:none;border:none;font-size:20px;cursor:pointer;color:var(--coal-400)">✕</button>
    <div style="text-align:center;padding:40px 0;color:var(--coal-400)">Loading contract…</div>
  </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeContractViewModal(); });

  try {
    const c = await apiFetch(`/api/contracts/${contractId}`);
    const d = c.details || {};
    const inner = overlay.querySelector('div');
    inner.innerHTML = `
      <button onclick="closeContractViewModal()" style="position:absolute;top:16px;right:16px;background:none;border:none;font-size:20px;cursor:pointer;color:var(--coal-400)">✕</button>
      <div style="text-align:center;margin-bottom:20px">
        <div style="font-size:11px;font-weight:700;letter-spacing:.08em;color:var(--red-600);text-transform:uppercase;margin-bottom:4px">RedM Professional Services</div>
        <div style="font-size:17px;font-weight:700;color:var(--coal-900)">${escapeHtml(c.title || c.contractType || 'Contract')}</div>
        <div style="font-size:12px;color:var(--coal-500);margin-top:4px">${escapeHtml(c.contractNumber)} · ${statusBadge(c.status)}</div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:13px" class="schedule-table">
        <tbody>
          <tr><th>Employer:</th><td>RedM Professional Services (Pty) Ltd</td></tr>
          <tr><th>Employee:</th><td>${escapeHtml(c.employee?.name || d.firstName && (d.firstName + ' ' + d.lastName) || contractName || '—')}</td></tr>
          <tr><th>ID Number:</th><td>${escapeHtml(d.idNumber || '—')}</td></tr>
          <tr><th>Address:</th><td>${escapeHtml(d.address || '—')}</td></tr>
          <tr><th>Phone:</th><td>${escapeHtml(d.phoneNumber || c.employee?.phone || '—')}</td></tr>
          <tr><th>Email:</th><td>${escapeHtml(d.emailAddress || c.employee?.email || '—')}</td></tr>
          <tr><th>Position:</th><td>${escapeHtml(c.title || d.role || c.employee?.jobTitle || '—')}</td></tr>
          <tr><th>Contract Type:</th><td>${escapeHtml(c.contractType || '—')}</td></tr>
          ${d.fixedTermPeriod ? `<tr><th>Fixed-Term Period:</th><td>${escapeHtml(d.fixedTermPeriod)}</td></tr>` : ''}
          <tr><th>Commencement Date:</th><td>${fmtDate(c.startDate) || '—'}</td></tr>
          ${c.endDate ? `<tr><th>Termination Date:</th><td>${fmtDate(c.endDate)}</td></tr>` : ''}
          <tr><th>Probation Period:</th><td>${escapeHtml(d.probationPeriod ? d.probationPeriod + ' month(s)' : '—')}</td></tr>
          <tr><th>Hours of Work:</th><td>${escapeHtml(d.workHours || '—')}</td></tr>
          <tr><th>Monthly Salary:</th><td>${fmt(c.salary)} ${c.currency || 'ZAR'}</td></tr>
          <tr><th>Notice Period:</th><td>${escapeHtml(d.noticePeriod || '—')}</td></tr>
          <tr><th>Status:</th><td>${statusBadge(c.status)}</td></tr>
          ${c.submittedAt ? `<tr><th>Submitted:</th><td>${fmtDate(c.submittedAt)}</td></tr>` : ''}
          ${c.approvedAt ? `<tr><th>Approved:</th><td>${fmtDate(c.approvedAt)}</td></tr>` : ''}
          ${c.signedAt ? `<tr><th>Signed:</th><td>${fmtDate(c.signedAt)}</td></tr>` : ''}
        </tbody>
      </table>
      <div style="display:flex;gap:10px;margin-top:20px;justify-content:flex-end">
        <button class="btn-primary" onclick="downloadContractRowPdf('${escapeAttribute(contractId)}','${escapeAttribute(c.employee?.name || contractName || '')}')">Download PDF</button>
        <button class="btn-secondary" onclick="closeContractViewModal()">Close</button>
      </div>`;
  } catch (err) {
    showToast('Could not load contract details.', 'error');
    closeContractViewModal();
  }
}

function closeContractViewModal() {
  document.getElementById('contractViewModal')?.remove();
}

async function downloadContractRowPdf(contractId, contractName) {
  showToast('Opening print window for PDF…', 'info');
  let html;
  try {
    const c = await apiFetch(`/api/contracts/${contractId}`);
    const d = c.details || {};
    const name = c.employee?.name || contractName || '—';
    html = `<!DOCTYPE html><html><head><title>${escapeHtml(c.contractNumber)} — ${escapeHtml(name)}</title>
    <style>body{font-family:Georgia,serif;font-size:12pt;margin:40px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:6px 10px;text-align:left}th{background:#f5f5f5;width:40%}h1{font-size:14pt}h2{font-size:13pt}@media print{body{margin:20px}}</style></head><body>
    <h1>RedM Professional Services</h1><h2>${escapeHtml(c.title || c.contractType || 'Contract')}</h2>
    <p>Ref: ${escapeHtml(c.contractNumber)} | Status: ${escapeHtml(c.status)}</p>
    <table><tbody>
      <tr><th>Employee</th><td>${escapeHtml(name)}</td></tr>
      <tr><th>Position</th><td>${escapeHtml(c.title || d.role || '—')}</td></tr>
      <tr><th>Contract Type</th><td>${escapeHtml(c.contractType || '—')}</td></tr>
      <tr><th>Commencement Date</th><td>${fmtDate(c.startDate) || '—'}</td></tr>
      ${c.endDate ? `<tr><th>Termination Date</th><td>${fmtDate(c.endDate)}</td></tr>` : ''}
      <tr><th>Monthly Salary</th><td>${fmt(c.salary)} ${c.currency || 'ZAR'}</td></tr>
      <tr><th>Notice Period</th><td>${escapeHtml(d.noticePeriod || '—')}</td></tr>
      <tr><th>Hours of Work</th><td>${escapeHtml(d.workHours || '—')}</td></tr>
      <tr><th>Probation Period</th><td>${escapeHtml(d.probationPeriod ? d.probationPeriod + ' month(s)' : '—')}</td></tr>
      <tr><th>ID Number</th><td>${escapeHtml(d.idNumber || '—')}</td></tr>
      <tr><th>Address</th><td>${escapeHtml(d.address || '—')}</td></tr>
    </tbody></table>
    <p style="margin-top:40px">Generated by ContractIQ · RedM Professional Services</p>
    </body></html>`;
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

async function initApprovalsFromApi() {
  // Show skeletons at top of list
  const listEl = document.getElementById('approvalsList');
  if (listEl) {
    const skelContainer = document.createElement('div');
    skelContainer.id = 'approvals-skel';
    skelContainer.innerHTML = Array(3).fill(skelApprovalCard()).join('');
    listEl.prepend(skelContainer);
  }

  try {
    const data = await apiFetch('/api/approvals?status=all');
    if (!data.data?.length) return;

    // Remove skeleton
    document.getElementById('approvals-skel')?.remove();

    const list = document.getElementById('approvalsList');
    if (!list) return;

    // Remove existing static cards (keep generated ones from localStorage)
    list.querySelectorAll('.approval-card:not([data-generated-approval])').forEach(c => c.remove());

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
    const badge = document.querySelector('#nav-approvals .nav-badge');
    if (badge) badge.textContent = pending.length;

    // Update filter tab counts
    updateApprovalStats();
  } catch (err) {
    document.getElementById('approvals-skel')?.remove();
    console.warn('[api] approvals:', err.message);
  }
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

let _auditOffset = 0;

async function initAuditLog() {
  _auditOffset = 0;
  const container = document.getElementById('auditTimeline') ||
                    document.querySelector('#page-audit .audit-timeline');
  if (container) container.innerHTML = Array(6).fill(skelAuditEntry()).join('');

  try {
    const data = await apiFetch('/api/audit-logs?limit=50');
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
  } catch (err) {
    console.warn('[api] audit:', err.message);
    if (container) container.innerHTML = '<p style="color:var(--coal-400);padding:20px 0">Could not load audit log — API offline.</p>';
  }
}

async function loadMoreAuditEntries() {
  _auditOffset += 50;
  const container = document.getElementById('auditTimeline');
  try {
    const data = await apiFetch(`/api/audit-logs?limit=50&offset=${_auditOffset}`);
    if (!data.data?.length) {
      showToast('No older entries found.', 'info');
      _auditOffset -= 50;
      return;
    }
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
    showToast(`Loaded ${data.data.length} older entries.`, 'success');
  } catch (err) {
    showToast('Could not load older entries.', 'error');
    _auditOffset -= 50;
  }
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
  } catch (err) {
    btn.disabled = false;
    btn.textContent = original;
    showToast(`Send failed: ${err.message}`, 'error');
  }
}

/* ══════════════════════════════════════════════════════════════════
   NOTIFICATIONS
══════════════════════════════════════════════════════════════════ */

async function loadNotifications() {
  const session = typeof getSession === 'function' ? getSession() : null;
  if (!session?.id) return;

  try {
    const data = await apiFetch(`/api/notifications?user_id=${encodeURIComponent(session.id)}`);
    const items = data.data || [];

    const panel = document.getElementById('notificationPanel');
    const dot = document.querySelector('.notif-dot');
    if (!panel) return;

    const unread = items.filter(n => !n.is_read);
    if (dot) dot.classList.toggle('is-read', unread.length === 0);

    const list = panel.querySelector('.notif-list') || panel;
    const existingItems = list.querySelectorAll('.notif-item');
    existingItems.forEach(el => el.remove());

    if (items.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'notif-item notif-empty';
      empty.textContent = 'No notifications.';
      list.appendChild(empty);
      return;
    }

    items.slice(0, 20).forEach(n => {
      const el = document.createElement('div');
      el.className = 'notif-item' + (n.is_read ? '' : ' notif-unread');
      el.innerHTML = `<div class="notif-title">${escapeHtml(n.title || n.notification_type)}</div>
        <div class="notif-body">${escapeHtml(n.message || '')}</div>
        <div class="notif-time">${timeAgo(n.created_at)}</div>`;
      list.appendChild(el);
    });
  } catch (err) {
    console.warn('[notifications] load failed:', err.message);
  }
}

async function markAllNotificationsRead() {
  const session = typeof getSession === 'function' ? getSession() : null;
  if (!session?.id) return;
  try {
    await apiFetch('/api/notifications/read', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: session.id }),
    });
    const dot = document.querySelector('.notif-dot');
    if (dot) dot.classList.add('is-read');
  } catch (err) {
    console.warn('[notifications] mark-read failed:', err.message);
  }
}
