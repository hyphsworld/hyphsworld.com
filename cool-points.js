/*
  HYPHSWORLD Cool Points
  Supabase-ready point system. Logged-in accounts sync through HWAuth/Supabase.
  Guests stay browser-local so the site keeps working.
*/
(function () {
  'use strict';

  const TOTAL_KEY = 'hyphsworld.coolPoints.total';
  const PROFILE_KEY = 'hyphsworld.coolPoints.profile';
  const OLD_KEYS = ['coolPoints', 'hyphsCoolPoints', 'hwCoolPoints', 'hyphsworldPoints', 'hyphsworld.coolpoints'];

  let points = 0;
  let hydrated = false;

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

  async function hydrate() {
    if (hydrated) return points;
    hydrated = true;

    points = migrateOldPoints();

    try {
      if (window.HWAuth && typeof window.HWAuth.getPoints === 'function') {
        const session = await window.HWAuth.getSession();
        if (session) {
          points = await window.HWAuth.getPoints();
        }
      }
    } catch (error) {
      points = migrateOldPoints();
    }

    setLocal(points);
    return points;
  }

  async function add(amount, reason) {
    const n = numberFrom(amount);
    if (!n) return points;

    points += n;
    setLocal(points);

    try {
      if (window.HWAuth && typeof window.HWAuth.addPoints === 'function') {
        const session = await window.HWAuth.getSession();
        if (session) points = await window.HWAuth.addPoints(n, reason || '');
      }
    } catch (error) {}

    setLocal(points);
    toast(`+${n} Cool Points${reason ? ' — ' + reason : ''}`);
    return points;
  }

  async function spend(amount, reason) {
    const n = numberFrom(amount);
    if (!n) return points;

    if (points < n) {
      toast(`Need ${n} Cool Points. Current: ${points}`);
      return points;
    }

    points -= n;
    setLocal(points);

    try {
      if (window.HWAuth && typeof window.HWAuth.setPoints === 'function') {
        const session = await window.HWAuth.getSession();
        if (session) points = await window.HWAuth.setPoints(points);
      }
    } catch (error) {}

    setLocal(points);
    toast(`-${n} Cool Points spent${reason ? ' — ' + reason : ''}`);
    return points;
  }

  async function set(value) {
    const next = Math.max(0, parseInt(value, 10) || 0);
    setLocal(next);

    try {
      if (window.HWAuth && typeof window.HWAuth.setPoints === 'function') {
        const session = await window.HWAuth.getSession();
        if (session) points = await window.HWAuth.setPoints(next);
      }
    } catch (error) {}

    setLocal(points);
    return points;
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
    add,
    spend,
    set,
    render,
    profile: () => {
      try { return JSON.parse(safeGet(PROFILE_KEY) || '{}'); } catch (e) { return {}; }
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    hydrate().then(render);
  });

  points = migrateOldPoints();
  render();
})();
