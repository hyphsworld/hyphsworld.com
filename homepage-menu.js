(function () {
  'use strict';

  if (window.__HW_HOME_BOOT_V2__) return;
  window.__HW_HOME_BOOT_V2__ = true;

  var AUTH_URL = 'auth.html';
  var ACCOUNT_URL = 'account.html';
  var VIDEO_ID = 'yd4MShi6TvA';
  var WATCH_URL = 'https://youtu.be/yd4MShi6TvA?is=RczZszmIf4ifMkAj';
  var EMBED_URL = 'https://www.youtube.com/embed/' + VIDEO_ID + '?rel=0&modestbranding=1&playsinline=1';
  var TITLE_LINE = 'WEST (visual) · YOUNG TEZ & HYPH LIFE · prod by CUZ ZAID · PURE DRIP 2 available now';
  var sessionBusy = false;
  var sessionQueued = false;
  var authSubscription = null;

  function id(name) { return document.getElementById(name); }
  function one(selector) { return document.querySelector(selector); }
  function all(selector) { return Array.prototype.slice.call(document.querySelectorAll(selector)); }
  function text(el, value) { if (el) el.textContent = value; }
  function num(value) {
    var parsed = parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }
  function emailName(email) { return String(email || '').split('@')[0] || 'HYPHSWORLD ID'; }
  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function installStyles() {
    if (id('hwHomeBootStyles')) return;
    var style = document.createElement('style');
    style.id = 'hwHomeBootStyles';
    style.textContent = [
      '.hw-login-chip{display:inline-flex;align-items:center;justify-content:center;gap:10px;max-width:min(92vw,560px);padding:10px 13px;border-radius:999px;border:1px solid rgba(57,255,122,.34);background:rgba(0,0,0,.62);box-shadow:0 0 22px rgba(57,255,122,.14),0 12px 30px rgba(0,0,0,.24);color:#fff;text-align:left;vertical-align:middle}',
      '.hw-login-avatar{display:grid;place-items:center;width:38px;height:38px;border-radius:999px;background:linear-gradient(135deg,#39ff7a,#1ffcff,#ff4fd8);color:#050505;font-size:1.25rem;font-weight:1000}',
      '.hw-login-copy{display:grid;gap:2px}',
      '.hw-login-copy strong{font-size:.92rem;line-height:1;color:#fff}',
      '.hw-login-copy small{font-size:.72rem;line-height:1.2;color:#a9ff87;font-weight:800}',
      '.mobile-menu-panel{display:none}',
      '.mobile-menu-panel.is-open{display:grid}',
      '.daily-spin-nav-link{border-color:rgba(255,228,92,.42)!important;color:#ffe45c!important}',
      'body.home-page{pointer-events:auto!important;touch-action:auto!important}',
      'body.home-page .hw-transport-overlay:not(.is-live){pointer-events:none!important}',
      'body.home-page #hwGlobalPointsHud{display:none!important}'
    ].join('');
    document.head.appendChild(style);
  }

  function setLink(link, label, href) {
    if (!link) return;
    link.textContent = label;
    link.href = href;
  }

  function setAccount(signedIn) {
    var label = signedIn ? 'Manage ID' : 'Create / Login';
    var href = signedIn ? ACCOUNT_URL : AUTH_URL;
    setLink(id('auth-link'), label, href);
    setLink(id('nav-account-link'), label, href);
    setLink(id('mobile-nav-account-link'), label, href);
    var logout = id('home-logout');
    if (logout) logout.hidden = !signedIn;
  }

  function renderGuest() {
    var status = id('login-status');
    if (status) {
      status.className = 'hw-login-chip is-guest';
      status.innerHTML = '<span class="hw-login-avatar">ID</span><span class="hw-login-copy"><strong>Guest Mode</strong><small>Login to sync Cool Points</small></span>';
    }
    setAccount(false);
  }

  function renderLoading() {
    var status = id('login-status');
    if (status) {
      status.className = 'hw-login-chip is-loading';
      status.innerHTML = '<span class="hw-login-avatar">ID</span><span class="hw-login-copy"><strong>Loading HYPHSWORLD ID...</strong><small>Connecting your saved session</small></span>';
    }
  }

  function renderUser(user, points) {
    var status = id('login-status');
    var email = user && user.email || '';
    var metadata = user && user.user_metadata || {};
    var name = metadata.displayName || metadata.display_name || emailName(email);
    if (status) {
      status.className = 'hw-login-chip is-signed-in';
      status.innerHTML = '<span class="hw-login-avatar">ID</span><span class="hw-login-copy"><strong>' + escapeHtml(name) + '</strong><small>' + num(points).toLocaleString() + ' CP' + (email ? ' · ' + escapeHtml(email) : '') + '</small></span>';
    }
    setAccount(true);
  }

  async function client() {
    if (window.HWAuth && typeof window.HWAuth.getClient === 'function') {
      try { return await window.HWAuth.getClient(); } catch (error) {}
    }
    if (!window.supabase || !window.supabase.createClient) return null;
    var cfg = window.HW_SUPABASE_CONFIG || {};
    var url = cfg.url || window.HW_SUPABASE_URL;
    var key = cfg.anonKey || cfg.anon_key || window.HW_SUPABASE_ANON_KEY || window.SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    if (!window.__HW_HOME_SB__) {
      window.__HW_HOME_SB__ = window.supabase.createClient(url, key, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
    }
    return window.__HW_HOME_SB__;
  }

  function walletBalance(data) {
    if (!data) return 0;
    if (Array.isArray(data)) data = data[0] || {};
    return num(data.balance != null ? data.balance : (data.cool_points != null ? data.cool_points : data.points));
  }

  async function readPoints(sb) {
    try {
      var result = await sb.rpc('get_my_points');
      if (!result.error) return walletBalance(result.data);
    } catch (error) {}
    try {
      if (window.HWPoints && typeof window.HWPoints.getState === 'function') {
        return num((window.HWPoints.getState() || {}).points);
      }
    } catch (error) {}
    return 0;
  }

  async function refreshSession(showLoading) {
    if (sessionBusy) {
      sessionQueued = true;
      return;
    }
    sessionBusy = true;
    if (showLoading) renderLoading();
    try {
      var sb = await client();
      if (!sb || !sb.auth) {
        renderGuest();
        return;
      }
      var result = await sb.auth.getSession();
      var session = result && result.data ? result.data.session : null;
      var user = session && session.user;
      if (!user) {
        renderGuest();
        return;
      }
      renderUser(user, await readPoints(sb));
    } catch (error) {
      renderGuest();
    } finally {
      sessionBusy = false;
      if (sessionQueued) {
        sessionQueued = false;
        window.setTimeout(function () { refreshSession(false); }, 100);
      }
    }
  }

  function ensureLink(nav, href, label, className) {
    if (!nav || nav.querySelector('a[href="' + href + '"]')) return;
    var link = document.createElement('a');
    link.href = href;
    link.textContent = label;
    link.className = className || 'nav-link';
    nav.appendChild(link);
  }

  function installWest() {
    document.title = 'HYPHSWORLD | WEST Visual';
    all('a,button,span,h2,h3,h4,p,small').forEach(function (el) {
      var value = (el.textContent || '').trim();
      if (value === 'Watch 8 Minutes') text(el, 'Watch WEST');
      if (value === '8 Minutes Freestyle') text(el, 'WEST Visual');
      if (value === '8 Minutes (Freestyle)') text(el, 'WEST (visual) YOUNG TEZ & HYPH LIFE');
      if (value.indexOf('8 MINUTES FREESTYLE NOW PLAYING') >= 0) text(el, value.replace('8 MINUTES FREESTYLE NOW PLAYING', 'WEST VISUAL NOW PLAYING'));
      if (value.indexOf('Hyph Life aka Slide Drexler // 8 Minutes') >= 0) text(el, TITLE_LINE);
    });

    var frame = one('.homepage-full-episode-frame iframe');
    if (frame) {
      if (frame.src.indexOf(VIDEO_ID) < 0) frame.src = EMBED_URL;
      frame.title = 'WEST visual — Young Tez and Hyph Life — produced by Cuz Zaid';
    }
    text(one('.homepage-full-episode-strip small'), 'NOW PLAYING');
    text(one('.homepage-full-episode-strip span'), TITLE_LINE);

    all('a[href*="aZlYN1RyHLc"]').forEach(function (link) {
      if ((link.textContent || '').toLowerCase().indexOf('watch') >= 0) link.href = WATCH_URL;
    });

    [one('.main-nav'), id('mobile-menu-panel')].forEach(function (nav) {
      ensureLink(nav, 'shop.html', 'Merch', 'nav-link merch-nav-link');
      ensureLink(nav, 'daily-wheel.html', 'Daily Spin', 'nav-link daily-spin-nav-link');
    });
  }

  function bindMenu() {
    var year = id('year');
    if (year) year.textContent = new Date().getFullYear();

    var toggle = one('.mobile-menu-toggle');
    var panel = id('mobile-menu-panel');
    if (toggle && panel && !toggle.__hwBound) {
      toggle.__hwBound = true;
      toggle.addEventListener('click', function () {
        var open = panel.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        toggle.textContent = open ? 'Menu ▲' : 'Menu ▼';
      });
    }

    var logout = id('home-logout');
    if (logout && !logout.__hwBound) {
      logout.__hwBound = true;
      logout.addEventListener('click', async function () {
        logout.disabled = true;
        try {
          var sb = await client();
          if (sb && sb.auth) await sb.auth.signOut();
        } catch (error) {}
        renderGuest();
        logout.disabled = false;
      });
    }
  }

  async function watchAuth() {
    if (authSubscription) return;
    var sb = await client();
    if (!sb || !sb.auth || typeof sb.auth.onAuthStateChange !== 'function') return;
    var listener = sb.auth.onAuthStateChange(function (event) {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
        window.setTimeout(function () { refreshSession(false); }, 0);
      }
    });
    authSubscription = listener && listener.data ? listener.data.subscription : true;
  }

  function keepDuckClear() {
    var duck = id('duckBox');
    var strip = one('.homepage-full-episode-strip');
    var frame = one('.homepage-full-episode-frame');
    if (!duck || !strip || !frame) return;
    var duckRect = duck.getBoundingClientRect();
    var stripRect = strip.getBoundingClientRect();
    var overlaps = duckRect.left < stripRect.right && duckRect.right > stripRect.left &&
      duckRect.top < stripRect.bottom && duckRect.bottom > stripRect.top;
    if (!overlaps) return;
    var frameRect = frame.getBoundingClientRect();
    var nextLeft = Math.max(8, Math.min(window.innerWidth - duck.offsetWidth - 12, frameRect.right - duck.offsetWidth - 14));
    var nextTop = Math.max(8, Math.min(window.innerHeight - duck.offsetHeight - 12, frameRect.top + 54));
    duck.style.left = Math.round(nextLeft) + 'px';
    duck.style.top = Math.round(nextTop) + 'px';
    duck.style.bottom = 'auto';
  }

  function loadDeferredSystems() {
    var queue = Array.isArray(window.HW_HOME_DEFERRED_SCRIPTS) ? window.HW_HOME_DEFERRED_SCRIPTS.slice() : [];
    function next() {
      var src = queue.shift();
      if (!src) return;
      if (Array.prototype.some.call(document.scripts, function (script) { return script.src && script.src.indexOf(src.split('?')[0]) >= 0; })) {
        window.setTimeout(next, 350);
        return;
      }
      var script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = script.onerror = function () { window.setTimeout(next, 350); };
      document.body.appendChild(script);
    }
    window.setTimeout(next, 1400);
  }

  function boot() {
    installStyles();
    installWest();
    bindMenu();
    refreshSession(true);
    watchAuth();
    loadDeferredSystems();
    window.setTimeout(keepDuckClear, 900);
    window.setTimeout(keepDuckClear, 1800);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();

  window.addEventListener('pageshow', function (event) {
    if (event.persisted) refreshSession(false);
    window.setTimeout(keepDuckClear, 150);
  });
  window.addEventListener('resize', function () { window.setTimeout(keepDuckClear, 100); });
})();
