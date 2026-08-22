(function () {
  'use strict';

  const msgEl = document.getElementById('message');
  const googleLoginBtn = document.getElementById('googleLoginBtn');
  const authCard = document.getElementById('authCard');
  const modeSignin = document.getElementById('modeSignin');
  const modeSignup = document.getElementById('modeSignup');
  const form = document.getElementById('oneAuthForm');
  const emailInput = document.getElementById('authEmail');
  const passwordInput = document.getElementById('authPassword');
  const togglePasswordBtn = document.getElementById('togglePassword');
  const submitBtn = document.getElementById('oneAuthSubmit');
  const GOOGLE_REDIRECT_URL = 'https://hyphsworld.com/account.html';

  let mode = 'signin';
  let submitting = false;

  function safeNext() {
    const requested = new URLSearchParams(location.search).get('next') || 'games.html';
    const clean = String(requested).trim();
    if (!clean || /^https?:\/\//i.test(clean) || clean.startsWith('//') || clean.startsWith('javascript:')) return 'games.html';
    return clean.replace(/^\/+/, '') || 'games.html';
  }

  const next = safeNext();

  function show(text, type) {
    if (!msgEl) return;
    msgEl.textContent = text;
    msgEl.className = 'message ' + (type || '');
  }

  function redirectToNext(delay) {
    setTimeout(() => { location.href = next; }, delay || 300);
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
    if (submitBtn) submitBtn.textContent = mode === 'signup' ? 'Create ID & Play' : 'Login & Play';
    if (passwordInput) passwordInput.setAttribute('autocomplete', mode === 'signup' ? 'new-password' : 'current-password');
    show(mode === 'signup' ? 'Create one HYPHSWORLD ID. Then use it everywhere.' : 'Login once. Then play across HYPHSWORLD.', '');
  }

  function togglePassword() {
    if (!passwordInput || !togglePasswordBtn) return;
    const showing = passwordInput.type === 'text';
    passwordInput.type = showing ? 'password' : 'text';
    togglePasswordBtn.textContent = showing ? 'See' : 'Hide';
    togglePasswordBtn.setAttribute('aria-pressed', showing ? 'false' : 'true');
  }

  async function submitAuth(event) {
    event.preventDefault();
    if (submitting) return;
    const email = emailInput ? emailInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value : '';
    if (!email || !password) return show('Enter your email and password.', 'error');

    submitting = true;
    if (submitBtn) submitBtn.disabled = true;

    try {
      if (mode === 'signup') {
        await HWAuth.signUpWithEmail(email, password);
        await refreshPoints();
        show('ID created. Loading your game…', 'success');
      } else {
        await HWAuth.signInWithEmail(email, password);
        const session = await HWAuth.getSession();
        if (!session) throw new Error('Login did not persist. Please try again.');
        await refreshPoints();
        show('Logged in. Loading your game…', 'success');
      }
      redirectToNext(300);
    } catch (error) {
      const text = String(error && error.message || 'Auth failed.');
      if (mode === 'signin' && /invalid|credential|not found/i.test(text)) {
        show('Login failed. New here? Tap Create ID.', 'error');
      } else if (mode === 'signup' && /already|registered|exists/i.test(text)) {
        setMode('signin');
        show('That email already has an ID. Login instead.', 'warn');
      } else {
        show(text, 'error');
      }
    } finally {
      submitting = false;
      if (submitBtn) submitBtn.disabled = false;
    }
  }

  async function googleLogin() {
    try {
      if (googleLoginBtn) googleLoginBtn.disabled = true;
      show('Opening Google login…', 'success');
      await HWAuth.signInWithGoogle({ redirectTo: GOOGLE_REDIRECT_URL });
    } catch (error) {
      if (googleLoginBtn) googleLoginBtn.disabled = false;
      show(error.message || 'Google login failed.', 'error');
    }
  }

  async function boot() {
    setMode('signin');
    if (modeSignin) modeSignin.addEventListener('click', () => setMode('signin'));
    if (modeSignup) modeSignup.addEventListener('click', () => setMode('signup'));
    if (togglePasswordBtn) togglePasswordBtn.addEventListener('click', togglePassword);
    if (googleLoginBtn) googleLoginBtn.addEventListener('click', googleLogin);
    if (form) form.addEventListener('submit', submitAuth);

    try {
      const session = await HWAuth.getSession();
      if (session) {
        await refreshPoints();
        show('Already logged in. Loading…', 'success');
        redirectToNext(180);
      }
    } catch (error) {}
  }

  boot();
})();
