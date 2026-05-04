/* HYPHSWORLD user widget: avatar + name + Cool Points */
(function () {
  'use strict';

  function getLocal(key, fallback) {
    try { return localStorage.getItem(key) || fallback; } catch { return fallback; }
  }

  function avatarIcon(type) {
    return String(type || '').toLowerCase() === 'girl' ? '💅' : '🧢';
  }

  function localProfile() {
    const name = getLocal('hyphsworld.playerName', 'Guest');
    const avatarType = getLocal('hyphsworld.avatarType', 'boy');
    const points = parseInt(getLocal('hyphsworld.coolPoints.total', '0'), 10) || 0;
    return { displayName: name, avatarType, avatarIcon: avatarIcon(avatarType), coolPoints: points };
  }

  function renderProfile(profile) {
    const p = profile || localProfile();
    const name = p.displayName || p.username || 'Guest';
    const points = parseInt(p.coolPoints ?? p.points ?? 0, 10) || 0;
    const icon = p.avatarIcon || avatarIcon(p.avatarType);

    document.querySelectorAll('[data-user-widget]').forEach((el) => {
      el.innerHTML = '<span class="hw-user-icon" aria-hidden="true">' + icon + '</span>' +
        '<span class="hw-user-name">' + name + '</span>' +
        '<span class="hw-user-points">' + points + ' CP</span>';
      el.dataset.avatarType = p.avatarType || 'boy';
    });

    document.querySelectorAll('[data-player-name]').forEach((el) => { el.textContent = name; });
    document.querySelectorAll('[data-player-avatar]').forEach((el) => { el.textContent = icon; });
    document.querySelectorAll('[data-player-points]').forEach((el) => { el.textContent = String(points); });
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

  window.HWUserWidget = { refresh, render: renderProfile };

  document.addEventListener('DOMContentLoaded', refresh);
  document.addEventListener('click', function (event) {
    if (event.target.closest('[data-point-add],[data-point-spend]')) {
      setTimeout(refresh, 350);
      setTimeout(refresh, 1200);
    }
  });
})();
