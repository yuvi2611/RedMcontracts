const AUTH_STORAGE_KEY = 'contractiq.session';
const AUTH_API_BASE = window.CONTRACTIQ_API_BASE || 'http://localhost:5000';

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
    id: user.id || null,
    email: user.email,
    name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
    initials: user.initials || `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase(),
    role: user.role,
    isSuperuser: user.isSuperuser,
    forcePasswordChange: user.forcePasswordChange,
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
  if (typeof syncProfileMenu === 'function') syncProfileMenu();
}

function showAuthenticatedApp() {
  document.getElementById('loginScreen')?.classList.add('hidden');
  document.getElementById('resetPasswordScreen')?.classList.add('hidden');
  document.getElementById('appShell')?.classList.remove('hidden');
  syncUserChrome();
}

function showLogin() {
  document.getElementById('appShell')?.classList.add('hidden');
  document.getElementById('welcomeModal')?.classList.add('hidden');
  document.getElementById('resetPasswordScreen')?.classList.add('hidden');
  document.getElementById('loginScreen')?.classList.remove('hidden');
  document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
}

function showResetPassword() {
  document.getElementById('appShell')?.classList.add('hidden');
  document.getElementById('welcomeModal')?.classList.add('hidden');
  document.getElementById('loginScreen')?.classList.add('hidden');
  document.getElementById('resetPasswordScreen')?.classList.remove('hidden');
  document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  showResetRequest();

  const loginEmail = document.getElementById('loginEmail')?.value.trim();
  const resetEmail = document.getElementById('resetEmail');
  if (resetEmail && loginEmail && !resetEmail.value) resetEmail.value = loginEmail;
}

function signOut() {
  window.__pendingRoute = null;
  try {
    sessionStorage.removeItem('contractiq.pendingRoute');
  } catch {
    // Ignore storage failures in restricted browser modes.
  }
  clearSession();
  setPreviewAccess?.(false);
  closeProfileMenu?.();
  navigateTo?.('login', { replace: true });
}

function bindLogin() {
  const form = document.getElementById('loginForm');
  if (!form) return;
  bindPasswordToggle();

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const email = document.getElementById('loginEmail')?.value.trim().toLowerCase();
    const password = document.getElementById('loginPassword')?.value || '';
    const error = document.getElementById('loginError');
    const errorText = document.getElementById('loginErrorText');
    const submit = form.querySelector('.login-submit');
    let user = null;
    let apiReachable = true;

    submit?.classList.add('is-loading');

    try {
      const res = await fetch(`${AUTH_API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        signal: AbortSignal.timeout(5000)
      });

      if (res.ok) {
        const auth = await res.json();
        user = auth.user;
        try {
          sessionStorage.setItem('contractiq.accessToken', auth.accessToken || '');
          sessionStorage.setItem('contractiq.refreshToken', auth.refreshToken || '');
        } catch {
          // Ignore storage failures in restricted browser modes.
        }
      } else if (res.status === 401) {
        apiReachable = true;
      } else {
        const details = await res.json().catch(() => ({}));
        if (errorText) errorText.textContent = details.message || 'Sign in failed. Please try again.';
        if (error) error.style.display = 'flex';
        submit?.classList.remove('is-loading');
        return;
      }
    } catch {
      apiReachable = false;
    }

    if (!user && !apiReachable) {
      user = DEMO_USERS.find(candidate => candidate.email === email && candidate.password === password);
    }

    submit?.classList.remove('is-loading');

    if (!user) {
      if (error) error.style.display = 'flex';
      if (errorText) {
        errorText.textContent = apiReachable
          ? 'Invalid credentials. Check the PostgreSQL users table or ask a superuser to create an account.'
          : 'API offline. Demo fallback only accepts the seeded superuser or accounts created in this session.';
      }
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

function bindPasswordReset() {
  const requestForm = document.getElementById('resetRequestForm');
  const confirmForm = document.getElementById('resetConfirmForm');
  if (!requestForm || !confirmForm || requestForm.dataset.bound === 'true') return;
  requestForm.dataset.bound = 'true';
  bindResetPasswordToggle();

  requestForm.addEventListener('submit', async event => {
    event.preventDefault();
    const email = document.getElementById('resetEmail')?.value.trim().toLowerCase();
    const error = document.getElementById('resetRequestError');
    const errorText = document.getElementById('resetRequestErrorText');
    const submit = document.getElementById('resetRequestSubmit');

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      if (errorText) errorText.textContent = 'Enter a valid account email.';
      if (error) error.style.display = 'flex';
      return;
    }

    submit?.classList.add('is-loading');
    try {
      const res = await fetch(`${AUTH_API_BASE}/api/auth/password-reset/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
        signal: AbortSignal.timeout(5000)
      });

      if (!res.ok) {
        const details = await res.json().catch(() => ({}));
        throw new Error(details.message || 'Reset request failed.');
      }
    } catch {
      const demoUser = DEMO_USERS.find(user => user.email === email);
      if (!demoUser) {
        if (errorText) errorText.textContent = 'No demo account found for that email.';
        if (error) error.style.display = 'flex';
        submit?.classList.remove('is-loading');
        return;
      }
    }

    submit?.classList.remove('is-loading');
    if (error) error.style.display = 'none';
    sessionStorage.setItem('contractiq.resetEmail', email);
    document.getElementById('resetCodeNote').textContent = `Reset code prepared for ${email}. Demo code: RESET-2026`;
    showResetConfirm();
  });

  confirmForm.addEventListener('submit', async event => {
    event.preventDefault();
    const email = sessionStorage.getItem('contractiq.resetEmail') || document.getElementById('resetEmail')?.value.trim().toLowerCase();
    const code = document.getElementById('resetCode')?.value.trim();
    const password = document.getElementById('resetNewPassword')?.value || '';
    const confirm = document.getElementById('resetConfirmPassword')?.value || '';
    const error = document.getElementById('resetConfirmError');
    const errorText = document.getElementById('resetConfirmErrorText');
    const submit = document.getElementById('resetConfirmSubmit');

    const fail = message => {
      if (errorText) errorText.textContent = message;
      if (error) error.style.display = 'flex';
    };

    if (!code) return fail('Enter the reset code.');
    if (password.length < 12) return fail('New password must be at least 12 characters.');
    if (password !== confirm) return fail('Passwords do not match.');

    submit?.classList.add('is-loading');
    try {
      const res = await fetch(`${AUTH_API_BASE}/api/auth/password-reset/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, password }),
        signal: AbortSignal.timeout(5000)
      });

      if (!res.ok) {
        const details = await res.json().catch(() => ({}));
        throw new Error(details.message || 'Password reset failed.');
      }
    } catch (resetError) {
      const demoUser = DEMO_USERS.find(user => user.email === email);
      if (!demoUser || code !== 'RESET-2026') {
        fail(resetError.message || 'Invalid reset code or account email.');
        submit?.classList.remove('is-loading');
        return;
      }
      demoUser.password = password;
      demoUser.forcePasswordChange = false;
    }

    submit?.classList.remove('is-loading');
    if (error) error.style.display = 'none';
    showResetSuccess();
  });
}

function showResetRequest() {
  document.getElementById('resetRequestForm')?.classList.remove('hidden');
  document.getElementById('resetConfirmForm')?.classList.add('hidden');
  document.getElementById('resetSuccessPanel')?.classList.add('hidden');
}

function showResetConfirm() {
  document.getElementById('resetRequestForm')?.classList.add('hidden');
  document.getElementById('resetConfirmForm')?.classList.remove('hidden');
  document.getElementById('resetSuccessPanel')?.classList.add('hidden');
}

function showResetSuccess() {
  document.getElementById('resetRequestForm')?.classList.add('hidden');
  document.getElementById('resetConfirmForm')?.classList.add('hidden');
  document.getElementById('resetSuccessPanel')?.classList.remove('hidden');
}

function bindResetPasswordToggle() {
  const password = document.getElementById('resetNewPassword');
  const toggle = document.getElementById('resetPasswordToggle');
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
  bindPasswordReset();
  window.__pendingRoute = null;
  clearSession();
  setPreviewAccess?.(false);
  try {
    sessionStorage.removeItem('contractiq.pendingRoute');
  } catch {
    // Ignore storage failures in restricted browser modes.
  }
  showLogin();
}
