/* HYPHSWORLD user widget: avatar + name + GTA-style Cool Points HUD */
(function () {
  'use strict';

  const HUD_ID = 'hw-gta-hud';

  function getLocal(key, fallback) {
    try { return localStorage.getItem(key) || fallback; } catch { return fallback; }
  }

  function avatarIcon(type) {
    return String(type || '').toLowerCase() === 'girl' ? '💅' : '🧢';
  }

  function number(value) {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }

  function localProfile() {
    const name = getLocal('hyphsworld.playerName', 'Guest');
    const avatarType = getLocal('hyphsworld.avatarType', 'boy');
    const points = number(getLocal('hyphsworld.coolPoints.total', '0'));
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
        '<span class="hw-hud-icon">⭐</span>' +
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
    const points = number(p.coolPoints ?? p.points ?? 0);
    const isAccount = Boolean(p.email || p.userId || p.provider === 'supabase');
    const status = isAccount ? 'ID Active' : 'Local Guest';

    const pointsEl = hud.querySelector('.hw-hud-points');
    const nameEl = hud.querySelector('[data-hud-name]');
    const statusEl = hud.querySelector('[data-hud-status]');

    if (pointsEl) pointsEl.textContent = String(points).padStart(3, '0') + ' CP';
    if (nameEl) nameEl.textContent = name;
    if (statusEl) statusEl.textContent = status;
    hud.dataset.state = isAccount ? 'account' : 'guest';
  }

  function renderProfile(profile) {
    const p = profile || localProfile();
    const name = p.displayName || p.username || 'Guest';
    const points = number(p.coolPoints ?? p.points ?? 0);
    const icon = p.avatarIcon || avatarIcon(p.avatarType);

    document.querySelectorAll('[data-user-widget]').forEach((el) => {
      el.innerHTML = '<span class="hw-user-icon" aria-hidden="true">' + escapeText(icon) + '</span>' +
        '<span class="hw-user-name">' + escapeText(name) + '</span>' +
        '<span class="hw-user-points">' + points + ' CP</span>';
      el.dataset.avatarType = p.avatarType || 'boy';
    });

    document.querySelectorAll('[data-player-name]').forEach((el) => { el.textContent = name; });
    document.querySelectorAll('[data-player-avatar]').forEach((el) => { el.textContent = icon; });
    document.querySelectorAll('[data-player-points]').forEach((el) => { el.textContent = String(points); });

    renderHud({ ...p, displayName: name, coolPoints: points, avatarIcon: icon });
  }

  async function refresh() {
    let profile = localProfile();
    try {
      if (window.HWAuth && typeof window.HWAuth.getCurrentUser === 'function') {
        const user = await window.HWAuth.getCurrentUser();
        if (user) profile = user;
      }
      if (window.HWPoints && typeof window.HWPoints.get === 'function') {
        profile.coolPoints = window.HWPoints.get();
      }
    } catch (error) {}
    renderProfile(profile);
    return profile;
  }

  window.HWUserWidget = { refresh, render: renderProfile, renderHud };

  document.addEventListener('DOMContentLoaded', refresh);
  window.addEventListener('storage', refresh);

  document.addEventListener('click', function (event) {
    if (event.target.closest('[data-point-add],[data-point-spend],[data-funny-action]')) {
      setTimeout(refresh, 120);
      setTimeout(refresh, 500);
      setTimeout(refresh, 1200);
    }
  });
})();
