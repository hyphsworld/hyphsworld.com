(function () {
  'use strict';

  if (document.getElementById('hw-global-my-id')) return;

  var script = document.currentScript;
  var scriptUrl = script && script.src ? script.src : new URL('global-my-id.js', location.href).href;
  var accountUrl = new URL('account.html', scriptUrl).href;
  var authUrl = new URL('auth.html', scriptUrl).href;
  var createUrl = new URL('creator-dashboard.html', scriptUrl).href;
  var createAuthUrl = authUrl + '?next=' + encodeURIComponent('creator-dashboard.html');
  var sessionKey = 'hw_auth_session_v1';

  function rememberedSession() {
    try {
      var session = JSON.parse(localStorage.getItem(sessionKey) || 'null');
      return Boolean(session && (session.userId || session.email));
    } catch (error) {
      return false;
    }
  }

  function setState(link, loggedIn) {
    link.href = loggedIn ? accountUrl : authUrl;
    link.classList.toggle('is-signed-in', loggedIn);
    link.setAttribute('aria-label', loggedIn ? 'Open My HYPHSWORLD ID account' : 'Login or create a HYPHSWORLD ID');
    link.title = loggedIn ? 'Open My ID' : 'Login / Create ID';
    var label = link.querySelector('.hw-global-my-id-label');
    if (label) label.textContent = 'MY ID';
  }

  function setCreateState(link, loggedIn) {
    link.href = loggedIn ? createUrl : createAuthUrl;
    link.setAttribute('aria-label', loggedIn ? 'Create inside your HYPHSWORLD' : 'Login to create inside HYPHSWORLD');
    link.title = loggedIn ? 'CREATE' : 'Login to CREATE';
  }

  function install() {
    if (document.getElementById('hw-global-my-id')) return;

    var style = document.createElement('style');
    style.id = 'hw-global-my-id-style';
    style.textContent = [
      '#hw-global-create{position:fixed;z-index:9998;top:max(12px,env(safe-area-inset-top));right:max(108px,calc(env(safe-area-inset-right) + 96px));display:inline-flex;align-items:center;justify-content:center;min-height:42px;padding:8px 18px;border:1px solid rgba(255,255,255,.72);border-radius:999px;background:linear-gradient(110deg,#45ff36,#34eaff 48%,#ff3fb4);background-size:180% 100%;box-shadow:0 10px 28px rgba(0,0,0,.48),0 0 24px rgba(52,234,255,.42);color:#05060a!important;font:1000 12px/1 Arial,Helvetica,sans-serif;letter-spacing:.16em;text-decoration:none!important;transition:transform .18s ease,box-shadow .18s ease,background-position .28s ease}',
      '#hw-global-create:hover,#hw-global-create:focus-visible{transform:translateY(-2px) scale(1.03);background-position:100% 0;box-shadow:0 13px 34px rgba(0,0,0,.55),0 0 30px rgba(255,63,180,.48);outline:none}',
      '#hw-global-my-id{position:fixed;z-index:9997;top:max(12px,env(safe-area-inset-top));right:max(12px,env(safe-area-inset-right));display:inline-flex;align-items:center;gap:8px;min-height:42px;padding:7px 13px 7px 8px;border:1px solid rgba(255,255,255,.42);border-radius:999px;background:linear-gradient(120deg,rgba(7,8,13,.96),rgba(20,24,32,.96));box-shadow:0 10px 28px rgba(0,0,0,.42),0 0 18px rgba(52,234,255,.18);color:#fff!important;font:900 11px/1 Arial,Helvetica,sans-serif;letter-spacing:.12em;text-decoration:none!important;backdrop-filter:blur(12px);transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease}',
      '#hw-global-my-id:hover,#hw-global-my-id:focus-visible{transform:translateY(-2px);border-color:#34eaff;box-shadow:0 12px 30px rgba(0,0,0,.5),0 0 22px rgba(52,234,255,.38);outline:none}',
      '#hw-global-my-id .hw-global-my-id-mark{position:relative;display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#ff3fb4,#34eaff 54%,#46ff67);color:#05060a;font-size:10px;letter-spacing:0;box-shadow:0 0 15px rgba(52,234,255,.38)}',
      '#hw-global-my-id .hw-global-my-id-mark:after{content:"";position:absolute;right:-1px;bottom:-1px;width:7px;height:7px;border:2px solid #080a0e;border-radius:50%;background:#ffd64a}',
      '#hw-global-my-id.is-signed-in .hw-global-my-id-mark:after{background:#46ff67;box-shadow:0 0 8px #46ff67}',
      '@media(max-width:760px){#hw-global-create{top:auto;right:max(105px,calc(env(safe-area-inset-right) + 93px));bottom:max(76px,calc(env(safe-area-inset-bottom) + 68px));min-height:40px;padding:7px 15px;font-size:10px}#hw-global-my-id{top:auto;right:max(12px,env(safe-area-inset-right));bottom:max(76px,calc(env(safe-area-inset-bottom) + 68px));min-height:40px;padding:6px 11px 6px 7px;font-size:10px}#hw-global-my-id .hw-global-my-id-mark{width:27px;height:27px}}',
      '@media(prefers-reduced-motion:reduce){#hw-global-create,#hw-global-my-id{transition:none}}'
    ].join('');
    document.head.appendChild(style);

    var createLink = document.createElement('a');
    createLink.id = 'hw-global-create';
    createLink.textContent = 'CREATE';
    setCreateState(createLink, rememberedSession());
    document.body.appendChild(createLink);

    var link = document.createElement('a');
    link.id = 'hw-global-my-id';
    link.innerHTML = '<span class="hw-global-my-id-mark" aria-hidden="true">HW</span><span class="hw-global-my-id-label">MY ID</span>';
    setState(link, rememberedSession());
    document.body.appendChild(link);

    if (window.HWAuth && typeof window.HWAuth.getSession === 'function') {
      window.HWAuth.getSession().then(function (session) {
        var loggedIn = Boolean(session && (session.userId || session.email));
        setState(link, loggedIn);
        setCreateState(createLink, loggedIn);
      }).catch(function () {});
    }

    document.addEventListener('hyph:auth-signed-in', function () { setState(link, true); setCreateState(createLink, true); });
    document.addEventListener('hyph:auth-state-changed', function (event) {
      if (event && event.detail && event.detail.event === 'SIGNED_OUT') { setState(link, false); setCreateState(createLink, false); }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})();
