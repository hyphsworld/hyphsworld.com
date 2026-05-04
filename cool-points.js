/*
  HYPHSWORLD Cool Points
  Account-first point system. Logged-in accounts sync through HWAuth/Supabase.
  Guests stay browser-local so the site keeps working before login.
*/
(function () {
  'use strict';

  const TOTAL_KEY = 'hyphsworld.coolPoints.total';
  const PROFILE_KEY = 'hyphsworld.coolPoints.profile';
  const OLD_KEYS = ['coolPoints', 'hyphsCoolPoints', 'hwCoolPoints', 'hyphsworldPoints', 'hyphsworld.coolpoints'];

  let points = 0;
  let hydrated = false;
  let hydrating = false;
  let sessionActive = false;

  function safeGet(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function safeSet(key, value) { try { localStorage.setItem(key, String(value)); } catch (e) {} }
  function numberFrom(value) {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }

  function getProfileName() {
    const saved =
      safeGet('hyphsworld.playerName') ||
      safeGet('hyphsworld.userName') ||
      safeGet('hwPlayerName') ||
      safeGet('playerName') ||
      safeGet('username');
    return saved && saved.trim() ? saved.trim() : 'Guest';
  }

  function migrateOldPoints() {
    let current = numberFrom(safeGet(TOTAL_KEY));
    OLD_KEYS.forEach((key) => {
      const oldValue = numberFrom(safeGet(key));
      if (oldValue > current) current = oldValue;
    });
    safeSet(TOTAL_KEY, current);
    return current;
  }

  function saveProfile() {
    const profile = {
      name: getProfileName(),
      points,
      accountBacked: sessionActive,
      updatedAt: new Date().toISOString()
    };
    safeSet(PROFILE_KEY, JSON.stringify(profile));
  }

  function toast(message) {
    const el = document.getElementById('hw-toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(window.__hwToastTimer);
    window.__hwToastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }

  function render() {
    document.querySelectorAll('.js-cool-points,[data-cool-points],#accountCoolPoints,#gateCredits').forEach((el) => {
      el.textContent = String(points);
    });

    const playerName = getProfileName();
    document.querySelectorAll('#hw-player-name,[data-player-name]').forEach((el) => {
      el.textContent = playerName;
    });

    const loginLink = document.getElementById('hw-login-link');
    if (loginLink && playerName !== 'Guest') loginLink.textContent = playerName;

    saveProfile();
  }

  function setLocal(value) {
    points = Math.max(0, parseInt(value, 10) || 0);
    safeSet(TOTAL_KEY, points);
    render();
    return points;
  }

  async function getAuthSession() {
    try {
      if (window.HWAuth && typeof window.HWAuth.getSession === 'function') {
        return await window.HWAuth.getSession();
      }
    } catch (error) {}
    return null;
  }

  async function getAccountPoints() {
    try {
      if (window.HWAuth && typeof window.HWAuth.getPoints === 'function') {
        return numberFrom(await window.HWAuth.getPoints());
      }
    } catch (error) {}
    return null;
  }

  async function hydrate(force) {
    if (hydrated && !force) return points;
    if (hydrating) return points;
    hydrating = true;

    const localStart = migrateOldPoints();
    const session = await getAuthSession();
    sessionActive = Boolean(session);

    if (sessionActive) {
      const accountPoints = await getAccountPoints();
      if (accountPoints !== null) setLocal(accountPoints);
      else setLocal(localStart);
    } else {
      setLocal(localStart);
    }

    hydrated = true;
    hydrating = false;
    return points;
  }

  async function add(amount, reason) {
    const n = numberFrom(amount);
    if (!n) return points;

    const session = await getAuthSession();
    sessionActive = Boolean(session);

    if (sessionActive && window.HWAuth && typeof window.HWAuth.addPoints === 'function') {
      try {
        const next = await window.HWAuth.addPoints(n, reason || '');
        setLocal(next);
        toast(`+${n} Cool Points${reason ? ' — ' + reason : ''}`);
        return points;
      } catch (error) {}
    }

    points += n;
    setLocal(points);
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
        setLocal(saved);
        toast(`-${n} Cool Points spent${reason ? ' — ' + reason : ''}`);
        return points;
      } catch (error) {}
    }

    setLocal(next);
    toast(`-${n} Cool Points spent${reason ? ' — ' + reason : ''}`);
    return points;
  }

  async function set(value) {
    const next = Math.max(0, parseInt(value, 10) || 0);
    const session = await getAuthSession();
    sessionActive = Boolean(session);

    if (sessionActive && window.HWAuth && typeof window.HWAuth.setPoints === 'function') {
      try {
        const saved = await window.HWAuth.setPoints(next, 'set_points');
        setLocal(saved);
        return points;
      } catch (error) {}
    }

    setLocal(next);
    return points;
  }

  async function refresh() {
    hydrated = false;
    return hydrate(true);
  }

  document.addEventListener('click', (event) => {
    const addButton = event.target.closest('[data-point-add]');
    if (addButton) {
      add(addButton.dataset.pointAdd, addButton.dataset.pointReason || '');
      return;
    }

    const spendButton = event.target.closest('[data-point-spend]');
    if (spendButton) spend(spendButton.dataset.pointSpend, spendButton.dataset.pointReason || '');
  });

  window.HWPoints = {
    get: () => points,
    hydrate,
    refresh,
    add,
    spend,
    set,
    render,
    profile: () => {
      try { return JSON.parse(safeGet(PROFILE_KEY) || '{}'); } catch (e) { return {}; }
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    hydrate(true).then(render);
  });

  points = numberFrom(safeGet(TOTAL_KEY));
  render();
})();
