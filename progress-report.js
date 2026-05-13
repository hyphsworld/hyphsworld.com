(function () {
  'use strict';

  var FALLBACK_BADGES = [
    { id: 'signal_found', name: 'Signal Found', description: 'Entered the Hyphsworld grid.', threshold: 100, icon: '📡' },
    { id: 'gate_runner', name: 'Gate Runner', description: 'Unlocked movement through the digital gates.', threshold: 500, icon: '🚧' },
    { id: 'neon_regular', name: 'Neon Regular', description: 'Certified presence in the Hyphsworld zone.', threshold: 1000, icon: '🛹' },
    { id: 'grid_captain', name: 'Grid Captain', description: 'High activity detected across the system.', threshold: 2500, icon: '🧢' },
    { id: 'world_builder', name: 'World Builder', description: 'Helped power the next layer of Hyphsworld.', threshold: 5000, icon: '🌍' },
    { id: 'chrome_legend', name: 'Chrome Legend', description: 'Maximum aura. Permanent system status.', threshold: 10000, icon: '💎' }
  ];

  function readStorage(key) {
    try { return localStorage.getItem(key) || sessionStorage.getItem(key); }
    catch (error) { return null; }
  }

  function fallbackPoints() {
    return ['hyphsworld.coolPoints.total', 'hyphsworld.coolPoints.guestSession', 'coolPoints'].reduce(function (max, key) {
      var value = parseInt(readStorage(key) || '0', 10) || 0;
      return Math.max(max, value);
    }, 0);
  }

  async function getPoints() {
    if (window.HWPoints && typeof window.HWPoints.refresh === 'function') {
      try {
        await window.HWPoints.refresh();
        return window.HWPoints.get();
      } catch (error) {}
    }
    return fallbackPoints();
  }

  function fallbackState(points) {
    var total = Math.max(0, parseInt(points, 10) || 0);
    var unlocked = FALLBACK_BADGES.filter(function (badge) { return total >= badge.threshold; });
    var current = unlocked.length ? unlocked[unlocked.length - 1] : null;
    var next = FALLBACK_BADGES.find(function (badge) { return total < badge.threshold; }) || null;
    var previousThreshold = current ? current.threshold : 0;
    var nextThreshold = next ? next.threshold : previousThreshold;
    var progress = next ? Math.round(((total - previousThreshold) / Math.max(1, nextThreshold - previousThreshold)) * 100) : 100;

    return {
      points: total,
      badges: FALLBACK_BADGES.slice(),
      unlocked: unlocked,
      current: current,
      next: next,
      progress: Math.max(0, Math.min(100, progress)),
      needed: next ? Math.max(0, next.threshold - total) : 0
    };
  }

  function renderFallback(root, progressState) {
    var current = progressState.current;
    var next = progressState.next;

    root.innerHTML = '' +
      '<div class="hyf-progress-hud">' +
        '<div class="hud-scanline"></div>' +
        '<div class="hud-header"><span>HYF CORE</span><span>PROGRESS ONLINE</span></div>' +
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
  }

  async function render(root) {
    if (!root) return;
    var total = await getPoints();
    var progressState;

    if (window.HWCoolBadges && typeof window.HWCoolBadges.renderInto === 'function') {
      progressState = window.HWCoolBadges.renderInto(root, total);
    } else {
      progressState = fallbackState(total);
      renderFallback(root, progressState);
    }

    if (window.HWCoolBadges && typeof window.HWCoolBadges.rememberUnlocks === 'function') {
      var fresh = window.HWCoolBadges.rememberUnlocks(progressState) || [];
      if (fresh.length && typeof window.HWCoolBadges.showUnlockToast === 'function') {
        window.HWCoolBadges.showUnlockToast(fresh[fresh.length - 1]);
      }
    }
  }

  function init() {
    var reports = Array.prototype.slice.call(document.querySelectorAll('[data-hw-progress-report]'));
    if (!reports.length) return;

    function refreshAll() {
      reports.forEach(function (root) { render(root); });
    }

    refreshAll();
    document.addEventListener('hyph:points-updated', refreshAll);
    window.setInterval(refreshAll, 10000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
