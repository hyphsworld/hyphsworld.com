/*
  HYPHSWORLD Cool Points
  Account-only point system.
  - Login once and the Supabase ID becomes the only real wallet.
  - localStorage mirrors the account balance for display only.
  - Logged-out visitors do not earn or spend real Cool Points.
*/
(function () {
  'use strict';

  function loadSharedAnalytics() {
    if (window.__HYPHSWORLD_ANALYTICS_BOOTSTRAP__) return;
    window.__HYPHSWORLD_ANALYTICS_BOOTSTRAP__ = true;
    const script = document.createElement('script');
    script.src = 'site-analytics.js';
    script.defer = true;
    document.head.appendChild(script);
  }

  loadSharedAnalytics();

  const TOTAL_KEY = 'hyphsworld.coolPoints.total';
  const PROFILE_KEY = 'hyphsworld.coolPoints.profile';
  const CACHE_KEYS = ['coolPoints', 'hyphsworld_points', 'HW_COOL_POINTS', 'hyphsworld.coolPoints.guestSession'];

  let points = 0;
  let hydrated = false;
  let hydrating = false;
  let sessionActive = false;
  let lastEventPoints = null;

  function safeGet(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function safeSet(key, value) { try { localStorage.setItem(key, String(value)); } catch (e) {} }
  function safeSessionSet(key, value) { try { sessionStorage.setItem(key, String(value)); } catch (e) {} }

  function numberFrom(value) {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }

  function cachePoints(value) {
    const next = Math.max(0, parseInt(value, 10) || 0);
    safeSet(TOTAL_KEY, next);
    CACHE_KEYS.forEach((key) => safeSet(key, next));
    safeSessionSet('hyphsworld.coolPoints.guestSession', next);
  }

  function getProfileName() {
    const saved = safeGet('hyphsworld.playerName') || safeGet('hyphsworld.userName') || safeGet('hwPlayerName') || safeGet('playerName') || safeGet('username');
    return saved && saved.trim() ? saved.trim() : 'Guest';
  }

  function saveProfile() {
    const profile = {
      name: getProfileName(),
      points,
      accountBacked: sessionActive,
      note: sessionActive ? 'Supabase account-backed points' : 'Login required for real Cool Points',
      updatedAt: new Date().toISOString()
    };
    safeSet(PROFILE_KEY, JSON.stringify(profile));
  }

  function emitUpdate(reason) {
    const detail = {
      points,
      accountBacked: sessionActive,
      loginRequired: !sessionActive,
      reason: reason || 'render',
      profile: { name: getProfileName(), points, accountBacked: sessionActive }
    };
    if (lastEventPoints === points && reason === 'render') return;
    lastEventPoints = points;
    try {
      document.dispatchEvent(new CustomEvent('hyph:points-updated', { detail }));
      window.dispatchEvent(new CustomEvent('hw:points-change', { detail }));
    } catch (error) {}
  }

  function toast(message) {
    const el = document.getElementById('hw-toast') || document.getElementById('casinoToast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(window.__hwToastTimer);
    window.__hwToastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  }

  function render(reason) {
    document.querySelectorAll('.js-cool-points,[data-cool-points],[data-hw-points],#cool-points,#accountCoolPoints,#gateCredits,#wof-points').forEach((el) => {
      el.textContent = String(points);
    });

    const playerName = getProfileName();
    document.querySelectorAll('#hw-player-name,[data-player-name]').forEach((el) => { el.textContent = playerName; });
    const loginLink = document.getElementById('hw-login-link');
    if (loginLink && playerName !== 'Guest') loginLink.textContent = playerName;
    document.querySelectorAll('[data-points-mode]').forEach((el) => { el.textContent = sessionActive ? 'Account saved' : 'Login required'; });
    saveProfile();
    emitUpdate(reason || 'render');
  }

  function setDisplay(value, reason) {
    points = Math.max(0, parseInt(value, 10) || 0);
    cachePoints(points);
    render(reason || 'set_display');
    return points;
  }

  async function getAuthSession() {
    try {
      if (window.HWAuth && typeof window.HWAuth.getSession === 'function') return await window.HWAuth.getSession();
    } catch (error) {}
    return null;
  }

  async function getAccountPoints() {
    try {
      if (window.HWAuth && typeof window.HWAuth.getPoints === 'function') return numberFrom(await window.HWAuth.getPoints());
    } catch (error) {}
    return 0;
  }

  async function hydrate(force) {
    if (hydrated && !force) return points;
    if (hydrating) return points;
    hydrating = true;

    const session = await getAuthSession();
    sessionActive = Boolean(session);

    if (sessionActive) {
      const accountPoints = await getAccountPoints();
      setDisplay(accountPoints, 'hydrate_account_only');
    } else {
      sessionActive = false;
      setDisplay(0, 'hydrate_login_required');
    }

    hydrated = true;
    hydrating = false;
    return points;
  }

  async function requireLogin() {
    await hydrate(true);
    if (!sessionActive) {
      toast('Login required to save Cool Points.');
      try { document.dispatchEvent(new CustomEvent('hyph:points-login-required', { detail: { points: 0 } })); } catch (error) {}
      return false;
    }
    return true;
  }

  async function add(amount, reason) {
    const n = numberFrom(amount);
    if (!n) return points;

    if (!(await requireLogin())) return points;

    if (window.HWAuth && typeof window.HWAuth.addPoints === 'function') {
      const next = await window.HWAuth.addPoints(n, reason || '');
      setDisplay(numberFrom(next), 'add_account_only');
      toast(`+${n} Cool Points${reason ? ' — ' + reason : ''}`);
      return points;
    }

    toast('Login required to save Cool Points.');
    return points;
  }

  async function spend(amount, reason) {
    const n = numberFrom(amount);
    if (!n) return points;

    if (!(await requireLogin())) return points;

    if (points < n) {
      toast(`Need ${n} Cool Points. Current: ${points}`);
      return points;
    }

    const next = points - n;

    if (window.HWAuth && typeof window.HWAuth.setPoints === 'function') {
      const saved = await window.HWAuth.setPoints(next, reason || 'spend');
      setDisplay(numberFrom(saved), 'spend_account_only');
      toast(`-${n} Cool Points spent${reason ? ' — ' + reason : ''}`);
      return points;
    }

    toast('Login required to save Cool Points.');
    return points;
  }

  async function set(value) {
    const requested = Math.max(0, parseInt(value, 10) || 0);

    if (!(await requireLogin())) return points;

    if (window.HWAuth && typeof window.HWAuth.setPoints === 'function') {
      const saved = await window.HWAuth.setPoints(requested, 'set_points_account_only');
      setDisplay(numberFrom(saved), 'set_account_only');
      return points;
    }

    toast('Login required to save Cool Points.');
    return points;
  }

  async function refresh() {
    hydrated = false;
    const refreshed = await hydrate(true);
    render('refresh');
    return refreshed;
  }

  document.addEventListener('click', (event) => {
    const addButton = event.target.closest('[data-point-add]');
    if (addButton) { add(addButton.dataset.pointAdd, addButton.dataset.pointReason || addButton.dataset.reason || ''); return; }
    const legacyEarnButton = event.target.closest('[data-points]');
    if (legacyEarnButton) { add(legacyEarnButton.dataset.points, legacyEarnButton.dataset.reason || legacyEarnButton.dataset.pointReason || 'site_action'); return; }
    const spendButton = event.target.closest('[data-point-spend]');
    if (spendButton) spend(spendButton.dataset.pointSpend, spendButton.dataset.pointReason || spendButton.dataset.reason || '');
  });

  document.addEventListener('hyph:points:add', (event) => {
    const detail = event.detail || {};
    add(detail.amount || detail.points || 0, detail.reason || 'site_event');
  });

  document.addEventListener('hw:points:add', (event) => {
    const detail = event.detail || {};
    add(detail.amount || detail.points || 0, detail.reason || 'site_event');
  });

  window.HWPoints = Object.assign({}, window.HWPoints || {}, {
    __accountOnlyCoolPointsV2: true,
    get: () => points,
    hydrate,
    refresh,
    add,
    spend,
    set,
    render,
    isAccountBacked: () => sessionActive,
    profile: () => { try { return JSON.parse(safeGet(PROFILE_KEY) || '{}'); } catch (e) { return {}; } }
  });

  document.addEventListener('DOMContentLoaded', () => { hydrate(true).then(() => render('dom_ready')); });
  points = 0;
  cachePoints(points);
  render('boot');
})();
