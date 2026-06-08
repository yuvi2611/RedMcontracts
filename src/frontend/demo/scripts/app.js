const PAGE_FILES = {
  dashboard: 'demo/components/pages/dashboard.html',
  wizard: 'demo/components/pages/wizard.html',
  preview: 'demo/components/pages/preview.html',
  contracts: 'demo/components/pages/contracts.html',
  analytics: 'demo/components/pages/analytics.html',
  employees: 'demo/components/pages/employees.html'
};

async function loadComponent(targetId, url) {
  const el = document.getElementById(targetId);
  if (!el) return;
  const res = await fetch(url);
  el.innerHTML = await res.text();
}

async function loadPages() {
  const container = document.getElementById('pages-container');
  if (!container) return;

  for (const [name, url] of Object.entries(PAGE_FILES)) {
    const res = await fetch(url);
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
  await loadComponent('sidebar', 'demo/components/sidebar.html');
  await loadComponent('topbar', 'demo/components/topbar.html');
  showPage('dashboard');
  bindContractForm();
}

document.addEventListener('DOMContentLoaded', initApp);

function closeModal() {
  document.getElementById('welcomeModal')?.classList.add('hidden');
}
