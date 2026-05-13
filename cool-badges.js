(function () {
  'use strict';

  var BADGES = [
    { id: 'signal_found', name: 'Signal Found', description: 'Entered the Hyphsworld grid.', threshold: 100, icon: '📡' },
    { id: 'gate_runner', name: 'Gate Runner', description: 'Unlocked movement through the digital gates.', threshold: 500, icon: '🚧' },
    { id: 'neon_regular', name: 'Neon Regular', description: 'Certified presence in the Hyphsworld zone.', threshold: 1000, icon: '🛹' },
    { id: 'grid_captain', name: 'Grid Captain', description: 'High activity detected across the system.', threshold: 2500, icon: '🧢' },
    { id: 'world_builder', name: 'World Builder', description: 'Helped power the next layer of Hyphsworld.', threshold: 5000, icon: '🌍' },
    { id: 'chrome_legend', name: 'Chrome Legend', description: 'Maximum aura. Permanent system status.', threshold: 10000, icon: '💎' }
  ];

  function cleanPoints(value) {
    var parsed = parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }

  function state(points) {
    var total = cleanPoints(points);
    var unlocked = BADGES.filter(function (badge) { return total >= badge.threshold; });
    var next = BADGES.find(function (badge) { return total < badge.threshold; }) || null;
    var current = unlocked.length ? unlocked[unlocked.length - 1] : null;
    var previousThreshold = current ? current.threshold : 0;
    var nextThreshold = next ? next.threshold : previousThreshold;
    var progress = next ? Math.round(((total - previousThreshold) / Math.max(1, nextThreshold - previousThreshold)) * 100) : 100;

    return {
      points: total,
      badges: BADGES.slice(),
      unlocked: unlocked,
      current: current,
      next: next,
      progress: Math.max(0, Math.min(100, progress)),
      needed: next ? Math.max(0, next.threshold - total) : 0
    };
  }

  function rememberUnlocks(progressState) {
    var key = 'hyphsworld.coolBadges.unlocked';
    var previous = [];
    try { previous = JSON.parse(localStorage.getItem(key) || '[]'); } catch (error) { previous = []; }

    var currentIds = progressState.unlocked.map(function (badge) { return badge.id; });
    var fresh = progressState.unlocked.filter(function (badge) { return previous.indexOf(badge.id) === -1; });

    try { localStorage.setItem(key, JSON.stringify(currentIds)); } catch (error) {}
    return fresh;
  }

  function showUnlockToast(badge) {
    if (!badge || !document.body) return;

    var toast = document.getElementById('badgeUnlockToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'badgeUnlockToast';
      toast.className = 'badge-unlock-toast';
      toast.innerHTML = '<span class="badge-unlock-icon"></span><div><strong>BADGE UNLOCKED</strong><p></p></div>';
      document.body.appendChild(toast);
    }

    var icon = toast.querySelector('.badge-unlock-icon');
    var name = toast.querySelector('p');
    if (icon) icon.textContent = badge.icon;
    if (name) name.textContent = badge.name;
    toast.hidden = false;
    toast.classList.add('is-visible');

    clearTimeout(window.__hyphBadgeToastTimer);
    window.__hyphBadgeToastTimer = setTimeout(function () {
      toast.classList.remove('is-visible');
    }, 3200);
  }

  function renderInto(root, points) {
    if (!root) return null;
    var progressState = state(points);
    var current = progressState.current;
    var next = progressState.next;

    root.innerHTML = '' +
      '<div class="hyf-progress-hud">' +
        '<div class="hud-scanline"></div>' +
        '<div class="hud-header"><span>HYF CORE</span><span>' + (window.HWPoints && window.HWPoints.isAccountBacked && window.HWPoints.isAccountBacked() ? 'ACCOUNT SAVED' : 'GUEST PREVIEW') + '</span></div>' +
        '<div class="hud-main">' +
          '<p class="hud-label">Cool Points Balance</p>' +
          '<h2>' + progressState.points.toLocaleString() + '</h2>' +
          '<p class="hud-current-badge">' + (current ? current.icon + ' ' + current.name : 'No badge detected') + '</p>' +
        '</div>' +
        '<div class="hud-progress-row"><span>' + (next ? 'Next Badge: ' + next.name : 'Badge Grid Complete') + '</span><span>' + progressState.progress + '%</span></div>' +
        '<div class="hud-progress-track"><div class="hud-progress-fill" style="width:' + progressState.progress + '%"></div></div>' +
        '<p class="hud-next-copy">' + (next ? progressState.needed.toLocaleString() + ' points until ' + next.name : 'All badges unlocked. Chrome legend status online.') + '</p>' +
        '<div class="hud-badge-grid">' +
          progressState.badges.map(function (badge) {
            var unlocked = progressState.points >= badge.threshold;
            return '<article class="cool-badge ' + (unlocked ? 'is-unlocked' : 'is-locked') + '">' +
              '<div class="cool-badge-icon">' + (unlocked ? badge.icon : '🔒') + '</div>' +
              '<h3>' + badge.name + '</h3>' +
              '<p>' + badge.description + '</p>' +
              '<small>' + badge.threshold.toLocaleString() + ' pts</small>' +
            '</article>';
          }).join('') +
        '</div>' +
      '</div>';

    return progressState;
  }

  window.HWCoolBadges = {
    all: function () { return BADGES.slice(); },
    state: state,
    renderInto: renderInto,
    rememberUnlocks: rememberUnlocks,
    showUnlockToast: showUnlockToast
  };
})();
