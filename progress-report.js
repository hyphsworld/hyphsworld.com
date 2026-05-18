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

  var rendering = false;
  var lastRenderAt = 0;

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

  async function getPoints(options) {
    var shouldRefresh = options && options.refresh === true;
    if (window.HWPoints) {
      try {
        if (shouldRefresh && typeof window.HWPoints.refresh === 'function') await window.HWPoints.refresh();
        if (typeof window.HWPoints.get === 'function') return window.HWPoints.get();
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
    return { points: total, badges: FALLBACK_BADGES.slice(), unlocked: unlocked, current: current, next: next, progress: Math.max(0, Math.min(100, progress)), needed: next ? Math.max(0, next.threshold - total) : 0 };
  }

  function stat(label, value) {
    return '<article class="profile-stat"><span>' + label + '</span><strong>' + value + '</strong></article>';
  }

  function renderFallback(root, progressState) {
    var current = progressState.current;
    var next = progressState.next;
    var rank = current ? current.name : 'Signal Seeker';
    var inventory = progressState.unlocked.length ? progressState.unlocked : [{ icon: '🔑', name: 'Starter Key', threshold: 0 }, { icon: '🟢', name: 'Crew Ready Badge', threshold: 0 }];

    root.innerHTML = '' +
      '<div class="hyf-progress-hud hyf-profile-layout">' +
        '<div class="hud-scanline"></div>' +
        '<div class="profile-topline"><span>Player Profile</span><a href="games.html">Play Casino</a></div>' +
        '<h2 class="profile-rank">' + rank + '</h2>' +
        '<div class="hud-progress-track profile-track"><div class="hud-progress-fill" style="width:' + progressState.progress + '%"></div></div>' +
        '<p class="hud-next-copy profile-next">' + (next ? 'Next rank: ' + next.name + ' needs ' + progressState.needed.toLocaleString() + ' CP.' : 'All ranks unlocked. Chrome legend status online.') + '</p>' +
        '<div class="profile-stat-grid">' +
          stat('Cool Points', progressState.points.toLocaleString()) +
          stat('Rank', rank) +
          stat('Progress', progressState.progress + '%') +
          stat('Unlocked', progressState.unlocked.length.toLocaleString()) +
          stat('Next CP', next ? next.threshold.toLocaleString() : 'MAX') +
          stat('Tier', current ? 'Active' : 'Free Play') +
        '</div>' +
        '<div class="profile-inventory"><h3>Inventory</h3><div class="profile-chip-row">' +
          inventory.map(function (badge) { return '<span class="profile-chip">' + badge.icon + ' ' + badge.name + ' x1</span>'; }).join('') +
        '</div></div>' +
        '<div class="profile-prize-card"><span>Reward Points</span><strong>' + progressState.points.toLocaleString() + ' / 100,000</strong><p>Member rewards require HYPHSWORLD ID access.</p><a href="account.html">Manage Rewards</a></div>' +
      '</div>';
  }

  async function render(root, options) {
    if (!root) return;
    var total = await getPoints(options || {});
    var progressState = fallbackState(total);
    renderFallback(root, progressState);
    if (options && options.checkUnlocks && window.HWCoolBadges && typeof window.HWCoolBadges.rememberUnlocks === 'function') {
      var fresh = window.HWCoolBadges.rememberUnlocks(progressState) || [];
      if (fresh.length && typeof window.HWCoolBadges.showUnlockToast === 'function') window.HWCoolBadges.showUnlockToast(fresh[fresh.length - 1]);
    }
  }

  function init() {
    var reports = Array.prototype.slice.call(document.querySelectorAll('[data-hw-progress-report]'));
    if (!reports.length) return;
    async function refreshAll(options) {
      var now = Date.now();
      var opts = options || {};
      if (rendering) return;
      if (!opts.force && now - lastRenderAt < 700) return;
      rendering = true;
      lastRenderAt = now;
      try { for (var i = 0; i < reports.length; i += 1) await render(reports[i], opts); }
      finally { rendering = false; }
    }
    refreshAll({ refresh: true, checkUnlocks: true, force: true });
    document.addEventListener('hyph:points-updated', function () { refreshAll({ refresh: false, checkUnlocks: true }); });
    window.setInterval(function () { refreshAll({ refresh: true, checkUnlocks: false }); }, 60000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
