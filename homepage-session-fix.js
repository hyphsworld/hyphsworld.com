(function () {
  'use strict';

  if (window.__HW_HOME_SESSION_FIX_V2__) return;
  window.__HW_HOME_SESSION_FIX_V2__ = true;

  function byId(id) { return document.getElementById(id); }
  function setText(id, value) { var el = byId(id); if (el) el.textContent = value; }
  function n(value) { var parsed = parseInt(value, 10); return Number.isFinite(parsed) && parsed > 0 ? parsed : 0; }
  function nameFromEmail(email) { return String(email || '').split('@')[0] || 'HYPHSWORLD ID'; }

  function setLoading() {
    setText('login-status', 'Loading HYPHSWORLD ID...');
    var link = byId('auth-link');
    if (link) { link.textContent = 'Create / Login'; link.href = 'auth.html'; link.hidden = false; }
  }

  function showLoggedOut() {
    setText('login-status', 'Guest Mode');
    var link = byId('auth-link');
    if (link) { link.textContent = 'Create / Login'; link.href = 'auth.html'; link.hidden = false; }
    var logout = byId('home-logout');
    if (logout) logout.hidden = true;
  }

  function showLoggedIn(user, points) {
    var label = (user && (user.user_metadata && user.user_metadata.displayName || user.email)) || 'HYPHSWORLD ID';
    setText('login-status', nameFromEmail(label) + ' - ' + n(points) + ' CP');
    var link = byId('auth-link');
    if (link) { link.textContent = 'Manage ID'; link.href = 'account.html'; link.hidden = false; }
    var logout = byId('home-logout');
    if (logout) logout.hidden = false;
  }

  async function getClient() {
    if (window.HWAuth && window.HWAuth.getClient) {
      try { return await window.HWAuth.getClient(); } catch (error) {}
    }
    if (!window.supabase || !window.supabase.createClient) return null;
    var cfg = window.HW_SUPABASE_CONFIG || {};
    var url = cfg.url || window.HW_SUPABASE_URL;
    var key = cfg.anonKey || cfg.anon_key || window.HW_SUPABASE_ANON_KEY || window.SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    window.__HW_HOME_SB__ = window.__HW_HOME_SB__ || window.supabase.createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
    return window.__HW_HOME_SB__;
  }

  async function refreshStatus() {
    try {
      setLoading();
      var sb = await getClient();
      if (!sb || !sb.auth) { showLoggedOut(); return; }
      var sessionResult = await sb.auth.getSession();
      var session = sessionResult && sessionResult.data ? sessionResult.data.session : null;
      var user = session && session.user ? session.user : null;
      if (!user) { showLoggedOut(); return; }
      var points = 0;
      try {
        var wallet = await sb.rpc('get_my_points');
        if (!wallet.error && wallet.data) points = wallet.data.balance || wallet.data.cool_points || wallet.data.points || 0;
      } catch (error) {}
      showLoggedIn(user, points);
    } catch (error) {
      showLoggedOut();
    }
  }

  function boot() {
    setLoading();
    refreshStatus();
    setTimeout(refreshStatus, 800);
    setTimeout(refreshStatus, 2000);
    setTimeout(refreshStatus, 4500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.addEventListener('storage', refreshStatus);
  document.addEventListener('hyph:points-updated', refreshStatus);
  window.addEventListener('hw:points-change', refreshStatus);
})();
