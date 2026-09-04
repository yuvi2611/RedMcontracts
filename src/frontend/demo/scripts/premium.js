/* ═══════════════════════════════════════════════════════════════════
   PREMIUM LAYER — flow / click-reduction. Loaded LAST.
   All additive & feature-detected. No existing function is redefined.
═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const call = (name, ...args) => (typeof window[name] === 'function' ? window[name](...args) : undefined);

  /* Top-level `const` from other classic scripts is a global lexical binding,
     NOT a window property — reach it bare, guarded. */
  const ROUTES = () => { try { return APP_ROUTES || {}; } catch { return {}; } };
  const SEARCH_ITEMS = () => { try { return GLOBAL_SEARCH_ITEMS || []; } catch { return []; } };
  const SUGGESTIONS = () => { try { return CONTRACTA_SUGGESTIONS || {}; } catch { return {}; } };

  /* ─────────────────────────────────────────────
     FIX: Contracta suggestion chips were rendered with a broken inline
     onclick (JSON.stringify puts double-quotes inside a double-quoted
     attribute) so clicking did nothing. Rebuild them with real listeners.
  ───────────────────────────────────────────── */
  window.renderContractaSuggestions = function () {
    const el = document.getElementById('faqChatSuggestions');
    if (!el) return;
    const route = typeof window.getCurrentContractaRoute === 'function'
      ? window.getCurrentContractaRoute() : 'dashboard';
    const map = SUGGESTIONS();
    const questions = map[route] || map._default || [];
    el.replaceChildren(...questions.map(q => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = q;
      b.addEventListener('click', () => call('askFaqSuggestion', q));
      return b;
    }));
  };

  /* ─────────────────────────────────────────────
     COMMAND PALETTE  (⌘K / Ctrl+K)
  ───────────────────────────────────────────── */

  const RECENT_KEY = 'contractiq.cmdkRecent';
  let paletteEl = null;
  let items = [];
  let activeIndex = 0;

  function readRecent() {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
  }
  function pushRecent(route) {
    try {
      const next = [route, ...readRecent().filter(r => r !== route)].slice(0, 4);
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch { /* storage disabled */ }
  }

  function routeTitle(route) {
    const map = ROUTES();
    return (map[route] && map[route].title) || route;
  }

  function buildItems(query) {
    const q = query.trim().toLowerCase();
    const groups = [];
    const onPreview = (location.hash || '').includes('preview');

    /* Context actions */
    const actions = [
      { icon: '＋', title: 'New contract', meta: 'Guided Contract Studio', kbd: '', run: () => call('routeTo', 'wizard') },
      { icon: '⇥', title: 'Toggle sidebar', meta: 'Collapse / expand navigation', run: () => call('toggleSidebar') }
    ];
    if (onPreview) {
      actions.unshift(
        { icon: '✔', title: 'Submit for approval', meta: 'Route this contract', run: () => call('submitCurrentContractForApproval') },
        { icon: '⇩', title: 'Export PDF', meta: 'Download this contract', run: () => call('downloadContractPdf') },
        { icon: '⇩', title: 'Export Word', meta: 'Download .docx', run: () => call('downloadContractWord') },
        { icon: '✎', title: 'Send for signature', meta: 'e-signature request', run: () => call('sendCurrentContractForSignature') }
      );
    }
    actions.push({ icon: '⎋', title: 'Sign out', meta: 'End session', run: () => call('signOut') });

    /* Navigation — from GLOBAL_SEARCH_ITEMS + all routes */
    const seen = new Set();
    const nav = [];
    SEARCH_ITEMS().forEach(it => {
      seen.add(it.route);
      nav.push({ icon: '→', title: it.label, meta: it.meta, route: it.route, keywords: it.keywords || '' });
    });
    const routeMap = ROUTES();
    Object.keys(routeMap).forEach(route => {
      const r = routeMap[route];
      if (r.public || seen.has(route)) return;
      nav.push({ icon: '→', title: r.title, meta: 'Go to ' + r.title, route });
    });

    /* Recent */
    const recent = readRecent()
      .filter(r => routeMap[r] && !routeMap[r].public)
      .map(r => ({ icon: '↺', title: routeTitle(r), meta: 'Recent', route: r }));

    const match = it => !q || (it.title + ' ' + (it.meta || '') + ' ' + (it.keywords || '')).toLowerCase().includes(q);

    if (!q && recent.length) groups.push({ label: 'Recent', list: recent });
    groups.push({ label: 'Actions', list: actions.filter(match) });
    groups.push({ label: 'Navigate', list: nav.filter(match) });
    return groups.filter(g => g.list.length);
  }

  function flatten(groups) {
    return groups.reduce((acc, g) => acc.concat(g.list), []);
  }

  function renderPalette(query) {
    const groups = buildItems(query);
    items = flatten(groups);
    if (activeIndex >= items.length) activeIndex = 0;

    const results = $('.cmdk-results', paletteEl);
    if (!groups.length) {
      results.innerHTML = '<div class="cmdk-empty">No matches</div>';
      return;
    }
    let idx = 0;
    results.innerHTML = groups.map(g => `
      <div class="cmdk-group-label">${g.label}</div>
      ${g.list.map(it => {
        const i = idx++;
        return `<button class="cmdk-item${i === activeIndex ? ' is-active' : ''}" data-i="${i}">
          <span class="cmdk-item-icon">${it.icon || '→'}</span>
          <span class="cmdk-item-body">
            <span class="cmdk-item-title">${escapeHtml(it.title)}</span>
            ${it.meta ? `<span class="cmdk-item-meta">${escapeHtml(it.meta)}</span>` : ''}
          </span>
          ${it.kbd ? `<span class="cmdk-item-kbd">${it.kbd}</span>` : ''}
        </button>`;
      }).join('')}
    `).join('');

    $$('.cmdk-item', results).forEach(btn => {
      btn.addEventListener('mousemove', () => setActive(+btn.dataset.i, false));
      btn.addEventListener('click', () => runItem(+btn.dataset.i));
    });
    scrollActiveIntoView();
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function setActive(i, scroll = true) {
    activeIndex = Math.max(0, Math.min(i, items.length - 1));
    $$('.cmdk-item', paletteEl).forEach(el => el.classList.toggle('is-active', +el.dataset.i === activeIndex));
    if (scroll) scrollActiveIntoView();
  }
  function scrollActiveIntoView() {
    $('.cmdk-item.is-active', paletteEl)?.scrollIntoView({ block: 'nearest' });
  }

  function runItem(i) {
    const it = items[i];
    if (!it) return;
    closePalette();
    if (it.route) { pushRecent(it.route); call('routeTo', it.route); }
    else if (typeof it.run === 'function') it.run();
  }

  function ensurePalette() {
    if (paletteEl) return paletteEl;
    paletteEl = document.createElement('div');
    paletteEl.className = 'cmdk-overlay hidden';
    paletteEl.setAttribute('role', 'dialog');
    paletteEl.setAttribute('aria-label', 'Command palette');
    paletteEl.innerHTML = `
      <div class="cmdk-panel">
        <div class="cmdk-input-row">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input class="cmdk-input" type="text" placeholder="Search actions, pages, exports…" aria-label="Command palette search" autocomplete="off" spellcheck="false">
          <span class="cmdk-esc">ESC</span>
        </div>
        <div class="cmdk-results"></div>
        <div class="cmdk-footer"><span><b>↑↓</b> navigate</span><span><b>↵</b> run</span><span><b>esc</b> close</span></div>
      </div>`;
    document.body.appendChild(paletteEl);

    const input = $('.cmdk-input', paletteEl);
    input.addEventListener('input', () => { activeIndex = 0; renderPalette(input.value); });
    input.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(activeIndex + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(activeIndex - 1); }
      else if (e.key === 'Enter') { e.preventDefault(); runItem(activeIndex); }
      else if (e.key === 'Escape') { e.preventDefault(); closePalette(); }
    });
    paletteEl.addEventListener('mousedown', e => { if (e.target === paletteEl) closePalette(); });
    return paletteEl;
  }

  function openPalette() {
    if (!document.getElementById('appShell') || document.getElementById('appShell').classList.contains('hidden')) return;
    ensurePalette();
    activeIndex = 0;
    paletteEl.classList.remove('hidden');
    const input = $('.cmdk-input', paletteEl);
    input.value = '';
    renderPalette('');
    setTimeout(() => input.focus(), 20);
  }
  function closePalette() {
    paletteEl?.classList.add('hidden');
  }
  window.openCommandPalette = openPalette;

  /* Capture-phase hotkey — beats app.js's bubble listener (openGlobalSearch) */
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (paletteEl && !paletteEl.classList.contains('hidden')) closePalette();
      else openPalette();
    }
  }, true);

  /* ─────────────────────────────────────────────
     WIZARD — clickable steps + sticky readiness bar
  ───────────────────────────────────────────── */

  const PANEL_BY_STEP = { intent: 0, employee: 0, terms: 1, compliance: 2, approval: 'generate' };

  function panelTitleIndex(page, n) {
    const panels = $$('.form-panel', page);
    return panels[n] || null;
  }

  function enhanceWizard() {
    const page = $('#page-wizard');
    if (!page || page.dataset.premium === '1') return;
    page.dataset.premium = '1';

    /* Clickable journey steps */
    $$('.step-item[data-step]', page).forEach(step => {
      step.setAttribute('tabindex', '0');
      step.setAttribute('role', 'button');
      const go = () => {
        const target = PANEL_BY_STEP[step.dataset.step];
        if (target === 'generate') {
          $('#generatePreviewButton', page)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
        const panel = panelTitleIndex(page, target);
        if (panel) {
          panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
          panel.querySelector('input,select,textarea')?.focus({ preventScroll: true });
        }
      };
      step.addEventListener('click', go);
      step.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    });

    /* Clickable checklist rows → focus the matching field */
    $$('.field-check-item[data-field]', page).forEach(row => {
      row.setAttribute('tabindex', '0');
      row.setAttribute('role', 'button');
      const go = () => {
        const f = row.dataset.field;
        const el = $('#' + f, page) || $('#' + (f === 'name' ? 'firstName' : f), page)
          || $(`[data-date-target="${f}"]`, page);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(() => el.focus({ preventScroll: true }), 260);
        }
      };
      row.addEventListener('click', go);
      row.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    });

    /* Sticky readiness meter inside the footer */
    const footer = $('.wizard-footer', page);
    if (footer && !$('.wizard-readiness', footer)) {
      const meter = document.createElement('div');
      meter.className = 'wizard-readiness';
      meter.innerHTML = `
        <span class="wizard-readiness-track"><span class="wizard-readiness-fill"></span></span>
        <span class="wizard-readiness-label">0% ready</span>`;
      footer.insertBefore(meter, footer.firstChild);

      const fill = $('.wizard-readiness-fill', meter);
      const label = $('.wizard-readiness-label', meter);
      const sync = () => {
        const src = $('#readinessScore', page) || $('#formProgressPct', page);
        const pct = src ? (parseInt(src.textContent, 10) || 0) : 0;
        fill.style.width = pct + '%';
        label.textContent = pct + '% ready';
      };
      sync();
      const src = $('#readinessScore', page);
      if (src) new MutationObserver(sync).observe(src, { childList: true, characterData: true, subtree: true });
      $('#contractForm', page)?.addEventListener('input', () => setTimeout(sync, 60));
    }

    /* Ctrl+Enter anywhere in the form → generate preview */
    $('#contractForm', page)?.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        call('generateContractPreview');
      }
    });
  }

  /* ─────────────────────────────────────────────
     PREVIEW — consolidated export menu
  ───────────────────────────────────────────── */

  window.toggleExportMenu = function (force) {
    const list = document.getElementById('exportMenuList');
    if (!list) return;
    const show = force === undefined ? list.classList.contains('hidden') : force;
    list.classList.toggle('hidden', !show);
  };
  window.approveAndExport = function () {
    call('submitCurrentContractForApproval');
    window.toggleExportMenu(true);
  };
  document.addEventListener('click', e => {
    const menu = document.querySelector('.export-menu');
    if (menu && !menu.contains(e.target)) window.toggleExportMenu(false);
  });

  /* ─────────────────────────────────────────────
     DASHBOARD — actionable KPIs + resume-draft chip
  ───────────────────────────────────────────── */

  const KPI_ROUTES = ['contracts', 'approvals', 'employees', 'contracts'];

  function enhanceDashboard() {
    const page = $('#page-dashboard');
    if (!page) return;

    $$('.kpi-card', page).forEach((card, i) => {
      if (card.dataset.premium === '1') return;
      card.dataset.premium = '1';
      const route = KPI_ROUTES[i];
      if (!route) return;
      card.classList.add('is-actionable');
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.addEventListener('click', () => call('routeTo', route));
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); call('routeTo', route); }
      });
    });

    renderResumeChip(page);
  }

  function renderResumeChip(page) {
    let slot = $('#dash-resume-slot', page);
    const draft = call('readGeneratedContract');
    const existing = $('.resume-draft-chip', page);
    if (existing) existing.remove();
    if (!draft || sessionStorage.getItem('contractiq.resumeChipDismissed') === '1') return;

    const name = draft.employeeName || draft.name ||
      [draft.firstName, draft.lastName].filter(Boolean).join(' ') || 'your last contract';
    const type = draft.contractType || draft.documentType || 'Contract';

    const chip = document.createElement('div');
    chip.className = 'resume-draft-chip';
    chip.innerHTML = `
      <span class="rd-icon" aria-hidden="true"></span>
      <span class="rd-body">
        <strong>Resume where you left off</strong>
        <span>${escapeHtml(type)} &middot; ${escapeHtml(name)}</span>
      </span>
      <button class="btn-primary" type="button">Open preview</button>
      <button class="rd-dismiss" type="button" aria-label="Dismiss">&times;</button>`;
    chip.querySelector('.rd-icon').textContent = '⤴';
    chip.querySelector('.btn-primary').addEventListener('click', () => call('routeTo', 'preview'));
    chip.querySelector('.rd-dismiss').addEventListener('click', () => {
      try { sessionStorage.setItem('contractiq.resumeChipDismissed', '1'); } catch {}
      chip.remove();
    });

    if (slot) slot.replaceChildren(chip);
    else {
      const anchor = $('.automation-hero', page) || $('.kpi-grid', page);
      anchor?.parentNode.insertBefore(chip, anchor);
    }
  }

  /* ─────────────────────────────────────────────
     CONTRACTA — persistence · quick actions · slash commands ·
     copy · scroll-to-latest · hotkey · input recall
  ───────────────────────────────────────────── */

  const CHAT_TX_KEY = 'contractiq.contractaTx';
  const CHAT_STATE_KEY = 'contractiq.contractaState';
  let contractaWired = false;

  const SLASH_CMDS = [
    { c: '/new',       d: 'Start a new contract',        run: () => { call('routeTo', 'wizard');    call('toggleFaqChat', false); } },
    { c: '/approvals', d: 'Open the approval queue',      run: () => { call('routeTo', 'approvals'); call('toggleFaqChat', false); } },
    { c: '/contracts', d: 'Open contracts',               run: () => { call('routeTo', 'contracts'); call('toggleFaqChat', false); } },
    { c: '/dashboard', d: 'Open the dashboard',           run: () => { call('routeTo', 'dashboard'); call('toggleFaqChat', false); } },
    { c: '/employees', d: 'Open the employee directory',  run: () => { call('routeTo', 'employees'); call('toggleFaqChat', false); } },
    { c: '/snapshot',  d: 'Live workspace numbers',       run: () => call('askFaqSuggestion', 'give me a live workspace snapshot') },
    { c: '/help',      d: 'What Contracta can do',         run: () => call('askFaqSuggestion', 'what can Contracta help me with?') },
    { c: '/expand',    d: 'Toggle the reading pane',       run: () => $('.ai-expand-btn')?.click() },
    { c: '/clear',     d: 'Clear this conversation',       run: () => call('clearFaqChat') }
  ];

  function chatEls() {
    const panel = $('#faqChatPanel');
    return {
      panel,
      fab: $('.ai-chat-fab'),
      msgs: $('#faqChatMessages'),
      form: $('#faqChatForm'),
      input: $('#faqChatInput'),
      headerActions: panel && $('.ai-chat-header-actions', panel),
      header: panel && $('.ai-chat-header', panel)
    };
  }

  function saveChatState(el) {
    try { localStorage.setItem(CHAT_STATE_KEY, JSON.stringify({ expanded: el.panel.classList.contains('is-expanded') })); } catch {}
  }
  function restoreChatState(el) {
    try {
      const s = JSON.parse(localStorage.getItem(CHAT_STATE_KEY) || '{}');
      if (s.expanded) el.panel.classList.add('is-expanded');
    } catch {}
    try {
      const tx = JSON.parse(sessionStorage.getItem(CHAT_TX_KEY) || '[]');
      if (Array.isArray(tx) && tx.length >= 2 && typeof window.appendFaqMessage === 'function') {
        el.msgs.innerHTML = '';
        tx.forEach(m => window.appendFaqMessage(m.x, m.t));
      }
    } catch {}
  }

  function wireTranscriptPersistence(el) {
    let t;
    const save = () => {
      const tx = $$('.ai-message:not(.typing)', el.msgs)
        .map(m => ({ t: m.classList.contains('user') ? 'user' : 'bot', x: (m.querySelector('.ai-msg-content > span')?.textContent || '').trim() }))
        .filter(m => m.x)
        .slice(-40);
      try { sessionStorage.setItem(CHAT_TX_KEY, JSON.stringify(tx)); } catch {}
    };
    new MutationObserver(() => { clearTimeout(t); t = setTimeout(save, 300); })
      .observe(el.msgs, { childList: true, subtree: true, characterData: true });
  }

  function injectExpandButton(el) {
    if (!el.headerActions || $('.ai-expand-btn', el.panel)) return;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ai-expand-btn';
    b.setAttribute('aria-label', 'Expand Contracta');
    b.innerHTML = '<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>';
    b.addEventListener('click', () => {
      const expanded = el.panel.classList.toggle('is-expanded');
      b.setAttribute('aria-label', expanded ? 'Collapse Contracta' : 'Expand Contracta');
      saveChatState(el);
    });
    el.headerActions.insertBefore(b, el.headerActions.firstChild);
  }

  function injectQuickbar(el) {
    if (!el.header || $('.ai-quickbar', el.panel)) return;
    const bar = document.createElement('div');
    bar.className = 'ai-quickbar';
    [
      { label: 'New contract', act: () => { call('routeTo', 'wizard'); call('toggleFaqChat', false); } },
      { label: 'Approvals',    act: () => { call('routeTo', 'approvals'); call('toggleFaqChat', false); } },
      { label: 'Snapshot',     act: () => call('askFaqSuggestion', 'give me a live workspace snapshot') },
      { label: 'What can you do?', act: () => call('askFaqSuggestion', 'what can Contracta help me with?') }
    ].forEach(it => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = it.label;
      b.addEventListener('click', it.act);
      bar.appendChild(b);
    });
    el.header.insertAdjacentElement('afterend', bar);
  }

  function injectSlashMenu(el) {
    if (!el.form || $('.ai-slash-menu', el.form)) return;
    const menu = document.createElement('div');
    menu.className = 'ai-slash-menu hidden';
    el.form.appendChild(menu);

    let active = 0;
    const visible = () => !menu.classList.contains('hidden');
    const items = () => $$('.ai-slash-item', menu);
    const hide = () => { menu.classList.add('hidden'); active = 0; };

    const render = q => {
      const list = SLASH_CMDS.filter(c => c.c.startsWith(q));
      if (!list.length) { hide(); return; }
      active = Math.min(active, list.length - 1);
      menu.innerHTML = list.map((c, i) => `
        <button type="button" class="ai-slash-item${i === active ? ' is-active' : ''}" data-cmd="${c.c}">
          <span class="ai-slash-cmd">${c.c}</span><span class="ai-slash-desc">${escapeHtml(c.d)}</span>
        </button>`).join('');
      items().forEach(btn => {
        btn.addEventListener('mousemove', () => { active = items().indexOf(btn); paint(); });
        btn.addEventListener('click', () => runCmd(btn.dataset.cmd));
      });
      menu.classList.remove('hidden');
    };
    const paint = () => items().forEach((b, i) => b.classList.toggle('is-active', i === active));
    const runCmd = cmd => {
      const found = SLASH_CMDS.find(c => c.c === cmd) || SLASH_CMDS.filter(c => c.c.startsWith(cmd))[0];
      hide();
      el.input.value = '';
      found?.run();
    };

    el.input.addEventListener('input', () => {
      const v = el.input.value;
      if (v.startsWith('/')) render(v.trim().toLowerCase());
      else hide();
    });
    el.input.addEventListener('keydown', e => {
      if (!visible()) return;
      const n = items().length;
      if (e.key === 'ArrowDown') { e.preventDefault(); active = (active + 1) % n; paint(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); active = (active - 1 + n) % n; paint(); }
      else if (e.key === 'Enter') { e.preventDefault(); e.stopImmediatePropagation(); runCmd(items()[active]?.dataset.cmd); }
      else if (e.key === 'Escape') { e.preventDefault(); hide(); }
    });
    el.input.addEventListener('blur', () => setTimeout(hide, 120));
    // Intercept form submit for slash input (before app.js's onsubmit handler)
    el.form.addEventListener('submit', e => {
      const v = el.input.value.trim().toLowerCase();
      if (v.startsWith('/')) { e.preventDefault(); e.stopImmediatePropagation(); runCmd(v.split(/\s+/)[0]); }
    }, true);
  }

  function wireCopyButtons(el) {
    const add = m => {
      if (!m.classList || m.classList.contains('typing') || !m.classList.contains('bot')) return;
      const content = m.querySelector('.ai-msg-content');
      if (!content || content.querySelector('.ai-msg-copy')) return;
      const span = content.querySelector('span');
      if (!span || !span.textContent.trim()) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ai-msg-copy';
      btn.textContent = 'Copy';
      btn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(span.textContent);
          btn.textContent = 'Copied';
          btn.classList.add('is-done');
          call('showToast', 'Copied to clipboard', 'success');
          setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('is-done'); }, 1600);
        } catch { call('showToast', span.textContent, 'info'); }
      });
      content.appendChild(btn);
    };
    $$('.ai-message', el.msgs).forEach(add);
    new MutationObserver(muts => {
      muts.forEach(mu => mu.addedNodes.forEach(node => {
        if (node.nodeType === 1 && node.classList.contains('ai-message')) setTimeout(() => add(node), 0);
      }));
    }).observe(el.msgs, { childList: true });
  }

  function wireScrollLatest(el) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ai-scroll-latest hidden';
    btn.textContent = '↓ Latest';
    btn.addEventListener('click', () => el.msgs.scrollTo({ top: el.msgs.scrollHeight, behavior: 'smooth' }));
    el.form.appendChild(btn);
    const check = () => {
      const gap = el.msgs.scrollHeight - el.msgs.scrollTop - el.msgs.clientHeight;
      btn.classList.toggle('hidden', gap < 64);
    };
    el.msgs.addEventListener('scroll', check, { passive: true });
    new MutationObserver(check).observe(el.msgs, { childList: true, subtree: true });
  }

  function wireInputRecall(el) {
    el.input.addEventListener('keydown', e => {
      if (e.key === 'ArrowUp' && !el.input.value) {
        const last = $$('.ai-message.user .ai-msg-content > span', el.msgs).pop();
        if (last) { e.preventDefault(); el.input.value = last.textContent; }
      }
    });
  }

  function enhanceContracta() {
    const el = chatEls();
    if (contractaWired || !el.panel || !el.msgs || !el.form) return;
    contractaWired = true;

    restoreChatState(el);
    injectExpandButton(el);
    injectQuickbar(el);
    injectSlashMenu(el);
    wireTranscriptPersistence(el);
    wireCopyButtons(el);
    wireScrollLatest(el);
    wireInputRecall(el);

    document.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        call('toggleFaqChat');
      }
    }, true);

    el.headerActions?.lastElementChild?.addEventListener('click', () => setTimeout(() => el.fab?.focus(), 60));
  }

  /* ─────────────────────────────────────────────
     ROUTE VIEW HOOK — focus h1 + run enhancers
  ───────────────────────────────────────────── */

  /* ─────────────────────────────────────────────
     SIDEBAR — turn the collapse into a real drawer:
     a fixed-width inner panel, clipped by an animating rail.
     Zero text reflow → the motion is smooth and watchable.
  ───────────────────────────────────────────── */

  function enhanceSidebar() {
    const sb = $('#sidebar');
    if (!sb || sb.dataset.premiumDrawer === '1') return;
    const toggle = $('.sidebar-toggle', sb);
    const kids = Array.from(sb.children).filter(c => c !== toggle);
    if (!kids.length) return;
    sb.dataset.premiumDrawer = '1';

    const inner = document.createElement('div');
    inner.className = 'sidebar-inner';
    sb.insertBefore(inner, sb.firstChild);
    kids.forEach(k => inner.appendChild(k));
    if (toggle) sb.appendChild(toggle);   // hoist the toggle out of the clipped area
  }

  /* ─────────────────────────────────────────────
     TOP NAV — wrap the action buttons into a group
  ───────────────────────────────────────────── */

  function enhanceTopbar() {
    const topbar = $('#topbar');
    if (!topbar || topbar.dataset.premiumNav === '1') return;
    const notif = $('#notificationButton', topbar);
    const contracta = $('.ai-chat-topbar-btn', topbar);
    const profile = $('#profileMenuButton', topbar);
    if (!notif || !profile) return;
    topbar.dataset.premiumNav = '1';

    const cluster = document.createElement('div');
    cluster.className = 'topbar-cluster';
    notif.parentNode.insertBefore(cluster, notif);
    [notif, contracta, profile].filter(Boolean).forEach(b => cluster.appendChild(b));
  }

  function onRouteView() {
    const active = $('.page.active');
    if (!active) return;
    enhanceSidebar();
    enhanceTopbar();
    enhanceContracta();
    enhanceWizard();
    enhanceDashboard();
    // a11y: move focus to the page heading (skip if a field is focused)
    const h1 = $('.page-title', active);
    if (h1 && !/^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement?.tagName || '')) {
      h1.setAttribute('tabindex', '-1');
      h1.focus({ preventScroll: true });
    }
  }

  window.addEventListener('hashchange', () => setTimeout(onRouteView, 80));

  /* Topbar gains a shadow once the page content scrolls under it */
  document.addEventListener('scroll', e => {
    const t = e.target;
    if (t && t.classList && t.classList.contains('page')) {
      $('.topbar')?.classList.toggle('is-scrolled', t.scrollTop > 4);
    }
  }, true);

  /* ─────────────────────────────────────────────
     BOOT — wait for the shell, then wire everything
  ───────────────────────────────────────────── */

  function whenReady(attempt = 0) {
    const shell = document.getElementById('appShell');
    const hasPage = document.querySelector('.page');
    if (shell && hasPage) {
      enhanceSidebar();
      enhanceTopbar();
      enhanceContracta();
      onRouteView();
      // re-run enhancers once dashboard data has hydrated
      setTimeout(onRouteView, 600);
      setTimeout(onRouteView, 1600);
      return;
    }
    if (attempt < 100) setTimeout(() => whenReady(attempt + 1), 100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => whenReady());
  } else {
    whenReady();
  }
})();
