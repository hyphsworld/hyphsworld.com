(function () {
  'use strict';

  if (document.getElementById('hw-global-my-id')) return;

  var script = document.currentScript;
  var scriptUrl = script && script.src ? script.src : new URL('global-my-id.js', location.href).href;
  var accountUrl = new URL('account.html', scriptUrl).href;
  var authUrl = new URL('auth.html', scriptUrl).href;
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

  function install() {
    if (document.getElementById('hw-global-my-id')) return;

    var style = document.createElement('style');
    style.id = 'hw-global-my-id-style';
    style.textContent = [
      '#hw-global-my-id{position:fixed;z-index:9997;top:max(12px,env(safe-area-inset-top));right:max(12px,env(safe-area-inset-right));display:inline-flex;align-items:center;gap:8px;min-height:42px;padding:7px 13px 7px 8px;border:1px solid rgba(255,255,255,.42);border-radius:999px;background:linear-gradient(120deg,rgba(7,8,13,.96),rgba(20,24,32,.96));box-shadow:0 10px 28px rgba(0,0,0,.42),0 0 18px rgba(52,234,255,.18);color:#fff!important;font:900 11px/1 Arial,Helvetica,sans-serif;letter-spacing:.12em;text-decoration:none!important;backdrop-filter:blur(12px);transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease}',
      '#hw-global-my-id:hover,#hw-global-my-id:focus-visible{transform:translateY(-2px);border-color:#34eaff;box-shadow:0 12px 30px rgba(0,0,0,.5),0 0 22px rgba(52,234,255,.38);outline:none}',
      '#hw-global-my-id .hw-global-my-id-mark{position:relative;display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#ff3fb4,#34eaff 54%,#46ff67);color:#05060a;font-size:10px;letter-spacing:0;box-shadow:0 0 15px rgba(52,234,255,.38)}',
      '#hw-global-my-id .hw-global-my-id-mark:after{content:"";position:absolute;right:-1px;bottom:-1px;width:7px;height:7px;border:2px solid #080a0e;border-radius:50%;background:#ffd64a}',
      '#hw-global-my-id.is-signed-in .hw-global-my-id-mark:after{background:#46ff67;box-shadow:0 0 8px #46ff67}',
      '@media(max-width:760px){#hw-global-my-id{top:auto;right:max(12px,env(safe-area-inset-right));bottom:max(76px,calc(env(safe-area-inset-bottom) + 68px));min-height:40px;padding:6px 11px 6px 7px;font-size:10px}#hw-global-my-id .hw-global-my-id-mark{width:27px;height:27px}}',
      '@media(prefers-reduced-motion:reduce){#hw-global-my-id{transition:none}}'
    ].join('');
    document.head.appendChild(style);

    var link = document.createElement('a');
    link.id = 'hw-global-my-id';
    link.innerHTML = '<span class="hw-global-my-id-mark" aria-hidden="true">HW</span><span class="hw-global-my-id-label">MY ID</span>';
    setState(link, rememberedSession());
    document.body.appendChild(link);

    if (window.HWAuth && typeof window.HWAuth.getSession === 'function') {
      window.HWAuth.getSession().then(function (session) {
        setState(link, Boolean(session && (session.userId || session.email)));
      }).catch(function () {});
    }

    document.addEventListener('hyph:auth-signed-in', function () { setState(link, true); });
    document.addEventListener('hyph:auth-state-changed', function (event) {
      if (event && event.detail && event.detail.event === 'SIGNED_OUT') setState(link, false);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})();
