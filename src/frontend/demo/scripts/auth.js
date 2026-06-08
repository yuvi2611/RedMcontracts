const AUTH_STORAGE_KEY = 'contractiq.session';

const DEMO_USERS = [
  {
    email: 'admin@redmps.com',
    password: 'ChangeMe!2026',
    name: 'System Administrator',
    initials: 'SA',
    role: 'Administrator',
    isSuperuser: true,
    forcePasswordChange: true
  }
];

function getSession() {
  try {
    return JSON.parse(sessionStorage.getItem(AUTH_STORAGE_KEY) || 'null');
  } catch {
    return null;
  }
}

function setSession(user) {
  sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
    email: user.email,
    name: user.name,
    initials: user.initials,
    role: user.role,
    isSuperuser: user.isSuperuser,
    signedInAt: new Date().toISOString()
  }));
}

function clearSession() {
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
}

function syncUserChrome() {
  const session = getSession();
  if (!session) return;

  const name = document.getElementById('sidebarUserName');
  const role = document.getElementById('sidebarUserRole');
  const initials = document.getElementById('sidebarUserInitials');
  if (name) name.textContent = session.name;
  if (role) role.textContent = session.role;
  if (initials) initials.textContent = session.initials;
}

function showAuthenticatedApp() {
  document.getElementById('loginScreen')?.classList.add('hidden');
  document.getElementById('appShell')?.classList.remove('hidden');
  syncUserChrome();
}

function showLogin() {
  document.getElementById('appShell')?.classList.add('hidden');
  document.getElementById('welcomeModal')?.classList.add('hidden');
  document.getElementById('loginScreen')?.classList.remove('hidden');
  document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
}

function signOut() {
  window.__pendingRoute = null;
  try {
    sessionStorage.removeItem('contractiq.pendingRoute');
  } catch {
    // Ignore storage failures in restricted browser modes.
  }
  clearSession();
  navigateTo?.('login', { replace: true });
}

function bindLogin() {
  const form = document.getElementById('loginForm');
  if (!form) return;
  bindPasswordToggle();

  form.addEventListener('submit', event => {
    event.preventDefault();
    const email = document.getElementById('loginEmail')?.value.trim().toLowerCase();
    const password = document.getElementById('loginPassword')?.value || '';
    const user = DEMO_USERS.find(candidate => candidate.email === email && candidate.password === password);
    const error = document.getElementById('loginError');
    const errorText = document.getElementById('loginErrorText');

    if (!user) {
      if (error) error.style.display = 'flex';
      if (errorText) errorText.textContent = 'Invalid credentials. Accounts must be created by a superuser.';
      return;
    }

    if (error) error.style.display = 'none';
    setSession(user);
    showAuthenticatedApp();
    let storedDestination = null;
    try {
      storedDestination = sessionStorage.getItem('contractiq.pendingRoute');
      sessionStorage.removeItem('contractiq.pendingRoute');
    } catch {
      storedDestination = null;
    }
    const destination = window.__pendingRoute || storedDestination || 'dashboard';
    window.__pendingRoute = null;
    navigateTo?.(destination, { replace: true });
  });
}

function bindPasswordToggle() {
  const password = document.getElementById('loginPassword');
  const toggle = document.getElementById('passwordToggle');
  const wrapper = password?.closest('.password-field');
  if (!password || !toggle || !wrapper) return;

  toggle.addEventListener('click', () => {
    const visible = password.type === 'text';
    password.type = visible ? 'password' : 'text';
    wrapper.classList.toggle('is-visible', !visible);
    toggle.setAttribute('aria-pressed', String(!visible));
    toggle.setAttribute('aria-label', visible ? 'Show password' : 'Hide password');
  });
}

function initAuthShell() {
  bindLogin();
  window.__pendingRoute = null;
  clearSession();
  try {
    sessionStorage.removeItem('contractiq.pendingRoute');
  } catch {
    // Ignore storage failures in restricted browser modes.
  }
  showLogin();
}
