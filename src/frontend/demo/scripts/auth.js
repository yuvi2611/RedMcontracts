const AUTH_STORAGE_KEY = 'contractiq.session';
const AUTH_API_BASE = window.CONTRACTIQ_API_BASE || 'http://localhost:5000';

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
  const card = document.querySelector('.sidebar .user-card');
  if (name) name.textContent = session.name;
  if (role) role.textContent = session.role;
  if (initials) initials.textContent = session.initials;
  if (card) card.setAttribute('data-tooltip', session.name || 'Account');
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
  resetLoginForm();
  syncLoginNotice();
}

// Return the login form to a pristine state whenever the screen is shown
// (fresh visit, sign-out, session end). Errors during a live attempt are not
// affected because showLogin() does not run while the screen stays visible.
function resetLoginForm() {
  const form = document.getElementById('loginForm');
  if (!form) return;
  form.dataset.submitting = 'false';
  setLoginBusy(form, false);
  clearLoginError();
  setLoginFlowStage(null);
  const email = document.getElementById('loginEmail');
  const password = document.getElementById('loginPassword');
  if (email) email.value = '';
  if (password) password.value = '';
}

function showResetPassword() {
  document.getElementById('appShell')?.classList.add('hidden');
  document.getElementById('welcomeModal')?.classList.add('hidden');
  document.getElementById('loginScreen')?.classList.add('hidden');
  document.getElementById('resetPasswordScreen')?.classList.remove('hidden');
  document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));

  // Start every recovery attempt from a clean step 1 — no stale code or password.
  ['resetCode', 'resetNewPassword', 'resetConfirmPassword'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  document.querySelectorAll('#resetPasswordScreen .field-error').forEach(s => { s.hidden = true; s.textContent = ''; });
  document.querySelectorAll('#resetPasswordScreen [aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
  document.querySelectorAll('#resetPwReqs .auth-req').forEach(li => li.classList.remove('is-valid', 'is-invalid'));
  clearTimeout(_resendTimer);
  const resend = document.getElementById('resetResendBtn');
  if (resend) { resend.disabled = false; resend.textContent = 'Resend code'; }
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

function fillDemoLogin() {
  const email = document.getElementById('loginEmail');
  const password = document.getElementById('loginPassword');
  if (email) email.value = '';
  if (password) password.value = '';
  showToast?.('Demo credentials are disabled. Sign in with a database account.', 'info');
}

/* A UI-safe error: message is already user-appropriate, `field` marks the
   control(s) to flag. Never carries backend/internal detail. */
class AuthUiError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'AuthUiError';
    this.field = field || null;
  }
}

