// Shared friends load once, including pages without account controls.
(function () {
  if (document.getElementById('hw-global-social-script')) return;
  var social = document.createElement('script');
  social.id = 'hw-global-social-script';
  social.src = '/global-social.js?v=2';
  social.async = true;
  social.onerror = function () { social.remove(); };
  document.head.appendChild(social);
})();

(function () {
  'use strict';

  // Super Strike owns the complete lower HUD during a live game. Global
  // shortcuts return when the player exits to a menu.
  // The compact menu stays above game controls rather than occupying the lower HUD.

  if (document.getElementById('hw-global-my-id')) return;

  var script = document.currentScript;
  var scriptUrl = script && script.src ? script.src : new URL('global-my-id.js', location.href).href;
  // Resolve the shared skin from this script, including nested game routes.
  if (!document.querySelector('link[href*="button-system.css"]')) {
    var controlsStyle = document.createElement('link');
    controlsStyle.rel = 'stylesheet';
    controlsStyle.href = new URL('button-system.css?v=20261007-1', scriptUrl).href;
    document.head.appendChild(controlsStyle);
  }
  var accountUrl = new URL('account.html', scriptUrl).href;
  var authUrl = new URL('auth.html', scriptUrl).href;
  var createUrl = new URL('creator-dashboard.html', scriptUrl).href;
  var createAuthUrl = authUrl + '?next=' + encodeURIComponent('creator-dashboard.html');
  var sessionKey = 'hw_auth_session_v1';
  var createLoggedIn = false;
  var createKinds = [
    { key: 'music', icon: '♪', label: 'Music', detail: 'Songs, beats, and audio' },
    { key: 'video', icon: '▶', label: 'Video', detail: 'MP4 visuals and highlights' },
    { key: 'artwork', icon: '◆', label: 'Artwork', detail: 'Covers, graphics, and photos' },
    { key: 'merch', icon: '✦', label: 'Merch', detail: 'Products, mockups, and drops' },
    { key: 'world', icon: '◎', label: 'World Update', detail: 'Refresh your Creator World' }
  ];

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
    createLoggedIn = loggedIn;
    link.href = loggedIn ? createUrl : createAuthUrl;
    link.setAttribute('aria-label', loggedIn ? 'Open the HYPHSWORLD CREATE menu' : 'Login to create inside HYPHSWORLD');
    link.setAttribute('aria-expanded', 'false');
    link.title = loggedIn ? 'CREATE' : 'Login to CREATE';
  }

  function closeCreateMenu() {
    var menu = document.getElementById('hw-create-menu');
    var trigger = document.getElementById('hw-global-create');
    if (menu) { menu.hidden = true; if (menu.open) menu.close(); }
    var hubTrigger = document.getElementById('hw-menu-trigger'); if (hubTrigger) hubTrigger.focus();
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
  }

  function openCreateMenu(trigger) {
    var menu = document.getElementById('hw-create-menu');
    if (!menu) return;
    menu.hidden = false; menu.showModal();
    trigger.setAttribute('aria-expanded', 'true');
    var first = menu.querySelector('.hw-create-choice');
    if (first) first.focus();
  }

  function install() {
    if (document.getElementById('hw-global-my-id')) return;

    var style = document.createElement('style');
    style.id = 'hw-global-my-id-style';
    style.textContent = [
      '#hw-global-create{position:fixed;z-index:9998;top:max(12px,env(safe-area-inset-top));right:max(108px,calc(env(safe-area-inset-right) + 96px));display:inline-flex;align-items:center;justify-content:center;min-height:42px;padding:8px 18px;border:1px solid rgba(255,255,255,.72);border-radius:999px;background:linear-gradient(110deg,#45ff36,#34eaff 48%,#ff3fb4);background-size:180% 100%;box-shadow:0 10px 28px rgba(0,0,0,.48),0 0 24px rgba(52,234,255,.42);color:#05060a!important;font:1000 12px/1 Arial,Helvetica,sans-serif;letter-spacing:.16em;text-decoration:none!important;transition:transform .18s ease,box-shadow .18s ease,background-position .28s ease}',
      '#hw-global-create:hover,#hw-global-create:focus-visible{transform:translateY(-2px) scale(1.03);background-position:100% 0;box-shadow:0 13px 34px rgba(0,0,0,.55),0 0 30px rgba(255,63,180,.48);outline:none}',
      '#hw-create-menu[hidden]{display:none!important}#hw-create-menu{position:fixed;z-index:10000;inset:0;display:grid;place-items:center;padding:18px;background:rgba(1,2,5,.82);backdrop-filter:blur(12px)}',
      '.hw-create-shell{width:min(620px,100%);max-height:min(760px,calc(100vh - 36px));overflow:auto;padding:22px;border:1px solid rgba(52,234,255,.52);border-radius:28px;background:radial-gradient(circle at top right,rgba(255,63,180,.2),transparent 38%),linear-gradient(145deg,#0b0d13,#05060a);box-shadow:0 28px 80px rgba(0,0,0,.72),0 0 34px rgba(52,234,255,.22);color:#fff;font-family:Arial,Helvetica,sans-serif}',
      '.hw-create-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;margin-bottom:18px}.hw-create-head p{margin:0 0 5px;color:#46ff67;font:900 11px/1 Arial,sans-serif;letter-spacing:.18em}.hw-create-head h2{margin:0;font:1000 clamp(28px,7vw,50px)/.95 Arial,sans-serif;letter-spacing:-.05em}.hw-create-close{width:40px;height:40px;border:1px solid #59606e;border-radius:50%;background:#11141b;color:#fff;font-size:24px;cursor:pointer}',
      '.hw-create-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}.hw-create-choice{display:grid;grid-template-columns:42px 1fr;align-items:center;gap:12px;padding:15px;border:1px solid #343a47;border-radius:17px;background:rgba(15,18,25,.9);color:#fff!important;text-decoration:none!important;transition:.18s ease}.hw-create-choice:last-child{grid-column:1/-1}.hw-create-choice:hover,.hw-create-choice:focus-visible{transform:translateY(-2px);border-color:#34eaff;box-shadow:0 0 22px rgba(52,234,255,.22);outline:none}.hw-create-icon{display:grid;place-items:center;width:42px;height:42px;border-radius:13px;background:linear-gradient(135deg,#46ff67,#34eaff 52%,#ff3fb4);color:#05060a;font-size:21px;font-weight:1000}.hw-create-choice strong{display:block;font:1000 15px/1.15 Arial,sans-serif;letter-spacing:.05em}.hw-create-choice small{display:block;margin-top:5px;color:#aeb5c2;font:700 11px/1.3 Arial,sans-serif}',
      '#hw-global-my-id{position:fixed;z-index:9997;top:max(12px,env(safe-area-inset-top));right:max(12px,env(safe-area-inset-right));display:inline-flex;align-items:center;gap:8px;min-height:42px;padding:7px 13px 7px 8px;border:1px solid rgba(255,255,255,.42);border-radius:999px;background:linear-gradient(120deg,rgba(7,8,13,.96),rgba(20,24,32,.96));box-shadow:0 10px 28px rgba(0,0,0,.42),0 0 18px rgba(52,234,255,.18);color:#fff!important;font:900 11px/1 Arial,Helvetica,sans-serif;letter-spacing:.12em;text-decoration:none!important;backdrop-filter:blur(12px);transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease}',
      '#hw-global-my-id:hover,#hw-global-my-id:focus-visible{transform:translateY(-2px);border-color:#34eaff;box-shadow:0 12px 30px rgba(0,0,0,.5),0 0 22px rgba(52,234,255,.38);outline:none}',
      '#hw-global-my-id .hw-global-my-id-mark{position:relative;display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#ff3fb4,#34eaff 54%,#46ff67);color:#05060a;font-size:10px;letter-spacing:0;box-shadow:0 0 15px rgba(52,234,255,.38)}',
      '#hw-global-my-id .hw-global-my-id-mark:after{content:"";position:absolute;right:-1px;bottom:-1px;width:7px;height:7px;border:2px solid #080a0e;border-radius:50%;background:#ffd64a}',
      '#hw-global-my-id.is-signed-in .hw-global-my-id-mark:after{background:#46ff67;box-shadow:0 0 8px #46ff67}',
      '@media(max-width:760px){#hw-global-create{top:auto;right:max(105px,calc(env(safe-area-inset-right) + 93px));bottom:max(76px,calc(env(safe-area-inset-bottom) + 68px));min-height:40px;padding:7px 15px;font-size:10px}#hw-global-my-id{top:auto;right:max(12px,env(safe-area-inset-right));bottom:max(76px,calc(env(safe-area-inset-bottom) + 68px));min-height:40px;padding:6px 11px 6px 7px;font-size:10px}#hw-global-my-id .hw-global-my-id-mark{width:27px;height:27px}.hw-create-grid{grid-template-columns:1fr}.hw-create-choice:last-child{grid-column:auto}.hw-create-shell{padding:18px;border-radius:22px}}',
      '@media(prefers-reduced-motion:reduce){#hw-global-create,#hw-global-my-id{transition:none}}'
    ].join('');
    style.textContent += '#hw-create-menu{box-sizing:border-box;width:100vw;height:100dvh;max-width:none;max-height:none;border:0;margin:0}#hwGlobalPointsHud{display:none!important}#hw-menu-trigger{position:fixed;right:max(14px,env(safe-area-inset-right));bottom:max(14px,env(safe-area-inset-bottom));z-index:9997;min-height:48px;display:flex;align-items:center;gap:8px;padding:10px 14px;border:1px solid #61eacb;border-radius:18px;background:#0e1926;color:#fff;font:900 12px Arial,sans-serif;box-shadow:0 5px 18px #0008;cursor:pointer}#hw-menu-trigger>span:first-child{color:#63f2c0}#hw-menu-trigger[data-game]{top:max(12px,env(safe-area-inset-top));bottom:auto}#hw-menu-unread{padding:3px 6px;border-radius:10px;background:#ffe45c;color:#111}#hw-menu-unread[hidden]{display:none}#hw-menu-panel{box-sizing:border-box;width:min(380px,calc(100vw - 24px));max-height:calc(100dvh - 24px);padding:18px;border:1px solid #527086;border-radius:22px;background:#0c1421;color:#fff;font:15px/1.5 Arial,sans-serif;overflow:auto}#hw-menu-panel *{box-sizing:border-box;min-width:0}#hw-menu-panel::backdrop{background:#000b}#hw-menu-panel header{position:static;inset:auto;padding:0;display:flex;align-items:center;justify-content:space-between;gap:12px}#hw-menu-panel h2{margin:4px 0 14px;font-size:22px}#hw-menu-panel small{color:#63f2c0;font-weight:800;letter-spacing:.1em}#hw-menu-panel button,#hw-menu-panel a{min-height:48px}#hw-menu-panel header button{width:48px;border-radius:12px;border:1px solid #51667b;background:#182438;color:#fff;font-size:24px}#hw-menu-panel #hw-menu-friends,#hw-menu-panel #hw-global-create,#hw-menu-panel #hw-global-my-id{position:static!important;display:flex!important;width:100%;margin-top:10px;min-height:52px;padding:12px 16px!important;justify-content:flex-start;top:auto;right:auto;bottom:auto;border:1px solid #445c72;border-radius:14px;background:#182438;box-shadow:none;transform:none;font:800 14px Arial,sans-serif;letter-spacing:.04em;color:#fff!important;text-decoration:none}#hw-menu-panel .hw-menu-wallet{padding:12px;border:1px solid #33495d;border-radius:12px;font-size:12px;color:#bdd4df}#hw-menu-panel .hw-menu-wallet span{color:#63f2c0;font-size:22px;font-weight:900}#hw-menu-panel .hw-menu-wallet a{display:block;color:#6feaff}#hw-menu-trigger:focus-visible,#hw-menu-panel button:focus-visible,#hw-menu-panel a:focus-visible{outline:3px solid #6feaff;outline-offset:3px}';
    document.head.appendChild(style);

    var trigger = document.createElement('button');
    trigger.id = 'hw-menu-trigger'; trigger.type = 'button';
    trigger.setAttribute('aria-label', 'Open HYPHSWORLD menu');
    trigger.setAttribute('aria-haspopup', 'dialog'); trigger.setAttribute('aria-expanded', 'false');
    trigger.innerHTML = '<span aria-hidden="true">HW</span><span>MENU</span><span id="hw-menu-unread" hidden></span>';
    if (location.pathname.startsWith('/games/')) trigger.setAttribute('data-game', '');
    var hub = document.createElement('dialog'); hub.id = 'hw-menu-panel';
    hub.setAttribute('aria-labelledby', 'hw-menu-title');
    hub.innerHTML = '<header><div><small>YOUR HYPHSWORLD</small><h2 id="hw-menu-title">Play. Create. Connect.</h2></div><button type="button" aria-label="Close HYPHSWORLD menu">×</button></header><p class="hw-menu-wallet"><span data-hw-points>—</span> COOL POINTS <a href="/account.html">View My ID</a></p>';
    var friends = document.createElement('button'); friends.type = 'button'; friends.id = 'hw-menu-friends';
    friends.textContent = 'Friends & messages';
    var closeHub = function () { hub.close(); trigger.setAttribute('aria-expanded', 'false'); };
    friends.onclick = function () { closeHub(); document.dispatchEvent(new CustomEvent('hw:open-friends')); };
    hub.appendChild(friends); document.body.appendChild(trigger); document.body.appendChild(hub);
    trigger.onclick = function () { if (window.HWPoints && window.HWPoints.render) window.HWPoints.render(); if (window.HWGlobalSocial && window.HWGlobalSocial.getUnread) document.dispatchEvent(new CustomEvent('hw:social-summary', {detail:{unread:window.HWGlobalSocial.getUnread()}})); hub.showModal(); trigger.setAttribute('aria-expanded', 'true'); };
    hub.querySelector('header button').onclick = closeHub;
    hub.addEventListener('close', function () { trigger.setAttribute('aria-expanded', 'false'); trigger.focus(); });
    hub.addEventListener('click', function (event) { if (event.target === hub) { var box = hub.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) closeHub(); } });
    document.addEventListener('hw:social-summary', function (event) {
      var count = Math.max(0, Number(event.detail && event.detail.unread) || 0), badge = document.getElementById('hw-menu-unread');
      badge.hidden = count === 0; badge.textContent = count > 99 ? '99+' : String(count);
      friends.textContent = 'Friends & messages' + (count ? ' · ' + count + ' unread' : '');
      trigger.setAttribute('aria-label', 'Open HYPHSWORLD menu' + (count ? ', ' + count + ' unread messages or requests' : ''));
    });
    window.HWGlobalMenu = { open: function () { trigger.click(); } };
    var createLink = document.createElement('a');
    createLink.id = 'hw-global-create';
    createLink.textContent = 'CREATE';
    setCreateState(createLink, rememberedSession());
    createLink.addEventListener('click', function (event) {
      if (!createLoggedIn) return;
      event.preventDefault();
      closeHub(); openCreateMenu(createLink);
    });
    hub.appendChild(createLink);

    var menu = document.createElement('dialog');
    menu.id = 'hw-create-menu';
    menu.hidden = true;
    menu.setAttribute('role', 'dialog');
    menu.setAttribute('aria-modal', 'true');
    menu.setAttribute('aria-labelledby', 'hw-create-title');
    var shell = document.createElement('section');
    shell.className = 'hw-create-shell';
    shell.innerHTML = '<header class="hw-create-head"><div><p>ONE PLATFORM • DIFFERENT WORLDS</p><h2 id="hw-create-title">What will you CREATE?</h2></div><button class="hw-create-close" type="button" aria-label="Close CREATE menu">×</button></header>';
    var grid = document.createElement('div');
    grid.className = 'hw-create-grid';
    createKinds.forEach(function (kind) {
      var choice = document.createElement('a');
      choice.className = 'hw-create-choice';
      choice.href = createUrl + '?create=' + encodeURIComponent(kind.key) + '#create-studio';
      choice.innerHTML = '<span class="hw-create-icon" aria-hidden="true">' + kind.icon + '</span><span><strong>' + kind.label + '</strong><small>' + kind.detail + '</small></span>';
      grid.appendChild(choice);
    });
    shell.appendChild(grid); menu.appendChild(shell); document.body.appendChild(menu);
    shell.querySelector('.hw-create-close').addEventListener('click', closeCreateMenu);
    menu.addEventListener('cancel', function (event) { event.preventDefault(); closeCreateMenu(); });
    menu.addEventListener('click', function (event) { if (event.target === menu) closeCreateMenu(); });
    document.addEventListener('keydown', function (event) { if (event.key === 'Escape') closeCreateMenu(); });

    var link = document.createElement('a');
    link.id = 'hw-global-my-id';
    link.innerHTML = '<span class="hw-global-my-id-mark" aria-hidden="true">HW</span><span class="hw-global-my-id-label">MY ID</span>';
    setState(link, rememberedSession());
    hub.appendChild(link);

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

