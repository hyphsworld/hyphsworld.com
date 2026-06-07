(function () {
  'use strict';

  const msgEl = document.getElementById('message');
  const next = new URLSearchParams(location.search).get('next') || 'account.html';
  const googleLoginBtn = document.getElementById('googleLoginBtn');
  const authCard = document.getElementById('authCard');
  const modeSignin = document.getElementById('modeSignin');
  const modeSignup = document.getElementById('modeSignup');
  const form = document.getElementById('oneAuthForm');
  const emailInput = document.getElementById('authEmail');
  const passwordInput = document.getElementById('authPassword');
  const submitBtn = document.getElementById('oneAuthSubmit');
  const GOOGLE_REDIRECT_URL = 'https://hyphsworld.com/account.html';

  let mode = 'signin';

  function show(text, type) {
    if (!msgEl) return;
    msgEl.textContent = text;
    msgEl.className = 'message ' + (type || '');
  }

  function redirectToNext(delay) {
    setTimeout(() => { location.href = next; }, delay || 400);
  }

  async function refreshPoints() {
    try {
      if (window.HWPoints && typeof window.HWPoints.refresh === 'function') {
        await window.HWPoints.refresh();
        if (typeof window.HWPoints.render === 'function') window.HWPoints.render();
      }
    } catch (error) {}
  }

  function setMode(nextMode) {
    mode = nextMode === 'signup' ? 'signup' : 'signin';
    if (authCard) {
      authCard.classList.toggle('mode-signup', mode === 'signup');
      authCard.classList.toggle('mode-signin', mode === 'signin');
    }
    if (modeSignin) {
      modeSignin.classList.toggle('is-active', mode === 'signin');
      modeSignin.setAttribute('aria-selected', mode === 'signin' ? 'true' : 'false');
    }
    if (modeSignup) {
      modeSignup.classList.toggle('is-active', mode === 'signup');
      modeSignup.setAttribute('aria-selected', mode === 'signup' ? 'true' : 'false');
    }
    if (submitBtn) submitBtn.textContent = mode === 'signup' ? 'Create ID' : 'Login';
    if (passwordInput) passwordInput.setAttribute('autocomplete', mode === 'signup' ? 'new-password' : 'current-password');
    show(mode === 'signup' ? 'Create one HYPHSWORLD ID. Use it everywhere.' : 'Login with your existing HYPHSWORLD ID.', '');
  }

  async function submitAuth(event) {
    event.preventDefault();
    const email = emailInput ? emailInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value : '';
    if (!email || !password) return show('Email and password required.', 'error');

    if (submitBtn) submitBtn.disabled = true;

    try {
      if (mode === 'signup') {
        await HWAuth.signUpWithEmail(email, password);
        await refreshPoints();
        show('ID created. Opening your account…', 'success');
      } else {
        await HWAuth.signInWithEmail(email, password);
        await refreshPoints();
        show('Logged in. Opening your account…', 'success');
      }
      redirectToNext(450);
    } catch (error) {
      const text = String(error && error.message || 'Auth failed.');
      if (mode === 'signin' && /invalid|credential|not found|email/i.test(text)) {
        show('Login failed. New here? Tap Create ID once.', 'error');
      } else if (mode === 'signup' && /already|registered|exists/i.test(text)) {
        setMode('signin');
        show('That email already has an ID. Login instead.', 'warn');
      } else {
        show(text, 'error');
      }
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  }

  async function googleLogin() {
    try {
      if (googleLoginBtn) googleLoginBtn.disabled = true;
      show('Opening Google ID tunnel…', 'success');
      await HWAuth.signInWithGoogle({ redirectTo: GOOGLE_REDIRECT_URL });
    } catch (error) {
      if (googleLoginBtn) googleLoginBtn.disabled = false;
      show(error.message || 'Google login failed.', 'error');
    }
  }

  async function boot() {
    setMode('signin');

    try {
      const session = await HWAuth.getSession();
      if (session) {
        await refreshPoints();
        show('Already logged in. Opening account management…', 'success');
        redirectToNext(350);
      }
    } catch (error) {}

    if (modeSignin) modeSignin.addEventListener('click', () => setMode('signin'));
    if (modeSignup) modeSignup.addEventListener('click', () => setMode('signup'));
    if (googleLoginBtn) googleLoginBtn.addEventListener('click', googleLogin);
    if (form) form.addEventListener('submit', submitAuth);
  }

  boot();
})();
