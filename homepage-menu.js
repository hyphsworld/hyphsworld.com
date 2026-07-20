(function () {
  'use strict';

  var AUTH_URL = 'auth.html';
  var ACCOUNT_URL = 'account.html';

  function $(selector) { return document.querySelector(selector); }
  function all(selector) { return Array.prototype.slice.call(document.querySelectorAll(selector)); }
  function id(name) { return document.getElementById(name); }
  function text(el, value) { if (el) el.textContent = value; }
  function num(value) { var parsed = parseInt(value, 10); return Number.isFinite(parsed) && parsed > 0 ? parsed : 0; }
  function emailName(email) { return String(email || '').split('@')[0] || 'HYPHSWORLD ID'; }
  function escapeHtml(value) {
    return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function loadOnce(idValue, src) {
    if (document.getElementById(idValue)) return;
    var s = document.createElement('script');
    s.id = idValue;
    s.src = src;
    s.defer = true;
    document.head.appendChild(s);
  }

  function installStyles() {
    if (id('hwConsumerFixStyles')) return;
    var style = document.createElement('style');
    style.id = 'hwConsumerFixStyles';
    style.textContent = '.hw-login-chip{display:inline-flex;align-items:center;justify-content:center;gap:10px;max-width:min(92vw,560px);padding:10px 13px;border-radius:999px;border:1px solid rgba(57,255,122,.34);background:rgba(0,0,0,.62);box-shadow:0 0 22px rgba(57,255,122,.14),0 12px 30px rgba(0,0,0,.24);color:#fff;text-align:left;vertical-align:middle}.hw-login-avatar{display:grid;place-items:center;width:38px;height:38px;border-radius:999px;background:linear-gradient(135deg,#39ff7a,#1ffcff,#ff4fd8);color:#050505;font-size:1.25rem;font-weight:1000}.hw-login-copy{display:grid;gap:2px}.hw-login-copy strong{font-size:.92rem;line-height:1;color:#fff}.hw-login-copy small{font-size:.72rem;line-height:1.2;color:#a9ff87;font-weight:800}.mobile-menu-panel{display:none}.mobile-menu-panel.is-open{display:grid}.daily-spin-nav-link{border-color:rgba(255,228,92,.42)!important;color:#ffe45c!important}body.home-page #hwGlobalPointsHud{display:none!important}';
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
      status.innerHTML = '<span class="hw-login-avatar">ID</span><span class="hw-login-copy"><strong>Guest Mode</strong><small>Use one ID to sync Cool Points</small></span>';
    }
    setAccount(false);
  }

  function renderLoading() {
    var status = id('login-status');
    if (status) {
      status.className = 'hw-login-chip is-loading';
      status.innerHTML = '<span class="hw-login-avatar">ID</span><span class="hw-login-copy"><strong>Loading HYPHSWORLD ID...</strong><small>Checking saved session</small></span>';
    }
  }

  function renderUser(user, points) {
    var status = id('login-status');
    var email = user && user.email || '';
    var name = user && user.user_metadata && user.user_metadata.displayName || emailName(email);
    if (status) {
      status.className = 'hw-login-chip is-signed-in';
      status.innerHTML = '<span class="hw-login-avatar">ID</span><span class="hw-login-copy"><strong>' + escapeHtml(name) + '</strong><small>' + num(points).toLocaleString() + ' CP' + (email ? ' - ' + escapeHtml(email) : '') + '</small></span>';
    }
    setAccount(true);
  }

  async function client() {
    if (window.HWAuth && window.HWAuth.getClient) {
      try { return await window.HWAuth.getClient(); } catch (e) {}
    }
    if (!window.supabase || !window.supabase.createClient) return null;
    var cfg = window.HW_SUPABASE_CONFIG || {};
    var url = cfg.url || window.HW_SUPABASE_URL;
    var key = cfg.anonKey || cfg.anon_key || window.HW_SUPABASE_ANON_KEY || window.SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    window.__HW_CONSUMER_SB__ = window.__HW_CONSUMER_SB__ || window.supabase.createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
    return window.__HW_CONSUMER_SB__;
  }

  async function refreshSession() {
    installStyles();
    renderLoading();
    try {
      var sb = await client();
      if (!sb || !sb.auth) { renderGuest(); return; }
      var sessionResult = await sb.auth.getSession();
      var session = sessionResult && sessionResult.data ? sessionResult.data.session : null;
      var user = session && session.user;
      if (!user) { renderGuest(); return; }
      var points = 0;
      try {
        var wallet = await sb.rpc('get_my_points');
        if (!wallet.error && wallet.data) points = wallet.data.balance || wallet.data.cool_points || wallet.data.points || 0;
      } catch (e) {}
      renderUser(user, points);
    } catch (e) {
      renderGuest();
    }
  }

  function ensureLink(nav, href, label, className) {
    if (!nav || nav.querySelector('a[href="' + href + '"]')) return;
    var a = document.createElement('a');
    a.href = href;
    a.textContent = label;
    a.className = className || 'nav-link';
    nav.appendChild(a);
  }

  function fixLabels() {
    document.title = 'HYPHSWORLD | WEST Visual';
    all('a,button,span,h2,h3,h4,p,small').forEach(function (el) {
      var t = (el.textContent || '').trim();
      if (t === 'Watch 8 Minutes') text(el, 'Watch WEST');
      if (t === '8 Minutes Freestyle') text(el, 'WEST Visual');
      if (t === '8 Minutes (Freestyle)') text(el, 'WEST (visual) YOUNG TEZ & HYPH LIFE prod by CUZ ZAID');
      if (t.indexOf('8 MINUTES FREESTYLE NOW PLAYING') >= 0) text(el, 'WEST VISUAL NOW PLAYING');
      if (t.indexOf('Hyph Life aka Slide Drexler // 8 Minutes') >= 0) text(el, 'WEST (visual) YOUNG TEZ & HYPH LIFE prod by CUZ ZAID - PURE DRIP 2 available now');
    });
    var topFrame = $('.homepage-full-episode-frame iframe');
    if (topFrame && topFrame.src.indexOf('yd4MShi6TvA') < 0) {
      topFrame.src = 'https://www.youtube.com/embed/yd4MShi6TvA?rel=0&modestbranding=1';
      topFrame.title = 'WEST visual - Young Tez and Hyph Life produced by Cuz Zaid';
    }
    var strip = $('.homepage-full-episode-strip span');
    text(strip, 'WEST (visual) YOUNG TEZ & HYPH LIFE prod by CUZ ZAID - PURE DRIP 2 available now');
    var small = $('.homepage-full-episode-strip small');
    text(small, 'NOW PLAYING');
    [$('.main-nav'), id('mobile-menu-panel')].forEach(function (nav) {
      ensureLink(nav, 'shop.html', 'Merch', 'nav-link merch-nav-link');
      ensureLink(nav, 'daily-wheel.html', 'Daily Spin', 'nav-link daily-spin-nav-link');
    });
  }

  function bindMenu() {
    var year = id('year');
    if (year) year.textContent = new Date().getFullYear();
    var toggle = $('.mobile-menu-toggle');
    var panel = id('mobile-menu-panel');
    if (toggle && panel && !toggle.__hwBound) {
      toggle.__hwBound = true;
      toggle.addEventListener('click', function () {
        var open = panel.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        toggle.textContent = open ? 'Menu up' : 'Menu down';
      });
    }
    var logout = id('home-logout');
    if (logout && !logout.__hwBound) {
      logout.__hwBound = true;
      logout.addEventListener('click', async function () {
        try {
          var sb = await client();
          if (sb && sb.auth) await sb.auth.signOut();
        } catch (e) {}
        renderGuest();
      });
    }
  }

  function boot() {
    installStyles();
    loadOnce('hw-auth-stability-loader-direct', 'auth-stability.js?v=20260719-consumer-fix');
    loadOnce('hw-homepage-session-fix-loader-direct', 'homepage-session-fix.js?v=20260719-consumer-fix');
    fixLabels();
    bindMenu();
    refreshSession();
    setTimeout(refreshSession, 900);
    setTimeout(refreshSession, 2500);
    setTimeout(fixLabels, 500);
    setTimeout(fixLabels, 1800);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  window.addEventListener('focus', refreshSession);
  window.addEventListener('storage', refreshSession);
  document.addEventListener('hyph:points-updated', refreshSession);
  window.addEventListener('hw:points-change', refreshSession);
})();
