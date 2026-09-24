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
    if (menu) menu.hidden = true;
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
  }

  function openCreateMenu(trigger) {
    var menu = document.getElementById('hw-create-menu');
    if (!menu) return;
    menu.hidden = false;
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
    document.head.appendChild(style);

    var createLink = document.createElement('a');
    createLink.id = 'hw-global-create';
    createLink.textContent = 'CREATE';
    setCreateState(createLink, rememberedSession());
    createLink.addEventListener('click', function (event) {
      if (!createLoggedIn) return;
      event.preventDefault();
      openCreateMenu(createLink);
    });
    document.body.appendChild(createLink);

    var menu = document.createElement('div');
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
    menu.addEventListener('click', function (event) { if (event.target === menu) closeCreateMenu(); });
    document.addEventListener('keydown', function (event) { if (event.key === 'Escape') closeCreateMenu(); });

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
