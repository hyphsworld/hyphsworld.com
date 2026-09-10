(function () {
  'use strict';

  const msgEl = document.getElementById('message');
  const form = document.getElementById('oneAuthForm');
  const emailInput = document.getElementById('authEmail');
  const passwordInput = document.getElementById('authPassword');
  const submitBtn = document.getElementById('oneAuthSubmit');
  const createIdBtn = document.getElementById('createIdBtn');
  const showCodeBtn = document.getElementById('showCodeBtn');

  let mode = 'signin';
  let submitting = false;

  function safeNext() {
    const requested = new URLSearchParams(location.search).get('next') || 'games.html';
    try {
      const target = new URL(String(requested).trim(), location.origin + '/');
      if (target.origin !== location.origin || !/^https?:$/.test(target.protocol)) return 'games.html';
      const clean = (target.pathname + target.search + target.hash).replace(/^\/+/, '');
      return clean && !/^auth\.html(?:[?#]|$)/i.test(clean) ? clean : 'games.html';
    } catch (error) {
      return 'games.html';
    }
  }

  const next = safeNext();

  function show(text, type) {
    if (!msgEl) return;
    msgEl.textContent = text || '';
    msgEl.className = 'message ' + (type || '');
  }

  function redirectToNext(delay) {
    setTimeout(() => { location.href = next; }, delay || 250);
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
    if (submitBtn) submitBtn.textContent = mode === 'signup' ? 'Create HYPHSWORLD ID' : 'Enter HYPHSWORLD';
    if (createIdBtn) createIdBtn.textContent = mode === 'signup' ? 'I Already Have an ID' : 'Create ID';
    if (passwordInput) {
      passwordInput.setAttribute('autocomplete', mode === 'signup' ? 'new-password' : 'current-password');
      if (mode === 'signup') passwordInput.setAttribute('minlength', '10');
      else passwordInput.removeAttribute('minlength');
    }
    show(mode === 'signup' ? 'Create a secret code with at least 10 characters.' : '', '');
  }

  async function submitAuth(event) {
    event.preventDefault();
    if (submitting) return;

    const email = emailInput ? emailInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value : '';
    if (!email || !password) return show('Enter your email and secret code.', 'error');

    submitting = true;
    if (submitBtn) submitBtn.disabled = true;

    try {
      if (!window.HWAuth) throw new Error('Login service did not load. Check your connection and try again.');
      if (mode === 'signup') {
        const created = await HWAuth.signUpWithEmail(email, password);
        if (created && created.pendingConfirmation) {
          show('ID created. Check your email to confirm it, then come back and log in.', 'warn');
          setMode('signin');
          return;
        }
        await refreshPoints();
        show('ID created. Loading…', 'success');
      } else {
        await HWAuth.signInWithEmail(email, password);
        const session = await HWAuth.getSession();
        if (!session) throw new Error('Login did not persist. Please try again.');
        await refreshPoints();
        show('Logged in. Loading…', 'success');
      }
      redirectToNext(250);
    } catch (error) {
      const text = String(error && error.message || 'Login failed.');
      if (/email not confirmed|email_not_confirmed/i.test(text)) {
        show('Confirm your email first, then log in.', 'warn');
      } else if (mode === 'signin' && /invalid|credential|not found/i.test(text)) {
        show('Email or secret code is incorrect.', 'error');
      } else if (mode === 'signup' && /already|registered|exists/i.test(text)) {
        setMode('signin');
        show('That email already has an ID. Log in instead.', 'warn');
      } else {
        show(text, 'error');
      }
    } finally {
      submitting = false;
      if (submitBtn) submitBtn.disabled = false;
    }
  }

  async function boot() {
    if (form) form.addEventListener('submit', submitAuth);
    if (createIdBtn) createIdBtn.addEventListener('click', () => setMode(mode === 'signup' ? 'signin' : 'signup'));
    if (showCodeBtn && passwordInput) {
      showCodeBtn.addEventListener('click', () => {
        const showing = passwordInput.type === 'text';
        passwordInput.type = showing ? 'password' : 'text';
        showCodeBtn.textContent = showing ? 'SHOW' : 'HIDE';
        showCodeBtn.setAttribute('aria-pressed', String(!showing));
        passwordInput.focus();
      });
    }

    try {
      const session = await HWAuth.getSession();
      if (session) {
        await refreshPoints();
        show('Already logged in. Loading…', 'success');
        redirectToNext(150);
      }
    } catch (error) {}
  }

  boot();
})();
