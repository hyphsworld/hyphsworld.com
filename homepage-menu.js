(function () {
  'use strict';

  if (window.__HW_HOME_SAFE_BOOT__) return;
  window.__HW_HOME_SAFE_BOOT__ = true;

  var VIDEO_ID = 'yd4MShi6TvA';
  var WATCH_URL = 'https://youtu.be/yd4MShi6TvA?si=iJFwXE0jyZYXb9Ar';
  var THUMB_URL = 'https://i.ytimg.com/vi/' + VIDEO_ID + '/hqdefault.jpg';
  var TITLE = 'WEST (visual) YOUNG TEZ & HYPH LIFE';
  var SUB = 'prod by CUZ ZAID';
  var DROP = 'PURE DRIP 2 AVAILABLE NOW';

  function id(name) { return document.getElementById(name); }
  function one(sel) { return document.querySelector(sel); }
  function all(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }
  function text(el, value) { if (el) el.textContent = value; }
  function num(value) { var p = parseInt(value, 10); return Number.isFinite(p) && p > 0 ? p : 0; }
  function emailName(email) { return String(email || '').split('@')[0] || 'HYPHSWORLD ID'; }
  function esc(value) { return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); }

  function css() {
    if (id('hwHomeSafeCss')) return;
    var s = document.createElement('style');
    s.id = 'hwHomeSafeCss';
    s.textContent = [
      'body.home-page{pointer-events:auto!important;touch-action:auto!important}',
      '.mobile-menu-panel{display:none}.mobile-menu-panel.is-open{display:grid}',
      'body.home-page #hwGlobalPointsHud{display:none!important}',
      '.hw-login-chip{display:inline-flex;align-items:center;gap:10px;max-width:min(92vw,560px);padding:10px 13px;border-radius:999px;border:1px solid rgba(57,255,122,.34);background:rgba(0,0,0,.62);color:#fff}',
      '.hw-login-avatar{display:grid;place-items:center;width:38px;height:38px;border-radius:999px;background:linear-gradient(135deg,#39ff7a,#1ffcff,#ff4fd8);color:#050505;font-weight:1000}',
      '.hw-login-copy{display:grid;gap:2px;text-align:left}.hw-login-copy strong{font-size:.92rem;line-height:1;color:#fff}.hw-login-copy small{font-size:.72rem;color:#a9ff87;font-weight:800}',
      '.homepage-full-episode-frame iframe{display:none!important}',
      '.hw-west-poster{display:block;position:relative;min-height:260px;background:#050505 center/cover no-repeat;border-radius:22px 22px 0 0;text-decoration:none;overflow:hidden}',
      '.hw-west-poster:before{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.08),rgba(0,0,0,.25))}',
      '.hw-west-play{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:88px;height:62px;border-radius:18px;background:#ff0033;color:#fff;display:grid;place-items:center;font-size:34px;font-weight:1000;box-shadow:0 12px 30px rgba(0,0,0,.45)}',
      '.homepage-full-episode-strip{padding:18px!important;overflow:visible!important}.homepage-full-episode-strip span{display:block;font-size:clamp(18px,4.7vw,30px)!important;line-height:1.14!important;letter-spacing:.02em!important;text-shadow:none!important}.hw-west-sub{display:block;color:#1ffcff;font-size:.84em;letter-spacing:.06em;margin-top:4px}',
      '#duckBox{max-width:108px!important;z-index:5!important}'
    ].join('');
    document.head.appendChild(s);
  }

  function setAccount(signedIn) {
    var label = signedIn ? 'Manage ID' : 'Create ID / Login';
    var href = signedIn ? 'account.html' : 'auth.html';
    [id('auth-link'), id('nav-account-link'), id('mobile-nav-account-link')].forEach(function (a) { if (a) { a.textContent = label; a.href = href; } });
    var logout = id('home-logout');
    if (logout) logout.hidden = !signedIn;
  }

  function guest() {
    var st = id('login-status');
    if (st) st.innerHTML = '<span class="hw-login-avatar">ID</span><span class="hw-login-copy"><strong>Guest Mode</strong><small>Login to sync Cool Points</small></span>';
    if (st) st.className = 'hw-login-chip is-guest';
    setAccount(false);
  }

  function userChip(user, points) {
    var email = user && user.email || '';
    var name = user && user.user_metadata && (user.user_metadata.displayName || user.user_metadata.display_name) || emailName(email);
    var st = id('login-status');
    if (st) st.innerHTML = '<span class="hw-login-avatar">ID</span><span class="hw-login-copy"><strong>' + esc(name) + '</strong><small>' + num(points).toLocaleString() + ' CP' + (email ? ' - ' + esc(email) : '') + '</small></span>';
    if (st) st.className = 'hw-login-chip is-signed-in';
    setAccount(true);
  }

  async function client() {
    if (window.HWAuth && window.HWAuth.getClient) { try { return await window.HWAuth.getClient(); } catch (e) {} }
    if (!window.supabase || !window.supabase.createClient) return null;
    var cfg = window.HW_SUPABASE_CONFIG || {};
    var url = cfg.url || window.HW_SUPABASE_URL;
    var key = cfg.anonKey || window.HW_SUPABASE_ANON_KEY || window.SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    window.__HW_HOME_SAFE_SB__ = window.__HW_HOME_SAFE_SB__ || window.supabase.createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
    return window.__HW_HOME_SAFE_SB__;
  }

  function withTimeout(promise, ms) {
    return Promise.race([promise, new Promise(function (_, reject) { setTimeout(function () { reject(new Error('timeout')); }, ms); })]);
  }

  async function sessionOnce() {
    try {
      var sb = await withTimeout(client(), 1800);
      if (!sb || !sb.auth) return guest();
      var result = await withTimeout(sb.auth.getSession(), 2200);
      var user = result && result.data && result.data.session && result.data.session.user;
      if (!user) return guest();
      var points = 0;
      try { var wallet = await withTimeout(sb.rpc('get_my_points'), 2200); if (!wallet.error && wallet.data) points = wallet.data.balance || wallet.data.cool_points || wallet.data.points || 0; } catch (e) {}
      userChip(user, points);
    } catch (e) { guest(); }
  }

  function west() {
    document.title = 'HYPHSWORLD | WEST Visual';
    all('a[href="#top"]').forEach(function (a) { text(a, 'Watch WEST'); });
    all('.ticker-track span').forEach(function (el) { if (/8 MINUTES|FREESTYLE/i.test(el.textContent || '')) text(el, 'WEST VISUAL NOW PLAYING'); });
    var frame = one('.homepage-full-episode-frame');
    if (frame && !one('.hw-west-poster')) {
      var a = document.createElement('a');
      a.className = 'hw-west-poster';
      a.href = WATCH_URL;
      a.target = '_blank';
      a.rel = 'noopener';
      a.style.backgroundImage = 'url(' + THUMB_URL + ')';
      a.innerHTML = '<span class="hw-west-play">▶</span>';
      frame.insertBefore(a, frame.firstChild);
    }
    var strip = one('.homepage-full-episode-strip span');
    if (strip) strip.innerHTML = TITLE + '<span class="hw-west-sub">' + SUB + '</span><span class="hw-west-sub">' + DROP + '</span>';
    text(one('.spotlight-badge'), 'WEST Visual');
    text(one('#spotlight h4'), TITLE);
  }

  function nav() {
    var y = id('year'); if (y) y.textContent = new Date().getFullYear();
    var t = one('.mobile-menu-toggle'); var p = id('mobile-menu-panel');
    if (t && p && !t.__hwSafeBound) { t.__hwSafeBound = true; t.addEventListener('click', function () { var open = p.classList.toggle('is-open'); t.textContent = open ? 'Menu ▲' : 'Menu ▼'; }); }
    var logout = id('home-logout');
    if (logout && !logout.__hwSafeBound) { logout.__hwSafeBound = true; logout.addEventListener('click', async function () { try { var sb = await client(); if (sb && sb.auth) await sb.auth.signOut(); } catch (e) {} guest(); }); }
  }

  function boot() { css(); guest(); west(); nav(); setTimeout(sessionOnce, 250); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true }); else boot();
  window.addEventListener('pageshow', function () { setTimeout(sessionOnce, 150); });
})();
