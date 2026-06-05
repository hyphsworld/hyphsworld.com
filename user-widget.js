/* HYPHSWORLD user widget: avatar + name + GTA-style Cool Points HUD */
(function () {
  'use strict';

  const HUD_ID = 'hw-gta-hud';
  const POINT_KEYS = [
    'hyphsworld.coolPoints.total',
    'hyphsworld.coolPoints.guestSession',
    'coolPoints',
    'hyphsworld_points',
    'HW_COOL_POINTS'
  ];

  const avatarMap = {
    boy: '🧢',
    girl: '💅',
    fox: '🦊',
    lion: '🦁',
    panda: '🐼',
    wolf: '🐺',
    alien: '👽',
    robot: '🤖',
    ghost: '👻',
    ninja: '🥷',
    crown: '👑',
    diamond: '💎'
  };

  function getLocal(key, fallback) {
    try { return localStorage.getItem(key) || fallback; } catch { return fallback; }
  }

  function avatarIcon(type) {
    const key = String(type || '').toLowerCase().trim();
    return avatarMap[key] || getLocal('hyphsworld.avatarIcon', '') || '🧢';
  }

  function number(value) {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }

  function readStoredPoints() {
    let max = 0;
    POINT_KEYS.forEach((key) => { max = Math.max(max, number(getLocal(key, '0'))); });
    try { max = Math.max(max, number(sessionStorage.getItem('hyphsworld.coolPoints.guestSession'))); } catch (error) {}
    return max;
  }

  function currentPoints() {
    try {
      if (window.HWPoints && typeof window.HWPoints.get === 'function') {
        return Math.max(number(window.HWPoints.get()), readStoredPoints());
      }
      if (window.HWPoints && typeof window.HWPoints.getState === 'function') {
        const state = window.HWPoints.getState();
        return Math.max(number(state && state.points), readStoredPoints());
      }
    } catch (error) {}
    return readStoredPoints();
  }

  function localProfile() {
    const name = getLocal('hyphsworld.playerName', 'Guest');
    const avatarType = getLocal('hyphsworld.avatarType', 'boy');
    const points = currentPoints();
    return { displayName: name, avatarType, avatarIcon: avatarIcon(avatarType), coolPoints: points, provider: 'local' };
  }

  function escapeText(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function ensureHud() {
    let hud = document.getElementById(HUD_ID);
    if (hud) return hud;

    hud = document.createElement('aside');
    hud.id = HUD_ID;
    hud.className = 'hw-gta-hud';
    hud.setAttribute('aria-label', 'HYPHSWORLD Cool Points HUD');
    hud.innerHTML =
      '<div class="hw-hud-icon-stack" aria-hidden="true">' +
        '<span class="hw-hud-icon" data-hud-avatar>🧢</span>' +
        '<span class="hw-hud-icon">💵</span>' +
        '<span class="hw-hud-icon">🎧</span>' +
        '<span class="hw-hud-icon">🛡️</span>' +
      '</div>' +
      '<div class="hw-hud-readout">' +
        '<span class="hw-hud-label">Cool Points</span>' +
        '<strong class="hw-hud-points" data-player-points>0</strong>' +
        '<span class="hw-hud-name" data-hud-name>Guest</span>' +
        '<span class="hw-hud-status" data-hud-status>Local</span>' +
      '</div>';

    document.body.appendChild(hud);
    return hud;
  }

  function renderHud(profile) {
    const p = profile || localProfile();
    const hud = ensureHud();
    const name = p.displayName || p.username || 'Guest';
    const points = currentPoints();
    const icon = p.avatarIcon || avatarIcon(p.avatarType);
    const isAccount = Boolean(p.email || p.userId || p.provider === 'supabase');
    const status = isAccount ? 'ID Active' : 'Device Saved';

    const avatarEl = hud.querySelector('[data-hud-avatar]');
    const pointsEl = hud.querySelector('.hw-hud-points');
    const nameEl = hud.querySelector('[data-hud-name]');
    const statusEl = hud.querySelector('[data-hud-status]');

    if (avatarEl) avatarEl.textContent = icon;
    if (pointsEl) pointsEl.textContent = String(points).padStart(3, '0') + ' CP';
    if (nameEl) nameEl.textContent = name;
    if (statusEl) statusEl.textContent = status;
    hud.dataset.state = isAccount ? 'account' : 'guest';
  }

  function renderProfile(profile) {
    const p = profile || localProfile();
    const name = p.displayName || p.username || 'Guest';
    const points = currentPoints();
    const icon = p.avatarIcon || avatarIcon(p.avatarType);
    const avatarType = String(p.avatarType || getLocal('hyphsworld.avatarType', 'boy')).toLowerCase();

    document.querySelectorAll('[data-user-widget]').forEach((el) => {
      el.innerHTML = '<span class="hw-user-icon" aria-hidden="true">' + escapeText(icon) + '</span>' +
        '<span class="hw-user-name">' + escapeText(name) + '</span>' +
        '<span class="hw-user-points">' + points + ' CP</span>';
      el.dataset.avatarType = avatarType;
    });

    document.querySelectorAll('[data-player-name]').forEach((el) => { el.textContent = name; });
    document.querySelectorAll('[data-player-avatar]').forEach((el) => { el.textContent = icon; });
    document.querySelectorAll('[data-player-points]').forEach((el) => { el.textContent = String(points); });
    document.querySelectorAll('.hw-user-points').forEach((el) => { el.textContent = points + ' CP'; });

    renderHud({ ...p, displayName: name, coolPoints: points, avatarIcon: icon, avatarType });
  }

  async function refresh() {
    let profile = localProfile();
    try {
      if (window.HWAuth && typeof window.HWAuth.getCurrentUser === 'function') {
        const user = await window.HWAuth.getCurrentUser();
        if (user) profile = user;
      }
      const localAvatarType = getLocal('hyphsworld.avatarType', profile.avatarType || 'boy');
      profile.avatarType = localAvatarType;
      profile.avatarIcon = avatarIcon(localAvatarType);
      profile.coolPoints = currentPoints();
    } catch (error) {}
    renderProfile(profile);
    return profile;
  }

  window.HWUserWidget = { refresh, render: renderProfile, renderHud, getPoints: currentPoints, avatarIcon };

  document.addEventListener('DOMContentLoaded', refresh);
  window.addEventListener('storage', refresh);
  window.addEventListener('hw:points-change', refresh);
  document.addEventListener('hyph:points-updated', refresh);

  document.addEventListener('click', function (event) {
    if (event.target.closest('[data-point-add],[data-point-spend],[data-points],[data-funny-action],input[name="avatarType"]')) {
      setTimeout(refresh, 80);
      setTimeout(refresh, 350);
      setTimeout(refresh, 900);
    }
  });
})();
