const PAGE_TITLES = {
  dashboard: 'Dashboard',
  wizard: 'New Contract',
  preview: 'Contract Preview',
  contracts: 'Contracts',
  analytics: 'Analytics',
  employees: 'Employees'
};

function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const page = document.getElementById('page-' + name);
  if (page) page.classList.add('active');

  const nav = document.getElementById('nav-' + name);
  if (nav) nav.classList.add('active');

  const title = document.getElementById('topbar-title');
  if (title) title.textContent = PAGE_TITLES[name] || name;

  window.scrollTo(0, 0);
}
