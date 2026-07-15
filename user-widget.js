/* HYPHSWORLD inline user display compatibility.
   Floating Cool Points HUD is owned only by global-points-engine.js. */
(function () {
  'use strict';

  function number(value) {
    var parsed = parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }

  function getState() {
    try {
      if (window.HWPoints && typeof window.HWPoints.getState === 'function') return window.HWPoints.getState() || {};
    } catch (error) {}
    return {};
  }

  function render(profile) {
    var state = getState();
    var p = profile || state.profile || state.user || {};
    var name = p.displayName || p.display_name || p.username || (state.accountBacked ? 'HYPHSWORLD ID' : 'Guest');
    var icon = p.avatarIcon || p.avatar_icon || state.avatarIcon || '🧢';
    var points = number(state.points != null ? state.points : (p.coolPoints != null ? p.coolPoints : p.points));

    document.querySelectorAll('[data-user-widget]').forEach(function (el) {
      el.innerHTML = '<span class="hw-user-icon" aria-hidden="true">' + icon + '</span>' +
        '<span class="hw-user-name">' + name + '</span>' +
        '<span class="hw-user-points">' + points.toLocaleString() + ' CP</span>';
    });
    document.querySelectorAll('[data-player-name]').forEach(function (el) { el.textContent = name; });
    document.querySelectorAll('[data-player-avatar]').forEach(function (el) { el.textContent = icon; });
    document.querySelectorAll('[data-player-points]').forEach(function (el) { el.textContent = points.toLocaleString(); });
  }

  async function refresh() {
    var profile = null;
    try {
      if (window.HWAuth && typeof window.HWAuth.getCurrentUser === 'function') profile = await window.HWAuth.getCurrentUser();
    } catch (error) {}
    render(profile);
    return profile;
  }

  var oldHud = document.getElementById('hw-gta-hud');
  if (oldHud) oldHud.remove();

  window.HWUserWidget = { refresh: refresh, render: render, getPoints: function () { return number(getState().points); } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', refresh);
  else refresh();
  window.addEventListener('hw:points-change', function (event) { render(event && event.detail); });
})();
