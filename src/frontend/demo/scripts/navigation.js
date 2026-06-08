const APP_ROUTES = {
  login: { title: 'Sign In', public: true },
  dashboard: { title: 'Dashboard', page: 'dashboard' },
  contracts: { title: 'Contracts', page: 'contracts' },
  wizard: { title: 'Guided Contract Studio', page: 'wizard' },
  preview: { title: 'Review and Export', page: 'preview' },
  employees: { title: 'Employees', page: 'employees' },
  templates: { title: 'Templates', page: 'templates' },
  approvals: { title: 'Approvals', page: 'approvals' },
  analytics: { title: 'Analytics', page: 'analytics' },
  audit: { title: 'Audit Log', page: 'audit' },
  settings: { title: 'Settings', page: 'settings' },
  'create-user': { title: 'Create User', page: 'create-user' }
};

const DEFAULT_AUTH_ROUTE = 'dashboard';
const LOGIN_ROUTE = 'login';

function getRouteFromHash() {
  const raw = window.location.hash.replace(/^#\/?/, '').trim();
  const route = raw.split('?')[0] || DEFAULT_AUTH_ROUTE;
  return APP_ROUTES[route] ? route : DEFAULT_AUTH_ROUTE;
}

function setRouteHash(routeName, replace = false) {
  const nextHash = '#/' + routeName;
  if (window.location.hash === nextHash) {
    renderRoute(routeName);
    return;
  }

  if (replace) {
    window.location.replace(nextHash);
  } else {
    window.location.hash = nextHash;
  }
}

function navigateTo(routeName, options = {}) {
  const route = APP_ROUTES[routeName] ? routeName : DEFAULT_AUTH_ROUTE;
  setRouteHash(route, options.replace === true);
}

function routeTo(routeName) {
  navigateTo(routeName);
}

function showPage(name) {
  navigateTo(name);
}

function renderRoute(routeName = getRouteFromHash()) {
  const route = APP_ROUTES[routeName] || APP_ROUTES[DEFAULT_AUTH_ROUTE];
  const isAuthenticated = typeof getSession === 'function' && !!getSession();

  if (!route.public && !isAuthenticated) {
    window.__pendingRoute = routeName;
    try {
      sessionStorage.setItem('contractiq.pendingRoute', routeName);
    } catch {
      // Session storage can be unavailable in hardened browser modes.
    }
    showLogin?.();
    if (routeName !== LOGIN_ROUTE) navigateTo(LOGIN_ROUTE, { replace: true });
    return;
  }

  if (routeName === LOGIN_ROUTE) {
    if (isAuthenticated) {
      navigateTo(DEFAULT_AUTH_ROUTE, { replace: true });
    } else {
      showLogin?.();
    }
    return;
  }

  showAuthenticatedApp?.();
  document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));

  const page = document.getElementById('page-' + route.page);
  if (page) page.classList.add('active');

  const nav = document.getElementById('nav-' + routeName);
  if (nav) nav.classList.add('active');

  const title = document.getElementById('topbar-title');
  if (title) title.textContent = route.title;

  const breadcrumb = document.getElementById('topbar-breadcrumb');
  if (breadcrumb) breadcrumb.textContent = routeName === DEFAULT_AUTH_ROUTE ? '' : '/ ' + route.title;

  window.scrollTo(0, 0);

  if (route.page === 'wizard' && typeof bindContractForm === 'function') {
    bindContractForm();
  }

  if (route.page === 'create-user' && typeof initCreateUser === 'function') {
    initCreateUser();
  }
}

function initRouter() {
  window.addEventListener('hashchange', () => renderRoute());

  if (!window.location.hash) {
    navigateTo(typeof getSession === 'function' && getSession() ? DEFAULT_AUTH_ROUTE : LOGIN_ROUTE, { replace: true });
    return;
  }

  renderRoute();
}