function isValidEmailShape(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

// The login-screen workflow strip and its vector are purely decorative — they
// illustrate the four stages and never react to input. Kept as a no-op so the
// existing callers (setLoginBusy, the success path) don't need to change.
function setLoginFlowStage() {}

function setLoginBusy(form, busy) {
  const submit = form.querySelector('.login-submit');
  if (!submit) return;
  const label = submit.querySelector('.login-submit-label');
  submit.classList.toggle('is-loading', busy);
  submit.disabled = busy;
  submit.setAttribute('aria-busy', String(busy));
  if (label) label.textContent = busy ? 'Signing in…' : 'Sign in';
  setLoginFlowStage(busy ? 'validating' : null);
}

// Compact, inline error under a single field — used for client-side format /
// completeness checks (email shape, empty fields).
function showFieldError(field, message) {
  const input = document.getElementById(field === 'email' ? 'loginEmail' : 'loginPassword');
  const slot = document.getElementById(field === 'email' ? 'emailError' : 'passwordError');
  if (slot) { slot.textContent = message; slot.hidden = false; }
  input?.setAttribute('aria-invalid', 'true');
  requestAnimationFrame(() => input?.focus());
}

function clearFieldErrors() {
  ['emailError', 'passwordError'].forEach(id => {
    const slot = document.getElementById(id);
    if (slot) { slot.hidden = true; slot.textContent = ''; }
  });
  document.getElementById('loginEmail')?.removeAttribute('aria-invalid');
  document.getElementById('loginPassword')?.removeAttribute('aria-invalid');
}

// Form-level alert — reserved for authentication failures and service errors.
function showLoginError(message, field) {
  clearFieldErrors();
  const box = document.getElementById('loginError');
  const text = document.getElementById('loginErrorText');
  const emailEl = document.getElementById('loginEmail');
  const passwordEl = document.getElementById('loginPassword');
  if (text) text.textContent = message;
  if (box) box.style.display = 'flex';
  emailEl?.setAttribute('aria-invalid', field === 'email' || field === 'both' ? 'true' : 'false');
  passwordEl?.setAttribute('aria-invalid', field === 'password' || field === 'both' ? 'true' : 'false');
  const target = field === 'email' ? emailEl : field === 'password' ? passwordEl : box;
  requestAnimationFrame(() => target?.focus());
}

function clearLoginError() {
  const box = document.getElementById('loginError');
  if (box) box.style.display = 'none';
  clearFieldErrors();
}

// A protected route was requested while signed out — invite sign-in without alarming.
function syncLoginNotice() {
  const notice = document.getElementById('loginNotice');
  const text = document.getElementById('loginNoticeText');
  if (!notice || !text) return;
  let pending = null;
  try { pending = sessionStorage.getItem('contractiq.pendingRoute'); } catch { pending = null; }
  if (pending && pending !== 'login') {
    text.textContent = 'Please sign in to continue.';
    notice.hidden = false;
  } else {
    notice.hidden = true;
  }
}

function bindLogin() {
  const form = document.getElementById('loginForm');
  if (!form) return;
  bindPasswordToggle();
  syncLoginNotice();

  const emailEl = document.getElementById('loginEmail');
  const passwordEl = document.getElementById('loginPassword');
  [[emailEl, 'emailError'], [passwordEl, 'passwordError']].forEach(([el, slotId]) => {
    if (!el) return;
    el.addEventListener('input', () => {
      el.removeAttribute('aria-invalid');
      const slot = document.getElementById(slotId);
      if (slot && !slot.hidden) { slot.hidden = true; slot.textContent = ''; }
    });
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (form.dataset.submitting === 'true') return;   // block repeat submissions

    const email = (emailEl?.value || '').trim().toLowerCase();
    const password = passwordEl?.value || '';

    // Client-side gate — compact inline errors, no spinner for incomplete input.
    if (!email) return showFieldError('email', 'Enter your work email.');
    if (!isValidEmailShape(email)) return showFieldError('email', 'Enter a valid work email, such as name@company.com.');
    if (!password) return showFieldError('password', 'Enter your password.');

    clearLoginError();
    form.dataset.submitting = 'true';
    setLoginBusy(form, true);

    let user = null;
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
      } else if (res.status === 400) {
        throw new AuthUiError('Enter your work email and password.', 'both');
      } else if (res.status === 401 || res.status === 403) {
        throw new AuthUiError('That email and password don’t match an active account.', 'both');
      } else if (res.status === 429) {
        throw new AuthUiError('Too many sign-in attempts. Wait a moment and try again.', 'both');
      } else {
        throw new AuthUiError('Something went wrong signing in. Please try again.', null);
      }
    } catch (err) {
      form.dataset.submitting = 'false';
      setLoginBusy(form, false);
      if (err instanceof AuthUiError) {
        showLoginError(err.message, err.field);
      } else if (err.name === 'TimeoutError' || err.name === 'AbortError') {
        showLoginError('The sign-in service is taking too long to respond. Please try again.', null);
      } else {
        showLoginError('We can’t reach the sign-in service right now. Please try again shortly.', null);
      }
      return;
    }

    if (!user) {
      form.dataset.submitting = 'false';
      setLoginBusy(form, false);
      showLoginError('That email and password don’t match an active account.', 'both');
      return;
    }

    // Success — clear errors and persist the session. enterAppAfterLogin()
    // consumes contractiq.pendingRoute to route to the intended destination.
    clearLoginError();
    setSession(user);

    if (user.forcePasswordChange) {
      window.__flEmail = email;
      window.__flCurrentPassword = password;
      form.dataset.submitting = 'false';
      setLoginBusy(form, false);
      showFirstLoginModal();
      return;
    }

    // Let the approval pulse complete toward the card, but never hold up navigation.
    setLoginFlowStage('approved');
    form.dataset.submitting = 'false';
    enterAppAfterLogin();
  });
}

