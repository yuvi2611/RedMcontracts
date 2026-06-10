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
    const res = await fetch(API + path, { ...options, signal: controller.signal });
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
          <button class="btn-secondary" type="button" onclick="routeTo('wizard')">Use in Contract</button>
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

async function initContracts() {
  // Show skeletons immediately
  const listTbody = document.querySelector('#contractsListView tbody');
  if (listTbody) listTbody.innerHTML = Array(6).fill(skelTableRow(6)).join('');
  const gridV = document.getElementById('contractsGridView');
  if (gridV) gridV.innerHTML = Array(6).fill(skelTemplateCard()).join('');

  try {
    const data = await apiFetch('/api/contracts?limit=100');
    if (!data.data?.length) return;

    // Update count label
    setEl('contractsCount', `Showing ${data.data.length} of ${data.total} contracts`);

    // Render list view
    const listView = document.getElementById('contractsListView');
    if (listView) {
      const tbody = listView.querySelector('tbody') || listView;
      tbody.innerHTML = data.data.map(c => `
        <tr class="contract-row" data-status="${(c.status || '').toLowerCase()}"
            data-search="${escapeHtml(`${c.contractNumber} ${c.employee?.name} ${c.title} ${c.contractType}`.toLowerCase())}">
          <td><strong>${escapeHtml(c.contractNumber)}</strong></td>
          <td>${escapeHtml(c.employee?.name || '—')}</td>
          <td>${escapeHtml(c.title || '—')}</td>
          <td>${escapeHtml(c.contractType || '—')}</td>
          <td>${statusBadge(c.status)}</td>
          <td>${fmt(c.salary)}</td>
          <td>${fmtDate(c.startDate)}</td>
          <td>${timeAgo(c.createdAt)}</td>
        </tr>
      `).join('');
    }

    // Render grid view
    const gridView = document.getElementById('contractsGridView');
    if (gridView) {
      const avatarColors = ['#d4002a','#7c3aed','#0891b2','#059669','#b45309','#374151','#1d4ed8','#be185d'];
      gridView.innerHTML = `<div class="contracts-grid animate-in">` + data.data.map((c, i) => {
        const name = c.employee?.name || '—';
        const initials = initialsFromName(name);
        const color = avatarColors[i % avatarColors.length];
        const status = (c.status || '').toLowerCase();
        const isReview = status === 'review' || status === 'pending';
        const actionLabel = isReview ? 'Remind →' : 'View →';
        const actionToast = isReview ? 'Reminder sent.' : 'Opening preview…';
        const calIcon = `<svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;
        return `
        <div class="contract-card" data-status="${status}"
             data-search="${escapeHtml(`${c.contractNumber} ${name} ${c.title}`.toLowerCase())}"
             onclick="showToast('Opening ${escapeHtml(name)} contract…','info')">
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
              <button class="contract-card-action" onclick="event.stopPropagation();showToast('${actionToast}','${isReview ? 'success' : 'info'}')">${actionLabel}</button>
            </div>
          </div>
        </div>`;
      }).join('') + `</div>`;
    }

    // Update tab counts
    updateContractTabCounts(data.data);
    // Update sidebar badge
    const reviewCount = data.data.filter(c => c.status === 'Review').length;
    const badge = document.querySelector('#nav-contracts .nav-badge');
    if (badge) badge.textContent = reviewCount;

  } catch (err) {
    console.warn('[api] contracts:', err.message);
  }
}

function updateContractTabCounts(contracts) {
  const counts = { all: contracts.length };
  contracts.forEach(c => {
    const key = (c.status || '').toLowerCase();
    counts[key] = (counts[key] || 0) + 1;
  });

  // Stats row cards
  setEl('cstat-total',   counts.all || 0);
  setEl('cstat-active',  (counts.review || 0) + (counts.approved || 0));
  setEl('cstat-pending', counts.draft || 0);
  setEl('cstat-signed',  (counts.signed || 0) + (counts.executed || 0));

  // Filter tabs
  document.querySelectorAll('#contractsTabs .filter-tab').forEach(btn => {
    const filter = btn.getAttribute('onclick')?.match(/'([^']+)'/)?.[1] || 'all';
    const chip = btn.querySelector('.tab-count');
    if (chip) chip.textContent = counts[filter] ?? counts.all;
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
    setTimeout(() => { card.remove(); updateApprovalStats(); }, 350);
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

async function initAuditLog() {
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
            <button class="${isActive ? 'btn-secondary' : 'btn-primary'}" style="font-size:12px;padding:6px 14px" onclick="showToast('${isActive ? 'Opening contract wizard…' : 'Submitted for review.'}','${isActive ? 'info' : 'success'}')">${isActive ? 'Use Template' : 'Submit for Review'}</button>
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
