const APP_ROUTES = {
  login: { title: 'Sign In', public: true },
  'reset-password': { title: 'Reset Password', public: true },
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

  if (routeName === 'reset-password') {
    showResetPassword?.();
    return;
  }

  if (routeName === 'preview' && typeof canAccessPreview === 'function' && !canAccessPreview()) {
    showAuthenticatedApp?.();
    showToast?.('Complete and validate the contract before opening Preview & Sign.', 'warning');
    navigateTo('wizard', { replace: true });
    return;
  }

  showAuthenticatedApp?.();
  closeProfileMenu?.();
  document.body.dataset.route = routeName;
  document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
    item.removeAttribute('aria-current');
  });

  const page = document.getElementById('page-' + route.page);
  if (page) {
    page.classList.add('active');
    page.scrollTop = 0;
  }

  const nav = document.getElementById('nav-' + routeName);
  if (nav) {
    nav.classList.add('active');
    nav.setAttribute('aria-current', 'page');
  }

  const title = document.getElementById('topbar-title');
  if (title) title.textContent = route.title;
  document.title = `${route.title} - RedMPS ContractIQ`;

  const breadcrumb = document.getElementById('topbar-breadcrumb');
  if (breadcrumb) breadcrumb.textContent = routeName === DEFAULT_AUTH_ROUTE ? '' : '/ ' + route.title;

  if (route.page === 'wizard'       && typeof bindContractForm === 'function') bindContractForm();
  if (route.page === 'wizard'       && typeof applyWizardPrefillIfPresent === 'function') setTimeout(applyWizardPrefillIfPresent, 100);
  if (typeof renderContractaSuggestions === 'function') renderContractaSuggestions();
  if (route.page === 'create-user'  && typeof initCreateUser   === 'function') initCreateUser();
  if (route.page === 'approvals'    && typeof initApprovals    === 'function') initApprovals();

  // Live API page inits
  if (route.page === 'dashboard'  && typeof initDashboard  === 'function') initDashboard();
  if (route.page === 'employees'  && typeof initEmployees  === 'function') initEmployees();
  if (route.page === 'contracts'  && typeof initContracts  === 'function') initContracts();
  if (route.page === 'approvals'  && typeof initApprovalsFromApi === 'function') initApprovalsFromApi();
  if (route.page === 'analytics'  && typeof initAnalytics  === 'function') initAnalytics();
  if (route.page === 'audit'      && typeof initAuditLog   === 'function') initAuditLog();
  if (route.page === 'templates'  && typeof initTemplates  === 'function') initTemplates();

  // Start/stop live polling for the page we just entered.
  if (typeof startLivePolling === 'function') startLivePolling();
}

function initRouter() {
  window.addEventListener('hashchange', () => renderRoute());

  if (!window.location.hash) {
    navigateTo(typeof getSession === 'function' && getSession() ? DEFAULT_AUTH_ROUTE : LOGIN_ROUTE, { replace: true });
    return;
  }

  renderRoute();
}