// Reveal the app and route to the intended destination after a clean login.
function enterAppAfterLogin() {
  showAuthenticatedApp();
  if (typeof refreshNotifBadge === 'function') refreshNotifBadge();
  if (typeof updateLiveBadges === 'function') updateLiveBadges();
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
}

function showFirstLoginModal() {
  document.getElementById('loginScreen')?.classList.add('hidden');
  document.getElementById('appShell')?.classList.add('hidden');
  const modal = document.getElementById('firstLoginModal');
  modal?.classList.remove('hidden');
  document.getElementById('flNewPassword')?.focus();
}

function hideFirstLoginModal() {
  document.getElementById('firstLoginModal')?.classList.add('hidden');
}

function bindFirstLogin() {
  const form = document.getElementById('firstLoginForm');
  if (!form || form.dataset.bound === 'true') return;
  form.dataset.bound = 'true';

  // Password visibility toggle for the new-password field.
  const pwd = document.getElementById('flNewPassword');
  const toggle = document.getElementById('flPasswordToggle');
  const wrapper = pwd?.closest('.password-field');
  if (pwd && toggle && wrapper) {
    toggle.addEventListener('click', () => {
      const visible = pwd.type === 'text';
      pwd.type = visible ? 'password' : 'text';
      wrapper.classList.toggle('is-visible', !visible);
      toggle.setAttribute('aria-pressed', String(!visible));
    });
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const email = window.__flEmail;
    const current = window.__flCurrentPassword || '';
    const next = document.getElementById('flNewPassword')?.value || '';
    const confirm = document.getElementById('flConfirmPassword')?.value || '';
    const error = document.getElementById('flError');
    const errorText = document.getElementById('flErrorText');
    const submit = document.getElementById('flSubmit');

    const fail = message => {
      if (errorText) errorText.textContent = message;
      if (error) error.style.display = 'flex';
    };

    if (next.length < 12) return fail('New password must be at least 12 characters.');
    if (next !== confirm) return fail('Passwords do not match.');
    if (next === current) return fail('New password must be different from the temporary one.');

    submit?.classList.add('is-loading');
    let changed = false;
    try {
      const res = await fetch(`${AUTH_API_BASE}/api/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, current_password: current, new_password: next }),
        signal: AbortSignal.timeout(5000)
      });
      if (res.ok) {
        changed = true;
      } else {
        const details = await res.json().catch(() => ({}));
        throw new Error(details.message || 'Password change failed.');
      }
    } catch (changeError) {
      if (!changed) {
        fail(changeError.message || 'Password change failed. Please try again.');
        submit?.classList.remove('is-loading');
        return;
      }
    }

    submit?.classList.remove('is-loading');
    if (!changed) return;

    // Update the stored session so the flag is cleared and clean up.
    const session = getSession();
    if (session) { session.forcePasswordChange = false; setSession(session); }
    window.__flCurrentPassword = null;
    document.getElementById('flNewPassword').value = '';
    document.getElementById('flConfirmPassword').value = '';
    if (error) error.style.display = 'none';

    hideFirstLoginModal();
    showToast?.('Password updated. Welcome to ContractIQ.', 'success');
    enterAppAfterLogin();
  });
}

/* ══════════════════════════════════════════════════════════════════
   PASSWORD RECOVERY — 3 steps (email → verify → reset) + success.
   Backend contract is unchanged: /password-reset/request {email} and
   /password-reset/confirm {email, code, password}. The code is only
   verified by the backend at the final /confirm call. Nothing here
   discloses whether an account exists, and no code/token/password is
   stored in web storage or logged.
══════════════════════════════════════════════════════════════════ */

let _recoveryEmail = '';
let _resendTimer = null;

const AUTH_MIN_PASSWORD = 12;   // matches the backend policy (length only)

function authShowFieldError(inputId, slotId, message, alsoFocus = false) {
  const input = document.getElementById(inputId);
  const slot = document.getElementById(slotId);
  if (slot) { slot.textContent = message; slot.hidden = false; }
  input?.setAttribute('aria-invalid', 'true');
  if (alsoFocus) requestAnimationFrame(() => input?.focus());
}
function authClearFieldError(inputId, slotId) {
  const slot = document.getElementById(slotId);
  if (slot) { slot.hidden = true; slot.textContent = ''; }
  document.getElementById(inputId)?.removeAttribute('aria-invalid');
}
function authShowAlert(boxId, textId, message) {
  const box = document.getElementById(boxId);
  const text = document.getElementById(textId);
  if (text) text.textContent = message;
  if (box) { box.style.display = 'flex'; requestAnimationFrame(() => box.focus()); }
}
function authHideAlert(boxId) {
  const box = document.getElementById(boxId);
  if (box) box.style.display = 'none';
}
function authSetBusy(form, busy, busyLabel) {
  const submit = form?.querySelector('.login-submit');
  if (!submit) return;
  const label = submit.querySelector('.login-submit-label');
  submit.classList.toggle('is-loading', busy);
  submit.disabled = busy;
  submit.setAttribute('aria-busy', String(busy));
  if (label && submit.dataset.idleLabel === undefined) submit.dataset.idleLabel = label.textContent;
  if (label) label.textContent = busy ? busyLabel : (submit.dataset.idleLabel || label.textContent);
}

// Mask an email for display: keep the first character + domain only.
function maskEmail(email) {
  const at = String(email || '').indexOf('@');
  if (at < 1) return 'your inbox';
  return email[0] + '•••••' + email.slice(at);
}

function bindPasswordReset() {
  const requestForm = document.getElementById('resetRequestForm');
  const confirmForm = document.getElementById('resetConfirmForm');
  const newPassForm = document.getElementById('resetNewPassForm');
  if (!requestForm || requestForm.dataset.bound === 'true') return;
  requestForm.dataset.bound = 'true';

  bindResetPasswordToggle('resetNewPassword', 'resetPasswordToggle');
  bindResetPasswordToggle('resetConfirmPassword', 'resetConfirmToggle');

  const emailEl = document.getElementById('resetEmail');
  emailEl?.addEventListener('input', () => authClearFieldError('resetEmail', 'resetEmailError'));
  const codeEl = document.getElementById('resetCode');
  codeEl?.addEventListener('input', () => {
    codeEl.value = codeEl.value.replace(/\D/g, '').slice(0, 6);
    authClearFieldError('resetCode', 'resetCodeError');
  });

  // Live password-requirement feedback (length only — the backend policy).
  const newPw = document.getElementById('resetNewPassword');
  const reqLen = document.querySelector('#resetPwReqs [data-req="len"]');
  newPw?.addEventListener('input', () => {
    authClearFieldError('resetNewPassword', 'resetNewPassError');
    if (!reqLen) return;
    const ok = newPw.value.length >= AUTH_MIN_PASSWORD;
    reqLen.classList.toggle('is-valid', ok && newPw.value.length > 0);
    reqLen.classList.toggle('is-invalid', !ok && newPw.value.length > 0);
  });
  document.getElementById('resetConfirmPassword')?.addEventListener('input',
    () => authClearFieldError('resetConfirmPassword', 'resetConfirmPassError'));

  /* ── Step 1 · request a verification code ── */
  requestForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (requestForm.dataset.submitting === 'true') return;

    const raw = document.getElementById('resetEmail')?.value || '';
    const email = raw.trim().toLowerCase();
    authHideAlert('resetRequestError');

    if (!email) return authShowFieldError('resetEmail', 'resetEmailError', 'Enter your work email.', true);
    if (email.length > 254 || !isValidEmailShape(email)) {
      return authShowFieldError('resetEmail', 'resetEmailError', 'Enter a valid work email, such as name@company.com.', true);
    }
    authClearFieldError('resetEmail', 'resetEmailError');

    requestForm.dataset.submitting = 'true';
    authSetBusy(requestForm, true, 'Sending code…');

    let status = 0;
    try {
      const res = await fetch(`${AUTH_API_BASE}/api/auth/password-reset/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
        signal: AbortSignal.timeout(5000),
      });
      status = res.status;
    } catch (err) {
      requestForm.dataset.submitting = 'false';
      authSetBusy(requestForm, false);
      authShowAlert('resetRequestError', 'resetRequestErrorText',
        err.name === 'TimeoutError' || err.name === 'AbortError'
          ? 'The recovery service is taking too long to respond. Please try again.'
          : 'We can’t reach the recovery service right now. Please try again shortly.');
      return;
    }

    requestForm.dataset.submitting = 'false';
    authSetBusy(requestForm, false);

    if (status === 429) {
      authShowAlert('resetRequestError', 'resetRequestErrorText',
        'Too many attempts. Wait a moment before requesting another code.');
      return;
    }
    if (status >= 500) {
      authShowAlert('resetRequestError', 'resetRequestErrorText',
        'The recovery service is having trouble. Please try again shortly.');
      return;
    }

    // 200 or 404 — respond identically so account existence is never disclosed.
    _recoveryEmail = email;
    const note = document.getElementById('resetCodeNote');
    if (note) note.textContent = maskEmail(email);
    const notice = document.getElementById('resetRequestNotice');
    if (notice) {
      notice.textContent = 'If an active ContractIQ account exists for that email, a verification code has been sent.';
      notice.hidden = false;
    }
    showResetConfirm();
  });

  /* ── Step 2 · enter the verification code (verified server-side at step 3) ── */
  confirmForm?.addEventListener('submit', event => {
    event.preventDefault();
    const code = (document.getElementById('resetCode')?.value || '').trim();
    authHideAlert('resetConfirmError');
    if (!code) return authShowFieldError('resetCode', 'resetCodeError', 'Enter the 6-digit verification code.', true);
    if (!/^\d{6}$/.test(code)) {
      return authShowFieldError('resetCode', 'resetCodeError', 'The code is 6 digits. Check your email and re-enter it.', true);
    }
    authClearFieldError('resetCode', 'resetCodeError');
    showResetNewPass();
  });

  /* ── Step 3 · set the new password (this is where the code is checked) ── */
  newPassForm?.addEventListener('submit', async event => {
    event.preventDefault();
    if (newPassForm.dataset.submitting === 'true') return;

    const email = _recoveryEmail;
    const code = (document.getElementById('resetCode')?.value || '').trim();
    const pw = document.getElementById('resetNewPassword')?.value || '';
    const confirm = document.getElementById('resetConfirmPassword')?.value || '';
    authHideAlert('resetNewPassAlert');
    authClearFieldError('resetNewPassword', 'resetNewPassError');
    authClearFieldError('resetConfirmPassword', 'resetConfirmPassError');

    if (!pw) return authShowFieldError('resetNewPassword', 'resetNewPassError', 'Enter a new password.', true);
    if (pw.length < AUTH_MIN_PASSWORD) {
      return authShowFieldError('resetNewPassword', 'resetNewPassError', `Use at least ${AUTH_MIN_PASSWORD} characters.`, true);
    }
    if (confirm !== pw) {
      return authShowFieldError('resetConfirmPassword', 'resetConfirmPassError', 'Passwords do not match.', true);
    }

    newPassForm.dataset.submitting = 'true';
    authSetBusy(newPassForm, true, 'Updating password…');

    let ok = false, message = '';
    try {
      const res = await fetch(`${AUTH_API_BASE}/api/auth/password-reset/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, password: pw }),
        signal: AbortSignal.timeout(5000),
      });
      ok = res.ok;
      if (!ok) { const d = await res.json().catch(() => ({})); message = String(d.message || ''); }
    } catch (err) {
      newPassForm.dataset.submitting = 'false';
      authSetBusy(newPassForm, false);
      authShowAlert('resetNewPassAlert', 'resetNewPassAlertText',
        err.name === 'TimeoutError' || err.name === 'AbortError'
          ? 'The recovery service is taking too long to respond. Please try again.'
          : 'We can’t reach the recovery service right now. Please try again shortly.');
      return;
    }

    newPassForm.dataset.submitting = 'false';
    authSetBusy(newPassForm, false);

    if (ok) {
      document.getElementById('resetNewPassword').value = '';
      document.getElementById('resetConfirmPassword').value = '';
      showResetSuccess();
      return;
    }

    // Map the backend message to a safe, user-facing one. The confirm endpoint
    // reports invalid and expired codes with a single combined message, so any
    // code-related failure sends the user back to the verification step where
    // they can re-enter the code or request a fresh one.
    if (/at least|character|password/i.test(message)) {
      authShowFieldError('resetNewPassword', 'resetNewPassError',
        `Use at least ${AUTH_MIN_PASSWORD} characters.`, true);
    } else if (/expire|invalid|code/i.test(message)) {
      showResetConfirm();
      authShowFieldError('resetCode', 'resetCodeError',
        'That code is incorrect or has expired. Enter it again, or request a new one.', true);
    } else {
      authShowAlert('resetNewPassAlert', 'resetNewPassAlertText',
        'We couldn’t update your password. Request a new code and try again.');
    }
  });
}

// Resend a code — re-runs the request. There is no backend resend cooldown,
// so no countdown is shown; the button is briefly disabled to prevent
// accidental double-submits.
async function resendResetCode() {
  const btn = document.getElementById('resetResendBtn');
  if (!btn || btn.disabled || !_recoveryEmail) return;
  btn.disabled = true;
  const idle = btn.textContent;
  btn.textContent = 'Sending…';
  authHideAlert('resetConfirmError');
  try {
    await fetch(`${AUTH_API_BASE}/api/auth/password-reset/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: _recoveryEmail }),
      signal: AbortSignal.timeout(5000),
    });
  } catch { /* stay quiet — never disclose account state */ }
  btn.textContent = 'Code sent';
  const notice = document.getElementById('resetConfirmError');
  clearTimeout(_resendTimer);
  _resendTimer = setTimeout(() => { btn.disabled = false; btn.textContent = idle; }, 20000);
}

