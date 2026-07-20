(function () {
  'use strict';

  if (window.__HW_HOME_SESSION_SAFE__) return;
  window.__HW_HOME_SESSION_SAFE__ = true;

  function el(id) { return document.getElementById(id); }
  function n(value) {
    var parsed = parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }
  function set(id, value) {
    var node = el(id);
    if (node) node.textContent = value;
  }
  function simpleName(email) {
    var text = String(email || '');
    var at = text.indexOf('@');
    return at > 0 ? text.slice(0, at) : (text || 'HYPHSWORLD ID');
  }
  function setLink(loggedIn) {
    var link = el('auth-link');
    if (link) {
      link.textContent = loggedIn ? 'Manage ID' : 'Create / Login';
      link.href = loggedIn ? 'account.html' : 'auth.html';
      link.hidden = false;
    }
    var nav = el('nav-account-link');
    if (nav) {
      nav.textContent = loggedIn ? 'Manage ID' : 'Create ID';
      nav.href = loggedIn ? 'account.html' : 'auth.html';
    }
    var mobile = el('mobile-nav-account-link');
    if (mobile) {
      mobile.textContent = loggedIn ? 'Manage ID' : 'Create ID';
      mobile.href = loggedIn ? 'account.html' : 'auth.html';
    }
    var logout = el('home-logout');
    if (logout) logout.hidden = !loggedIn;
  }
  function setGuest() {
    set('login-status', 'Guest Mode');
    setLink(false);
  }
  async function client() {
    if (window.HWAuth && window.HWAuth.getClient) {
      try { return await window.HWAuth.getClient(); } catch (error) {}
    }
    if (!window.supabase || !window.supabase.createClient) return null;
    var cfg = window.HW_SUPABASE_CONFIG || {};
    var url = cfg.url || window.HW_SUPABASE_URL;
    var key = cfg.anonKey || cfg.anon_key || window.HW_SUPABASE_ANON_KEY || window.SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    window.__HW_SAFE_SB__ = window.__HW_SAFE_SB__ || window.supabase.createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
    return window.__HW_SAFE_SB__;
  }
  async function refresh() {
    set('login-status', 'Loading HYPHSWORLD ID...');
    try {
      var sb = await client();
      if (!sb || !sb.auth) { setGuest(); return; }
      var sessionResult = await sb.auth.getSession();
      var session = sessionResult && sessionResult.data ? sessionResult.data.session : null;
      var user = session && session.user ? session.user : null;
      if (!user) { setGuest(); return; }
      var points = 0;
      try {
        var wallet = await sb.rpc('get_my_points');
        if (!wallet.error && wallet.data) points = wallet.data.balance || wallet.data.cool_points || wallet.data.points || 0;
      } catch (error) {}
      set('login-status', simpleName(user.email) + ' - ' + n(points) + ' CP');
      setLink(true);
    } catch (error) {
      setGuest();
    }
  }
  function fixWestText() {
    document.querySelectorAll('a,span,h2,h3,h4,p,small').forEach(function (node) {
      var text = (node.textContent || '').trim();
      if (text === 'Watch 8 Minutes') node.textContent = 'Watch WEST';
      if (text === '8 Minutes Freestyle') node.textContent = 'WEST Visual';
      if (text === '8 Minutes (Freestyle)') node.textContent = 'WEST (visual)';
      if (text.indexOf('8 MINUTES FREESTYLE') >= 0) node.textContent = text.replace('8 MINUTES FREESTYLE NOW PLAYING', 'WEST VISUAL NOW PLAYING');
      if (text.indexOf('Hyph Life aka Slide Drexler // 8 Minutes') >= 0) node.textContent = 'WEST (visual) YOUNG TEZ & HYPH LIFE prod by CUZ ZAID - PURE DRIP 2 available now';
    });
    var frame = document.querySelector('.homepage-full-episode-frame iframe');
    if (frame && frame.src.indexOf('yd4MShi6TvA') < 0) {
      frame.src = 'https://www.youtube.com/embed/yd4MShi6TvA?rel=0&modestbranding=1';
      frame.title = 'WEST visual Young Tez and Hyph Life prod by Cuz Zaid';
    }
  }
  function boot() {
    fixWestText();
    refresh();
    setTimeout(fixWestText, 700);
    setTimeout(refresh, 1200);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  window.addEventListener('focus', refresh);
})();
