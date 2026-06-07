/*
  HYPHSWORLD Cool Points
  Account-first point system.
  - Logged-in users sync permanently through HWAuth/Supabase.
  - Guest/local users save on the same browser/device through localStorage.
  - Refresh uses the highest protected balance so rewards do not roll back.
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
  const GUEST_SESSION_KEY = 'hyphsworld.coolPoints.guestSession';
  const OLD_KEYS = ['coolPoints', 'hyphsCoolPoints', 'hwCoolPoints', 'hyphsworldPoints', 'hyphsworld.coolpoints', 'hyphsworld_points', 'HW_COOL_POINTS'];

  let points = 0;
  let hydrated = false;
  let hydrating = false;
  let sessionActive = false;
  let lastEventPoints = null;

  function safeGet(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function safeSet(key, value) { try { localStorage.setItem(key, String(value)); } catch (e) {} }
  function safeSessionGet(key) { try { return sessionStorage.getItem(key); } catch (e) { return null; } }
  function safeSessionSet(key, value) { try { sessionStorage.setItem(key, String(value)); } catch (e) {} }

  function numberFrom(value) {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }

  function getBestStoredPoints() {
    const values = [safeGet(TOTAL_KEY), safeSessionGet(GUEST_SESSION_KEY), safeGet(GUEST_SESSION_KEY)].concat(OLD_KEYS.map(safeGet));
    return values.reduce((max, value) => Math.max(max, numberFrom(value)), 0);
  }

  function mirrorPoints(value) {
    const next = Math.max(0, parseInt(value, 10) || 0);
    safeSet(TOTAL_KEY, next);
    safeSet('coolPoints', next);
    safeSet('hyphsworld_points', next);
    safeSet('HW_COOL_POINTS', next);
    safeSet(GUEST_SESSION_KEY, next);
    safeSessionSet(GUEST_SESSION_KEY, next);
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
      note: sessionActive ? 'Supabase account-backed points' : 'Local device saved points',
      updatedAt: new Date().toISOString()
    };
    safeSet(PROFILE_KEY, JSON.stringify(profile));
  }

  function emitUpdate(reason) {
    const detail = {
      points,
      accountBacked: sessionActive,
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
    const el = document.getElementById('hw-toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(window.__hwToastTimer);
    window.__hwToastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }

  function render(reason) {
    document.querySelectorAll('.js-cool-points,[data-cool-points],[data-hw-points],#cool-points,#accountCoolPoints,#gateCredits,#wof-points').forEach((el) => {
      el.textContent = String(points);
    });

    const playerName = getProfileName();
    document.querySelectorAll('#hw-player-name,[data-player-name]').forEach((el) => { el.textContent = playerName; });
    const loginLink = document.getElementById('hw-login-link');
    if (loginLink && playerName !== 'Guest') loginLink.textContent = playerName;
    document.querySelectorAll('[data-points-mode]').forEach((el) => { el.textContent = sessionActive ? 'Account saved' : 'Device saved'; });
    saveProfile();
    emitUpdate(reason || 'render');
  }

  function setDisplay(value, reason) {
    points = Math.max(0, parseInt(value, 10) || 0);
    mirrorPoints(points);
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
    return null;
  }

  async function saveAccountPointsIfHigher(bestPoints, accountPoints) {
    if (!sessionActive || !window.HWAuth || typeof window.HWAuth.setPoints !== 'function') return;
    if (!bestPoints || bestPoints <= numberFrom(accountPoints)) return;
    try { await window.HWAuth.setPoints(bestPoints, 'protect_highest_points'); } catch (error) {}
  }

  async function hydrate(force) {
    if (hydrated && !force) return points;
    if (hydrating) return points;
    hydrating = true;

    const session = await getAuthSession();
    sessionActive = Boolean(session);

    if (sessionActive) {
      const accountPoints = await getAccountPoints();
      const localBest = getBestStoredPoints();
      const best = Math.max(numberFrom(accountPoints), localBest, points);
      setDisplay(best, 'hydrate_account_best_protected');
      await saveAccountPointsIfHigher(best, accountPoints);
    } else {
      sessionActive = false;
      setDisplay(Math.max(getBestStoredPoints(), points), 'hydrate_guest_local');
    }

    hydrated = true;
    hydrating = false;
    return points;
  }

  async function add(amount, reason) {
    const n = numberFrom(amount);
    if (!n) return points;

    await hydrate(true);
    const base = Math.max(points, getBestStoredPoints());
    const session = await getAuthSession();
    sessionActive = Boolean(session);

    if (sessionActive && window.HWAuth && typeof window.HWAuth.addPoints === 'function') {
      try {
        const next = await window.HWAuth.addPoints(n, reason || '');
        setDisplay(Math.max(numberFrom(next), base + n), 'add_account_protected');
        await saveAccountPointsIfHigher(points, next);
        toast(`+${n} Cool Points${reason ? ' — ' + reason : ''}`);
        return points;
      } catch (error) {}
    }

    sessionActive = false;
    setDisplay(base + n, 'add_guest_local');
    toast(`+${n} Cool Points${reason ? ' — ' + reason : ''}`);
    return points;
  }

  async function spend(amount, reason) {
    const n = numberFrom(amount);
    if (!n) return points;

    await hydrate(true);

    if (points < n) {
      toast(`Need ${n} Cool Points. Current: ${points}`);
      return points;
    }

    const next = points - n;
    const session = await getAuthSession();
    sessionActive = Boolean(session);

    if (sessionActive && window.HWAuth && typeof window.HWAuth.setPoints === 'function') {
      try {
        const saved = await window.HWAuth.setPoints(next, reason || 'spend');
        setDisplay(saved, 'spend_account');
        toast(`-${n} Cool Points spent${reason ? ' — ' + reason : ''}`);
        return points;
      } catch (error) {}
    }

    sessionActive = false;
    setDisplay(next, 'spend_guest_local');
    toast(`-${n} Cool Points spent${reason ? ' — ' + reason : ''}`);
    return points;
  }

  async function set(value) {
    const requested = Math.max(0, parseInt(value, 10) || 0);
    const next = Math.max(requested, getBestStoredPoints(), points);
    const session = await getAuthSession();
    sessionActive = Boolean(session);

    if (sessionActive && window.HWAuth && typeof window.HWAuth.setPoints === 'function') {
      try {
        const saved = await window.HWAuth.setPoints(next, 'set_points_protected');
        setDisplay(Math.max(numberFrom(saved), next), 'set_account_protected');
        return points;
      } catch (error) {}
    }

    sessionActive = false;
    setDisplay(next, 'set_guest_local');
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
  points = getBestStoredPoints();
  mirrorPoints(points);
  render('boot');
})();