function showResetRequest() {
  _swapResetPanel('resetRequestForm');
  authHideAlert('resetRequestError');
  const notice = document.getElementById('resetRequestNotice');
  if (notice) notice.hidden = true;
  requestAnimationFrame(() => document.getElementById('resetEmail')?.focus());
}
function showResetConfirm() {
  _swapResetPanel('resetConfirmForm');
  authHideAlert('resetConfirmError');
  requestAnimationFrame(() => document.getElementById('resetCode')?.focus());
}
function showResetNewPass() {
  _swapResetPanel('resetNewPassForm');
  authHideAlert('resetNewPassAlert');
  requestAnimationFrame(() => document.getElementById('resetNewPassword')?.focus());
}
function showResetSuccess() {
  _swapResetPanel('resetSuccessPanel');
  requestAnimationFrame(() => document.querySelector('#resetSuccessPanel .login-submit')?.focus());
}
function _swapResetPanel(showId) {
  ['resetRequestForm', 'resetConfirmForm', 'resetNewPassForm', 'resetSuccessPanel'].forEach(id => {
    document.getElementById(id)?.classList.toggle('hidden', id !== showId);
  });
}

function bindResetPasswordToggle(inputId, toggleId) {
  const password = document.getElementById(inputId);
  const toggle = document.getElementById(toggleId);
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
  bindFirstLogin();
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
