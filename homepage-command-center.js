(function () {
  'use strict';

  var STREAK_KEY = 'hyphsworld.dashboard.streak';
  var RECENT_KEY = 'hyphsworld.dashboard.recent';
  var CONTINUE_KEY = 'hyphsworld.dashboard.continueHref';
  var SAFE_ROUTES = ['games.html', 'vault.html', 'shop.html', 'app-player.html', 'leaderboard.html', 'wall-of-fame.html', 'account.html'];
  var LEVELS = [
    { points: 100, name: 'Signal Found' }, { points: 500, name: 'Gate Runner' },
    { points: 1000, name: 'Neon Regular' }, { points: 2500, name: 'Grid Captain' },
    { points: 5000, name: 'World Builder' }, { points: 10000, name: 'Chrome Legend' },
    { points: 10600, name: 'Backpack Reward — While supplies last' }
  ];

  function storageGet(key) { try { return localStorage.getItem(key); } catch (error) { return null; } }
  function storageSet(key, value) { try { localStorage.setItem(key, value); } catch (error) {} }
  function parse(value, fallback) { try { return JSON.parse(value); } catch (error) { return fallback; } }
  function text(selector, value) { document.querySelectorAll(selector).forEach(function (el) { el.textContent = value; }); }
  function cleanPoints(value) { var n = Number(value || 0); return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0; }
  function dateKey(offset) { var d = new Date(); d.setDate(d.getDate() + (offset || 0)); return d.toISOString().slice(0, 10); }

  function updateStreak(isLoggedIn) {
    if (!isLoggedIn) return '—';
    var saved = parse(storageGet(STREAK_KEY), {});
    var today = dateKey(0);
    if (saved.date !== today) saved = { date: today, count: saved.date === dateKey(-1) ? Math.max(1, Number(saved.count) + 1) : 1 };
    storageSet(STREAK_KEY, JSON.stringify(saved));
    return String(saved.count || 1) + ' day' + ((saved.count || 1) === 1 ? '' : 's');
  }

  function nextLevel(points) {
    var next = LEVELS.find(function (level) { return points < level.points; });
    var previous = 0;
    LEVELS.forEach(function (level) { if (level.points <= points) previous = level.points; });
    if (!next) return { name: 'All rewards unlocked', needed: 0, progress: 100 };
    return { name: next.name, needed: next.points - points, progress: Math.round(((points - previous) / Math.max(1, next.points - previous)) * 100) };
  }

  function safeContinue() {
    var saved = storageGet(CONTINUE_KEY) || 'games.html';
    return SAFE_ROUTES.indexOf(saved) !== -1 ? saved : 'games.html';
  }

  function render(snapshot) {
    var state = snapshot || (window.HWPoints && window.HWPoints.getState ? window.HWPoints.getState() : {});
    var loggedIn = Boolean(state.user || state.accountBacked);
    var profile = state.profile || state.user || {};
    var points = loggedIn ? cleanPoints(state.points) : 0;
    var name = profile.display_name || profile.displayName || profile.username || (profile.email ? String(profile.email).split('@')[0] : '') || 'HYPHSWORLD Guest';
    var avatar = state.avatarIcon || profile.avatar_icon || profile.avatarIcon || '🧢';
    var rank = loggedIn ? (state.rankTitle || profile.rank_title || 'Lobby Rookie') : 'Login Required';
    var next = nextLevel(points);
    var recent = storageGet(RECENT_KEY) || 'Homepage';
    text('[data-home-id-avatar]', avatar);
    text('[data-home-id-state]', loggedIn ? 'HYPHSWORLD ID // LIVE' : 'GUEST MODE');
    text('[data-home-id-name]', name);
    text('[data-home-id-points]', points.toLocaleString());
    text('[data-home-id-rank]', rank);
    text('[data-home-id-streak]', updateStreak(loggedIn));
    text('[data-home-id-recent]', recent);
    text('[data-home-id-next]', loggedIn ? 'Next unlock: ' + next.name : 'Login to start earning');
    text('[data-home-id-needed]', loggedIn ? next.needed.toLocaleString() + ' CP' : '0 CP');
    document.querySelectorAll('[data-home-id-fill]').forEach(function (el) { el.style.width = (loggedIn ? next.progress : 0) + '%'; });
    document.querySelectorAll('[data-home-id-manage]').forEach(function (el) { el.textContent = loggedIn ? 'Manage ID' : 'Login / Create ID'; el.href = loggedIn ? 'account.html' : 'auth.html'; });
    document.querySelectorAll('[data-home-id-continue]').forEach(function (el) { el.href = safeContinue(); el.textContent = loggedIn ? 'Continue in HYPHSWORLD →' : 'Enter HYPHSWORLD →'; });
  }

  function recordActivity(label, href) {
    if (label) storageSet(RECENT_KEY, String(label).trim().slice(0, 30));
    if (SAFE_ROUTES.indexOf(href) !== -1) storageSet(CONTINUE_KEY, href);
  }

  document.addEventListener('click', function (event) {
    var link = event.target.closest('a[href]');
    if (!link) return;
    var href = link.getAttribute('href') || '';
    if (SAFE_ROUTES.indexOf(href) !== -1) recordActivity(link.textContent, href);
  }, { passive: true });
  window.addEventListener('hw:points-ready', function (event) { render(event.detail); });
  window.addEventListener('hw:points-change', function (event) { render(event.detail); });
  document.addEventListener('hyph:auth-signed-in', function () { if (window.HWPoints && window.HWPoints.refresh) window.HWPoints.refresh().then(render); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render, { once: true }); else render();
})();
